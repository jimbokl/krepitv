#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const url = argument("--url", "http://127.0.0.1:4173/");
const output = path.resolve(argument("--output", "product-docs/design-qa/page.png"));
const width = Number(argument("--width", "1440"));
const height = Number(argument("--height", "1100"));
const selector = argument("--selector", null);
const modelQuery = argument("--model-query", null);
const phoneTvState = argument("--phone-tv-state", null);
const tvNoSignalState = argument("--tv-no-signal-state", null);
const textZoom = Number(argument("--text-zoom", "100"));
const textSpacing = process.argv.includes("--text-spacing");
const consent = argument("--consent", "denied");
const affiliateReportEnabled = process.argv.includes("--affiliate-report");
const placementAttributionRequired = process.argv.includes("--require-placement-attribution");
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!Number.isInteger(width) || width < 320 || width > 3840) throw new Error("Invalid viewport width");
if (!Number.isInteger(height) || height < 480 || height > 5000) throw new Error("Invalid viewport height");
if (!["denied", "granted", "prompt"].includes(consent)) throw new Error("Invalid consent mode");
if (![100, 200].includes(textZoom)) throw new Error("Invalid text zoom; use 100 or 200");
if (phoneTvState && ![
  "empty",
  "default",
  "disabled",
  "focus",
  "loading",
  "error",
  "success",
  "needs-check",
  "no-direct-path",
  "retry",
].includes(phoneTvState)) {
  throw new Error("Invalid phone-to-TV state");
}
if (tvNoSignalState && ![
  "empty",
  "default",
  "disabled",
  "focus",
  "loading",
  "error",
  "success",
  "unknown-source",
  "needs-service",
  "provider-path",
  "retry",
].includes(tvNoSignalState)) {
  throw new Error("Invalid TV no-signal state");
}
if (phoneTvState && tvNoSignalState) {
  throw new Error("Choose only one interactive QA state");
}
if (placementAttributionRequired && !affiliateReportEnabled) {
  throw new Error("--require-placement-attribution requires --affiliate-report");
}
new URL(url);

const profile = await mkdtemp(path.join(os.tmpdir(), "krepitv-cdp-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

function devtoolsEndpoint() {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error("Chrome DevTools endpoint timed out")), 10_000);
    chrome.stderr.setEncoding("utf8");
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[1]);
    });
    chrome.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before DevTools was ready: ${code}`));
    });
  });
}

let socket;
try {
  const browserEndpoint = await devtoolsEndpoint();
  const browserUrl = new URL(browserEndpoint);
  const target = await fetch(
    `http://${browserUrl.hostname}:${browserUrl.port}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  ).then((response) => {
    if (!response.ok) throw new Error(`Cannot create Chrome target: ${response.status}`);
    return response.json();
  });

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
      return;
    }
    const waiters = events.get(message.method) ?? [];
    events.delete(message.method);
    waiters.forEach((resolve) => resolve(message.params));
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const once = (method) => new Promise((resolve) => {
    events.set(method, [...(events.get(method) ?? []), resolve]);
  });

  await send("Page.enable");
  if (consent !== "prompt") {
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `localStorage.setItem("krepitv:metrika-consent", ${JSON.stringify(consent)});`,
    });
  }
  const wasmQaState = phoneTvState || tvNoSignalState;
  if (["loading", "error", "retry"].includes(wasmQaState)) {
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: wasmQaState === "loading"
        ? `WebAssembly.instantiateStreaming = () => new Promise(() => {}); WebAssembly.instantiate = () => new Promise(() => {});`
        : wasmQaState === "error"
          ? `WebAssembly.instantiateStreaming = () => Promise.reject(new Error("QA WASM failure")); WebAssembly.instantiate = () => Promise.reject(new Error("QA WASM failure"));`
          : `(() => {
              const originalStreaming = WebAssembly.instantiateStreaming.bind(WebAssembly);
              const originalInstantiate = WebAssembly.instantiate.bind(WebAssembly);
              globalThis.__qaBlockWasm = true;
              WebAssembly.instantiateStreaming = (...args) => globalThis.__qaBlockWasm
                ? Promise.reject(new Error("QA first-attempt WASM failure"))
                : originalStreaming(...args);
              WebAssembly.instantiate = (...args) => globalThis.__qaBlockWasm
                ? Promise.reject(new Error("QA first-attempt WASM failure"))
                : originalInstantiate(...args);
            })();`,
    });
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: width,
    screenHeight: height,
  });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;
  await send("Runtime.evaluate", {
    expression: "document.fonts.ready.then(() => new Promise((resolve) => setTimeout(resolve, 700)))",
    awaitPromise: true,
  });
  if (textZoom !== 100 || textSpacing) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const style = document.createElement("style");
        style.dataset.qaTextOverride = "true";
        style.textContent = ${JSON.stringify(`${textZoom !== 100 ? `html { font-size: ${textZoom}% !important; }` : ""}${textSpacing ? " * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" : ""}`)};
        document.head.appendChild(style);
      })()`,
    });
  }
  let phoneTvReport = null;
  if (phoneTvState) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(async () => {
        const state = ${JSON.stringify(phoneTvState)};
        const wizard = document.querySelector("[data-phone-tv-wizard]");
        if (!wizard) return Promise.reject(new Error("Phone-to-TV wizard not found"));
        const choose = (name, value) => {
          const input = wizard.querySelector('input[name="' + name + '"][value="' + value + '"]');
          if (!input) throw new Error("Missing radio " + name + ":" + value);
          input.click();
        };
        const waitFor = (predicate, message, timeout = 5000) => new Promise((resolve, reject) => {
          const startedAt = Date.now();
          const timer = setInterval(() => {
            const value = predicate();
            if (value) {
              clearInterval(timer);
              resolve(value);
            } else if (Date.now() - startedAt > timeout) {
              clearInterval(timer);
              reject(new Error(message));
            }
          }, 25);
        });

        if (state === "focus") {
          wizard.querySelector('input[name="phone"]')?.focus();
        } else if (state === "default") {
          choose("phone", "iphone");
        } else if (["loading", "error", "success", "needs-check", "no-direct-path", "retry"].includes(state)) {
          choose("phone", state === "no-direct-path" ? "android-other" : "iphone");
          await waitFor(
            () => wizard.querySelector('input[name="tv"], input[name="tv-other"]'),
            "TV choices did not render",
          );
          if (["success", "needs-check"].includes(state)) {
            choose("tv-other", "apple-tv");
            await waitFor(
              () => wizard.querySelector('input[name="same-network"]'),
              "Network choices did not render",
            );
            choose("same-network", "yes");
          } else if (state === "no-direct-path") {
            choose("tv-other", "apple-tv");
            await waitFor(
              () => wizard.querySelector('input[name="hdmi"]'),
              "HDMI choices did not render",
            );
            choose("hdmi", "no");
          } else {
            choose("tv", "samsung-smart-tv");
          }
          const submit = await waitFor(
            () => {
              const button = wizard.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "Phone-to-TV submit stayed disabled",
          );
          if (!submit || submit.disabled) throw new Error("Phone-to-TV submit is disabled unexpectedly");
          submit.click();
          if (state === "retry") {
            await waitFor(
              () => wizard.querySelector('[role="alert"]'),
              "Phone-to-TV retry did not reach the first error",
            );
            globalThis.__qaBlockWasm = false;
            submit.click();
          }
        }

        const expected = state === "loading"
          ? () => wizard.innerText.includes("Проверяем совместимость")
          : state === "error"
            ? () => wizard.querySelector('[role="alert"]')
            : ["success", "needs-check", "retry"].includes(state)
              ? () => document.querySelector('[data-phone-tv-result="needs-check"]')
              : state === "no-direct-path"
                ? () => document.querySelector('[data-phone-tv-result="no-direct-path"]')
              : () => true;
        await waitFor(expected, "Phone-to-TV state timed out");
        return {
          state,
          submitDisabled: Boolean(wizard.querySelector('button[type="submit"]')?.disabled),
          resultStatus: document.querySelector("[data-phone-tv-result]")?.getAttribute("data-phone-tv-result") ?? null,
          hasAlert: Boolean(wizard.querySelector('[role="alert"]')),
          focusedName: document.activeElement?.getAttribute("name") ?? null,
          marketLinks: document.querySelectorAll('a[href*="market.yandex.ru"]').length,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("Phone-to-TV interaction failed");
    }
    phoneTvReport = interaction.result.value;
    if (phoneTvReport.marketLinks !== 0) {
      throw new Error("Phone-to-TV route contains Market links");
    }
  }
  let tvNoSignalReport = null;
  if (tvNoSignalState) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(async () => {
        const state = ${JSON.stringify(tvNoSignalState)};
        const wizard = document.querySelector("[data-tv-no-signal-wizard]");
        if (!wizard) return Promise.reject(new Error("TV no-signal wizard not found"));
        const choose = (name, value) => {
          const input = wizard.querySelector('input[name="' + name + '"][value="' + value + '"]');
          if (!input) throw new Error("Missing radio " + name + ":" + value);
          input.click();
        };
        const waitFor = (predicate, message, timeout = 5000) => new Promise((resolve, reject) => {
          const startedAt = Date.now();
          const timer = setInterval(() => {
            const value = predicate();
            if (value) {
              clearInterval(timer);
              resolve(value);
            } else if (Date.now() - startedAt > timeout) {
              clearInterval(timer);
              reject(new Error(message));
            }
          }, 25);
        });

        if (state === "focus") {
          wizard.querySelector('input[name="signal-source"]')?.focus();
        } else if (["default", "disabled"].includes(state)) {
          choose("signal-source", "hdmi");
        } else if (["loading", "error", "success", "unknown-source", "needs-service", "provider-path", "retry"].includes(state)) {
          choose("signal-source", state === "unknown-source" ? "unknown" : state === "provider-path" ? "cable-box" : "hdmi");
          await waitFor(
            () => wizard.querySelector('input[name="tv-menu-visible"]'),
            "TV menu choices did not render",
          );
          choose("tv-menu-visible", state === "needs-service" ? "no" : "yes");
          if (state === "provider-path") {
            choose("source-powered", "yes");
            choose("input-matches", "yes");
            choose("receiver-menu-visible", "yes");
          }
          const submit = await waitFor(
            () => {
              const button = wizard.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "TV no-signal submit stayed disabled",
          );
          submit.click();
          if (state === "retry") {
            await waitFor(
              () => wizard.querySelector('[role="alert"]'),
              "TV no-signal retry did not reach the first error",
            );
            globalThis.__qaBlockWasm = false;
            wizard.querySelector('button[type="button"]')?.click();
          }
        }

        const expected = state === "loading"
          ? () => wizard.innerText.includes("Составляем план")
          : state === "error"
            ? () => wizard.querySelector('[role="alert"]')
            : ["success", "retry"].includes(state)
              ? () => document.querySelector('[data-tv-no-signal-result="success"]')
              : ["unknown-source", "needs-service", "provider-path"].includes(state)
                ? () => document.querySelector('[data-tv-no-signal-result="' + state + '"]')
                : () => true;
        await waitFor(expected, "TV no-signal state timed out");
        return {
          state,
          submitDisabled: Boolean(wizard.querySelector('button[type="submit"]')?.disabled),
          resultStatus: document.querySelector("[data-tv-no-signal-result]")?.getAttribute("data-tv-no-signal-result") ?? null,
          hasAlert: Boolean(wizard.querySelector('[role="alert"]')),
          focusedName: document.activeElement?.getAttribute("name") ?? null,
          marketLinks: document.querySelectorAll('a[href*="market.yandex.ru"]').length,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("TV no-signal interaction failed");
    }
    tvNoSignalReport = interaction.result.value;
    if (tvNoSignalReport.marketLinks !== 0) {
      throw new Error("TV no-signal route contains Market links");
    }
  }
  let modelInteractionReport = null;
  if (modelQuery) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(() => {
        const query = ${JSON.stringify(modelQuery)};
        const root = document.querySelector("[data-brand-mount-matcher]");
        const input = root?.querySelector('input[aria-label="Модель телевизора"]');
        if (!root || !input) return Promise.reject(new Error("Brand matcher input not found"));
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (!setter) return Promise.reject(new Error("Native input setter not found"));
        input.focus();
        setter.call(input, query);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        return new Promise((resolve, reject) => {
          const startedAt = Date.now();
          let submitted = false;
          const timer = setInterval(() => {
            const button = root.querySelector('form button[type="submit"]');
            if (!submitted && button && !button.disabled) {
              submitted = true;
              button.click();
            }

            const live = root.querySelector('[aria-live="polite"]');
            const shortlist = root.querySelector('[data-result-shortlist="true"]');
            const noMatch = live?.innerText.includes("пока нет подходящего варианта");
            const failure = live?.querySelector(".text-danger");
            if (failure) {
              clearInterval(timer);
              reject(new Error("Brand matcher returned an error"));
              return;
            }
            if (submitted && live && (shortlist || noMatch)) {
              clearInterval(timer);
              const report = {
                query,
                selectedTitle: live.querySelector("p.font-display")?.innerText ?? "",
                resultCards: shortlist?.querySelectorAll("article").length ?? 0,
                hasVesaReason: /VESA/i.test(live.innerText),
                hasLoadReason: /нагрузк/i.test(live.innerText),
                incompatibleCollapsed: Boolean(root.querySelector('[data-brand-incompatible="collapsed"]:not([open])')),
                marketLinksInsideMatcher: root.querySelectorAll('a[href*="market.yandex.ru"]').length,
              };
              if (!noMatch && report.resultCards < 1) {
                reject(new Error("Brand matcher returned no result cards"));
              } else if (!report.hasVesaReason || !report.hasLoadReason) {
                reject(new Error("Brand matcher result lacks technical reasons"));
              } else if (report.marketLinksInsideMatcher !== 0) {
                reject(new Error("Brand matcher bypasses internal technical cards"));
              } else {
                resolve(report);
              }
              return;
            }
            if (Date.now() - startedAt > 10_000) {
              clearInterval(timer);
              reject(new Error(submitted ? "Brand matcher result timed out" : "Exact model did not enable submit"));
            }
          }, 50);
        });
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("Brand matcher interaction failed");
    }
    modelInteractionReport = interaction.result.value;
  }
  const effectiveSelector = selector
    || (["success", "needs-check", "no-direct-path", "retry"].includes(phoneTvState)
      ? "[data-phone-tv-result]"
      : phoneTvState === "error"
        ? "[data-phone-tv-wizard] [role=\"alert\"]"
        : phoneTvState
          ? "[data-phone-tv-wizard]"
          : ["success", "unknown-source", "needs-service", "provider-path", "retry"].includes(tvNoSignalState)
            ? "[data-tv-no-signal-result]"
            : tvNoSignalState === "error"
              ? "[data-tv-no-signal-wizard] [role=\"alert\"]"
              : tvNoSignalState
                ? "[data-tv-no-signal-wizard]"
                : null);
  if (effectiveSelector) {
    const selected = await send("Runtime.evaluate", {
      expression: `(() => {
        const element = document.querySelector(${JSON.stringify(effectiveSelector)});
        if (!element) return false;
        const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 24);
        window.scrollTo({ top, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = top;
        document.body.scrollTop = top;
        return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))));
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (selected.result.value !== true) {
      throw new Error(`Screenshot selector not found: ${effectiveSelector}`);
    }
  }
  await send("Runtime.evaluate", {
    expression: effectiveSelector
      ? "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
      : "window.scrollTo(0, 0); new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    awaitPromise: true,
  });
  const dimensions = await send("Runtime.evaluate", {
    expression: "({ innerWidth, innerHeight, scrollX, scrollY, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight })",
    returnByValue: true,
  });
  if (dimensions.result.value.innerWidth !== width || dimensions.result.value.scrollWidth > width) {
    const overflow = await send("Runtime.evaluate", {
      expression: `Array.from(document.querySelectorAll("body *")).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: String(element.className ?? "").slice(0, 120),
          text: String(element.textContent ?? "").trim().replace(/\\s+/g, " ").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      }).filter((item) => item.left < -1 || item.right > innerWidth + 1 || item.scrollWidth > item.clientWidth + 1).slice(0, 12)`,
      returnByValue: true,
    });
    throw new Error(`Viewport overflow: ${JSON.stringify(dimensions.result.value)} offenders=${JSON.stringify(overflow.result.value)}`);
  }
  let affiliateReport = [];
  if (affiliateReportEnabled) {
    const evaluated = await send("Runtime.evaluate", {
      expression: `Array.from(document.querySelectorAll("[data-affiliate-hub]")).map((hub) => ({
        hub: hub.getAttribute("data-affiliate-hub"),
        text: hub.innerText,
        offers: Array.from(hub.querySelectorAll("[data-affiliate-compact]"), (card) => {
          const link = card.querySelector("a[data-affiliate-mode]");
          return {
            title: card.querySelector("h3")?.innerText ?? "",
            href: link?.href ?? "",
            rel: link?.rel ?? "",
            target: link?.target ?? "",
            mode: link?.getAttribute("data-affiliate-mode") ?? "",
            placementId: link?.getAttribute("data-affiliate-placement-id") ?? "",
            rank: Number(link?.getAttribute("data-affiliate-rank") ?? 0),
            erid: link?.getAttribute("data-erid") ?? "",
            notice: card.querySelector("p")?.innerText ?? "",
          };
        }),
      }))`,
      returnByValue: true,
    });
    affiliateReport = evaluated.result.value;
    if (!affiliateReport.length) throw new Error("Affiliate hub was not rendered");

    for (const hub of affiliateReport) {
      if (!hub.offers.length || /₽|\bруб(?:\.|ля|лей)?\b/iu.test(hub.text)) {
        throw new Error(`Invalid affiliate hub content: ${hub.hub}`);
      }
      for (const offer of hub.offers) {
        const href = new URL(offer.href);
        const commonIsValid =
          href.protocol === "https:" &&
          href.hostname === "market.yandex.ru" &&
          href.searchParams.has("clid") &&
          href.searchParams.has("vid") &&
          offer.rel === "sponsored nofollow noopener noreferrer" &&
          offer.target === "_blank";
        const complianceIsValid = offer.mode === "advertising"
          ? Boolean(offer.erid && href.searchParams.get("erid") === offer.erid && offer.notice.includes("Реклама"))
          : offer.mode === "non_ad_storefront" && !offer.erid && !href.searchParams.has("erid");
        const placementIsValid = !placementAttributionRequired || (
          /^[a-z0-9][a-z0-9-]{2,79}$/.test(offer.placementId) &&
          Number.isInteger(offer.rank) &&
          offer.rank >= 1 &&
          offer.rank <= 3
        );
        if (!commonIsValid || !complianceIsValid || !placementIsValid) {
          throw new Error(`Invalid affiliate offer in hub ${hub.hub}: ${offer.title}`);
        }
      }
    }
  }
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(screenshot.data, "base64"));
  const sanitizedAffiliateReport = affiliateReport.map((hub) => ({
    hub: hub.hub,
    offers: hub.offers.map((offer) => {
      const href = new URL(offer.href);
      return {
        title: offer.title,
        host: href.hostname,
        path: href.pathname,
        mode: offer.mode,
        placementId: offer.placementId || null,
        rank: offer.rank || null,
        rel: offer.rel,
        target: offer.target,
        hasClid: href.searchParams.has("clid"),
        hasVid: href.searchParams.has("vid"),
        erid: offer.erid || null,
      };
    }),
  }));
  process.stdout.write(`${output}\n${JSON.stringify(dimensions.result.value)}\n`);
  if (modelInteractionReport) process.stdout.write(`${JSON.stringify(modelInteractionReport)}\n`);
  if (phoneTvReport) process.stdout.write(`${JSON.stringify(phoneTvReport)}\n`);
  if (tvNoSignalReport) process.stdout.write(`${JSON.stringify(tvNoSignalReport)}\n`);
  if (affiliateReportEnabled) process.stdout.write(`${JSON.stringify(sanitizedAffiliateReport)}\n`);
} finally {
  socket?.close();
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill("SIGTERM");
    const stopped = await Promise.race([
      exited.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
    ]);
    if (!stopped && chrome.exitCode === null && chrome.signalCode === null) {
      const forcedExit = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGKILL");
      await forcedExit;
    }
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
