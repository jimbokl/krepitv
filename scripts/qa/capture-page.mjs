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
const observedModelState = argument("--observed-model-state", null);
const phoneTvState = argument("--phone-tv-state", null);
const tvNoSignalState = argument("--tv-no-signal-state", null);
const tvTrafficState = argument("--tv-traffic-state", null);
const tvEnergyState = argument("--tv-energy-state", null);
const guidedSelectionState = argument("--guided-selection-state", null);
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
if (observedModelState && ![
  "default",
  "loading",
  "empty",
  "error",
  "success",
  "disabled",
  "focus",
].includes(observedModelState)) {
  throw new Error("Invalid observed model page state");
}
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
if (tvTrafficState && ![
  "empty",
  "default",
  "disabled",
  "focus",
  "loading",
  "error",
  "success",
  "needs-check",
  "service-boundary",
  "external-path",
  "immediate-stop",
  "retry",
].includes(tvTrafficState)) {
  throw new Error("Invalid TV traffic task state");
}
if (tvEnergyState && ![
  "empty",
  "default",
  "disabled",
  "focus",
  "loading",
  "error",
  "success",
  "retry",
].includes(tvEnergyState)) {
  throw new Error("Invalid TV energy state");
}
if (guidedSelectionState && ![
  "empty",
  "default",
  "disabled",
  "focus",
  "loading",
  "error",
  "success",
].includes(guidedSelectionState)) {
  throw new Error("Invalid guided selection state");
}
if ([phoneTvState, tvNoSignalState, tvTrafficState, tvEnergyState, guidedSelectionState].filter(Boolean).length > 1) {
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
  const wasmQaState = phoneTvState || tvNoSignalState || tvTrafficState || tvEnergyState || guidedSelectionState;
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
  let tvTrafficReport = null;
  if (tvTrafficState) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(async () => {
        const state = ${JSON.stringify(tvTrafficState)};
        const wizard = document.querySelector("[data-tv-traffic-task]");
        if (!wizard) return Promise.reject(new Error("TV traffic task wizard not found"));
        const task = wizard.getAttribute("data-tv-traffic-task");
        const scenarios = {
          "laptop-to-tv": { success: ["windows", "hdmi"] },
          "digital-channels": { success: ["antenna", "built-in"] },
          "picture-setup": { success: ["everyday", "mixed"] },
          "sound-but-no-picture": {
            success: ["yes", "tv-speakers", "hdmi", "no"],
            "needs-check": ["unknown", "external-audio", "unknown", "unknown"],
            "service-boundary": ["no", "tv-speakers", "hdmi", "yes"],
          },
          "no-sound": {
            success: ["tv-speakers", "tv-app", "no", "unknown"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "external-path": ["soundbar-receiver", "hdmi", "no", "yes"],
          },
          "remote-not-working": {
            success: ["yes", "original", "yes", "yes"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["no", "original", "yes", "no"],
            "external-path": ["yes", "universal", "yes", "no"],
          },
          "turns-off": {
            success: ["no", "same-time", "repeats", "yes"],
            "needs-check": ["unknown", null, null, null],
            "service-boundary": ["yes", null, null, null],
            "external-path": ["no", "after-hdmi", "repeats", "yes"],
            "immediate-stop": ["yes", null, null, null],
          },
          "no-internet": {
            success: ["yes", "yes", "all-apps", null],
            "needs-check": ["unknown", "unknown", "unknown", null],
            "external-path": ["no", "yes", "all-apps", null],
          },
          "usb-not-seen": {
            success: ["yes", "yes", "file-not-playing", "yes"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["no", "yes", "drive-not-shown", "yes"],
            "external-path": ["no", "no", "drive-not-shown", "unknown"],
          },
          "soundbar-to-tv": {
            success: ["earc", "arc", "yes", "safe"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["earc", "arc", "no", "safe"],
            "external-path": ["bluetooth", "bluetooth", "yes", "safe"],
          },
          "screen-cleaning": {
            success: ["clear", "off-cool", "clean-dry-microfiber", "safe"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["damage", "off-cool", "clean-dry-microfiber", "safe"],
          },
          "smart-tv-box": {
            success: ["hdmi", "hdmi", "yes", "power-and-network"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["hdmi", "hdmi", "yes", "unsafe"],
            "external-path": ["hdmi", "hdmi", "yes", "no-power"],
          },
          "tv-speakers": {
            success: ["optical", "optical", "yes", "safe"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["optical", "optical", "yes", "unsafe"],
            "external-path": ["optical", "passive-wire", "yes", "safe"],
          },
          "tv-headphones": {
            success: ["bluetooth", "bluetooth", "yes", "safe"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["bluetooth", "bluetooth", "yes", "unsafe"],
            "external-path": ["none", "bluetooth", "yes", "safe"],
          },
          "tv-firmware-update": {
            success: ["samsung", "network", "yes", "ready"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["samsung", "network", "yes", "unsafe"],
            "external-path": ["other", "network", "yes", "ready"],
          },
          "tv-app-install": {
            success: ["google-android", "official-store", "ready", "enough-space"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "external-path": ["google-android", "not-found", "ready", "enough-space"],
          },
          "tv-factory-reset": {
            success: ["yaos", "sale-transfer", "ready-to-erase", "normal-menu"],
            "needs-check": ["unknown", "unknown", "unknown", "unknown"],
            "service-boundary": ["yaos", "sale-transfer", "ready-to-erase", "update-running"],
            "external-path": ["other", "sale-transfer", "ready-to-erase", "normal-menu"],
          },
        };
        const taskScenarios = scenarios[task];
        const scenarioKey = ["needs-check", "service-boundary", "external-path", "immediate-stop"].includes(state)
          ? state
          : "success";
        const scenario = taskScenarios?.[scenarioKey];
        if (!taskScenarios) return Promise.reject(new Error("Unknown TV traffic task"));
        if (!scenario) return Promise.reject(new Error("Unsupported state for TV traffic task"));
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
          wizard.querySelector('input[name="' + task + '-primary"]')?.focus();
        } else if (state === "default") {
          choose(task + "-primary", scenario[0]);
        } else if (state === "immediate-stop") {
          choose(task + "-primary", scenario[0]);
          const stopBlock = await waitFor(
            () => wizard.querySelector('[data-wizard-secondary-skipped="danger"]'),
            "Immediate-stop block did not render",
          );
          if (!stopBlock.classList.contains("border-danger") || !stopBlock.classList.contains("text-danger")) {
            throw new Error("Immediate-stop block is missing the danger treatment");
          }
          if (wizard.querySelector('input[name="' + task + '-secondary"]')) {
            throw new Error("Immediate-stop path rendered an irrelevant secondary question");
          }
          await waitFor(
            () => {
              const button = wizard.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "Immediate-stop submit stayed disabled",
          );
        } else if (["loading", "error", "success", "needs-check", "service-boundary", "external-path", "retry"].includes(state)) {
          choose(task + "-primary", scenario[0]);
          const secondaryRequired = scenario[1] !== null;
          if (secondaryRequired) {
            await waitFor(
              () => wizard.querySelector('input[name="' + task + '-secondary"]'),
              "TV traffic secondary choices did not render",
            );
            choose(task + "-secondary", scenario[1]);
          } else {
            await waitFor(
              () => wizard.querySelector("[data-wizard-secondary-skipped]"),
              "Immediate-stop path did not skip the secondary question",
            );
            if (wizard.querySelector('input[name="' + task + '-secondary"]')) {
              throw new Error("Danger path rendered an irrelevant secondary question");
            }
          }
          if (scenario[2]) choose(task + "-tertiary", scenario[2]);
          if (scenario[3]) {
            await waitFor(
              () => wizard.querySelector('input[name="' + task + '-detail"]'),
              "TV traffic detail choices did not render",
            );
            choose(task + "-detail", scenario[3]);
          }
          const submit = await waitFor(
            () => {
              const button = wizard.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "TV traffic submit stayed disabled",
          );
          submit.click();
          if (state === "retry") {
            await waitFor(
              () => wizard.querySelector('[role="alert"]'),
              "TV traffic retry did not reach the first error",
            );
            globalThis.__qaBlockWasm = false;
            wizard.querySelector('button[type="button"]')?.click();
          }
        }

        const expected = state === "loading"
          ? () => wizard.querySelector('button[type="submit"]:disabled')
          : state === "error"
            ? () => wizard.querySelector('[role="alert"]')
            : ["success", "retry"].includes(state)
              ? () => document.querySelector('[data-tv-traffic-result]')
              : ["needs-check", "service-boundary", "external-path"].includes(state)
                ? () => document.querySelector('[data-tv-traffic-result="' + state + '"]')
              : () => true;
        await waitFor(expected, "TV traffic task state timed out");
        return {
          state,
          task,
          submitDisabled: Boolean(wizard.querySelector('button[type="submit"]')?.disabled),
          resultStatus: document.querySelector("[data-tv-traffic-result]")?.getAttribute("data-tv-traffic-result") ?? null,
          hasAlert: Boolean(wizard.querySelector('[role="alert"]')),
          focusedName: document.activeElement?.getAttribute("name") ?? null,
          ariaBusy: wizard.querySelector("form")?.getAttribute("aria-busy") ?? null,
          disabledFieldsets: wizard.querySelectorAll("fieldset:disabled").length,
          secondaryVisible: Boolean(wizard.querySelector('input[name="' + task + '-secondary"]')),
          immediateStopPath: wizard.querySelector("[data-wizard-secondary-skipped]")?.getAttribute("data-wizard-secondary-skipped") ?? null,
          stopBlockVisible: Boolean(wizard.querySelector('[data-wizard-secondary-skipped="danger"]')),
          primaryStepId: document.querySelector("[data-tv-traffic-primary-step]")?.getAttribute("data-tv-traffic-primary-step") ?? null,
          hasCollapsedRemainder: Boolean(document.querySelector("[data-tv-traffic-remaining]")),
          marketLinks: document.querySelectorAll('a[href*="market.yandex.ru"]').length,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("TV traffic task interaction failed");
    }
    tvTrafficReport = interaction.result.value;
    if (tvTrafficReport.marketLinks !== 0) {
      throw new Error("TV traffic task route contains Market links");
    }
  }
  let tvEnergyReport = null;
  if (tvEnergyState) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(async () => {
        const state = ${JSON.stringify(tvEnergyState)};
        const calculator = document.querySelector("[data-tv-energy-calculator]");
        if (!calculator) return Promise.reject(new Error("TV energy calculator not found"));
        const setValue = (name, value) => {
          const input = calculator.querySelector('input[name="' + name + '"]');
          if (!input) throw new Error("Missing energy input " + name);
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          if (!setter) throw new Error("Native input setter not found");
          setter.call(input, String(value));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
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
          calculator.querySelector('input[name="activePowerW"]')?.focus();
        } else if (state === "disabled") {
          setValue("activePowerW", 100);
          await waitFor(
            () => calculator.querySelector('button[type="submit"]:disabled'),
            "Partial energy form did not stay disabled",
          );
        } else if (["default", "loading", "error", "success", "retry"].includes(state)) {
          setValue("activePowerW", 100);
          setValue("hoursPerDay", 4);
          setValue("standbyPowerW", 1);
          setValue("tariffRubPerKwh", 6);
          const submit = await waitFor(
            () => {
              const button = calculator.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "TV energy submit stayed disabled",
          );
          if (state !== "default") submit.click();
          if (state === "retry") {
            await waitFor(
              () => calculator.querySelector('[role="alert"]'),
              "TV energy retry did not reach the first error",
            );
            globalThis.__qaBlockWasm = false;
            calculator.querySelector('button[type="button"]')?.click();
          }
        }

        const expected = state === "loading"
          ? () => calculator.querySelector('form[aria-busy="true"] fieldset:disabled')
          : state === "error"
            ? () => calculator.querySelector('[role="alert"]')
            : ["success", "retry"].includes(state)
              ? () => document.querySelector('[data-tv-energy-result="success"]')
              : () => true;
        await waitFor(expected, "TV energy state timed out");
        return {
          state,
          submitDisabled: Boolean(calculator.querySelector('button[type="submit"]')?.disabled),
          resultStatus: document.querySelector("[data-tv-energy-result]")?.getAttribute("data-tv-energy-result") ?? null,
          hasAlert: Boolean(calculator.querySelector('[role="alert"]')),
          focusedName: document.activeElement?.getAttribute("name") ?? null,
          ariaBusy: calculator.querySelector("form")?.getAttribute("aria-busy") ?? null,
          disabledFieldsets: calculator.querySelectorAll("fieldset:disabled").length,
          marketLinks: document.querySelectorAll('a[href*="market.yandex.ru"]').length,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("TV energy interaction failed");
    }
    tvEnergyReport = interaction.result.value;
    if (tvEnergyReport.marketLinks !== 0) {
      throw new Error("TV energy route contains Market links");
    }
  }
  let guidedSelectionReport = null;
  if (guidedSelectionState) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(async () => {
        const state = ${JSON.stringify(guidedSelectionState)};
        const waitFor = (predicate, message, timeout = 10000) => new Promise((resolve, reject) => {
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
        const page = await waitFor(
          () => document.querySelector('[data-guided-selection-page="true"]'),
          "Guided selection page did not hydrate",
        );
        const brandSelect = await waitFor(
          () => page.querySelector("#guided-tv-brand"),
          "Guided brand select not found",
        );
        const brandForm = brandSelect.closest("form");
        const brandSubmit = brandForm?.querySelector('button[type="submit"]');
        const brandOptionCount = brandSelect.querySelectorAll('option:not([value=""])').length;
        let initialBrandSubmitDisabled = Boolean(brandSubmit?.disabled);

        if (state !== "default") {
          const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
          if (!selectSetter) throw new Error("Native select setter not found");
          selectSetter.call(brandSelect, "TCL");
          brandSelect.dispatchEvent(new Event("change", { bubbles: true }));
          const enabledBrandSubmit = await waitFor(
            () => {
              const button = brandForm?.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "Choosing TCL did not enable the brand step",
          );
          enabledBrandSubmit.click();
          await waitFor(
            () => page.getAttribute("data-guided-selection-step") === "2",
            "Brand choice did not open the model step",
          );
        }

        const modelSelect = page.querySelector("#guided-tv-model");
        if (state === "focus") modelSelect?.focus();

        if (["loading", "error", "success"].includes(state)) {
          const select = await waitFor(
            () => page.querySelector("#guided-tv-model"),
            "Guided model select not found",
          );
          const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
          if (!selectSetter) throw new Error("Native select setter not found");
          selectSetter.call(select, "tcl-65c7k");
          select.dispatchEvent(new Event("change", { bubbles: true }));
          const modelSubmit = await waitFor(
            () => {
              const button = select.closest("form")?.querySelector('button[type="submit"]');
              return button && !button.disabled ? button : null;
            },
            "Exact TCL model did not enable the model step",
          );
          modelSubmit.click();
          await waitFor(
            () => page.getAttribute("data-guided-selection-step") === "3",
            "Model choice did not open the wall step",
          );
          const wall = await waitFor(
            () => page.querySelector('input[value="solid"]'),
            "Solid wall choice not found",
          );
          wall.click();
          const mechanismStep = await waitFor(
            () => Array.from(page.querySelectorAll('button[type="button"]')).find(
              (button) => button.textContent.includes("Выбрать механизм") && !button.disabled,
            ),
            "Wall choice did not enable the mechanism step",
          );
          mechanismStep.click();
          await waitFor(
            () => page.getAttribute("data-guided-selection-step") === "4",
            "Wall choice did not open the mechanism step",
          );
          const fixed = await waitFor(
            () => page.querySelector('input[value="fixed"]'),
            "Fixed mount choice not found",
          );
          fixed.click();
        }

        const expected = state === "loading"
          ? () => page.querySelector('[data-guided-compatibility-state="loading"]')
          : state === "error"
            ? () => page.querySelector('[data-guided-compatibility-state="error"]')
            : state === "success"
              ? () => page.querySelector('[data-guided-compatibility-state="success"]')
              : ["empty", "disabled", "focus"].includes(state)
                ? () => page.getAttribute("data-guided-selection-step") === "2"
                : () => true;
        await waitFor(expected, "Guided selection state timed out");

        const finalModelSelect = page.querySelector("#guided-tv-model");
        return {
          state,
          step: page.getAttribute("data-guided-selection-step"),
          brandOptionCount,
          initialBrandSubmitDisabled,
          focusedModel: document.activeElement === finalModelSelect,
          modelOptionCount: finalModelSelect?.querySelectorAll('option:not([value=""])').length ?? 0,
          modelSubmitDisabled: finalModelSelect
            ? Boolean(finalModelSelect.closest("form")?.querySelector('button[type="submit"]')?.disabled)
            : null,
          resultStatus: page.querySelector("[data-guided-compatibility-state]")?.getAttribute("data-guided-compatibility-state") ?? null,
          resultCards: page.querySelectorAll('[data-result-tier="featured_result"]').length,
          hasRetry: Array.from(page.querySelectorAll('button[type="button"]')).some(
            (button) => button.textContent.includes("Повторить проверку"),
          ),
          marketLinks: page.querySelectorAll('a[href*="market.yandex.ru"]').length,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("Guided selection interaction failed");
    }
    guidedSelectionReport = interaction.result.value;
    if (guidedSelectionReport.brandOptionCount < 1) {
      throw new Error("Guided selection has no brand options");
    }
    if (!guidedSelectionReport.initialBrandSubmitDisabled) {
      throw new Error("Guided selection must start with a disabled brand submit");
    }
    if (guidedSelectionState === "focus" && !guidedSelectionReport.focusedModel) {
      throw new Error("Guided selection focus state is not visible on the model select");
    }
    if (["empty", "disabled"].includes(guidedSelectionState) && (
      guidedSelectionReport.step !== "2"
      || guidedSelectionReport.modelOptionCount < 1
      || !guidedSelectionReport.modelSubmitDisabled
    )) {
      throw new Error("Guided selection unselected model state is invalid");
    }
    if (["loading", "error", "success"].includes(guidedSelectionState)
      && guidedSelectionReport.resultStatus !== guidedSelectionState) {
      throw new Error(`Guided selection did not reach ${guidedSelectionState}`);
    }
    if (guidedSelectionState === "success" && guidedSelectionReport.resultCards < 1) {
      throw new Error("Guided selection success has no featured result cards");
    }
    if (guidedSelectionState === "error" && !guidedSelectionReport.hasRetry) {
      throw new Error("Guided selection error has no retry action");
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
  let observedModelReport = null;
  if (observedModelState) {
    const interaction = await send("Runtime.evaluate", {
      expression: `(() => {
        const state = ${JSON.stringify(observedModelState)};
        const page = document.querySelector('[data-market-model-page="true"]');
        if (!page) return Promise.reject(new Error("Observed model page not found"));
        const input = page.querySelector('input[aria-label="Модель телевизора"]');
        if (["empty", "disabled", "focus", "success"].includes(state) && !input) {
          return Promise.reject(new Error("Observed model search not hydrated"));
        }
        if (["empty", "disabled"].includes(state)) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          if (!setter) return Promise.reject(new Error("Native input setter not found"));
          setter.call(input, "");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (state === "focus") input.focus();
        return new Promise((resolve) => setTimeout(() => {
          const button = page.querySelector('form button[type="submit"]');
          resolve({
            state,
            hydratedSearch: Boolean(input),
            buttonDisabled: button?.disabled ?? null,
            focused: document.activeElement === input,
            marketSourceLinks: page.querySelectorAll('a[data-market-source="identity"]').length,
            affiliateLinks: page.querySelectorAll('[data-affiliate-offer-id]').length,
          });
        }, 150));
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (interaction.exceptionDetails || !interaction.result?.value) {
      throw new Error("Observed model page interaction failed");
    }
    observedModelReport = interaction.result.value;
    if (observedModelReport.affiliateLinks !== 0 || observedModelReport.marketSourceLinks !== 1) {
      throw new Error("Observed model page has an invalid Market link boundary");
    }
    if (["empty", "disabled"].includes(observedModelState) && !observedModelReport.buttonDisabled) {
      throw new Error("Observed model empty state must keep submit disabled");
    }
    if (observedModelState === "focus" && !observedModelReport.focused) {
      throw new Error("Observed model focus state is not visible on the search input");
    }
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
                : ["success", "needs-check", "service-boundary", "external-path", "retry"].includes(tvTrafficState)
                  ? "[data-tv-traffic-result]"
                  : tvTrafficState === "immediate-stop"
                    ? '[data-wizard-secondary-skipped="danger"]'
                  : tvTrafficState === "error"
                    ? "[data-tv-traffic-task] [role=\"alert\"]"
                    : tvTrafficState
                      ? "[data-tv-traffic-task]"
                      : ["success", "retry"].includes(tvEnergyState)
                        ? '[data-tv-energy-result="success"]'
                        : tvEnergyState === "error"
                          ? '[data-tv-energy-calculator] [role="alert"]'
                          : tvEnergyState
                            ? "[data-tv-energy-calculator]"
                            : guidedSelectionState === "success"
                              ? '[data-guided-compatibility-state="success"]'
                              : guidedSelectionState === "error"
                                ? '[data-guided-compatibility-state="error"]'
                                : guidedSelectionState === "loading"
                                  ? '[data-guided-compatibility-state="loading"]'
                                  : guidedSelectionState
                                    ? '[data-guided-selection-page="true"]'
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
  const modelFactsLayout = await send("Runtime.evaluate", {
    expression: `(() => {
      const facts = document.querySelector('[data-model-facts="detailed"]');
      const illustration = document.querySelector('[data-guided-model-illustration="true"]');
      if (!facts || !illustration) return null;
      const illustrationRect = illustration.getBoundingClientRect();
      const offenders = Array.from(facts.querySelectorAll("dt,dd"), (element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: element.textContent.trim().replace(/\\s+/g, " ").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
        };
      }).filter((rect) => (
        rect.bottom > illustrationRect.top + 1
        && rect.top < illustrationRect.bottom - 1
        && rect.right > illustrationRect.left + 1
        && rect.left < illustrationRect.right - 1
      ));
      return {
        illustrationLeft: Math.round(illustrationRect.left),
        overlaps: offenders.length > 0,
        offenders,
      };
    })()`,
    returnByValue: true,
  });
  if (modelFactsLayout.result.value?.overlaps) {
    throw new Error(`Model facts overlap the guided illustration: ${JSON.stringify(modelFactsLayout.result.value)}`);
  }
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
  if (observedModelReport) process.stdout.write(`${JSON.stringify(observedModelReport)}\n`);
  if (phoneTvReport) process.stdout.write(`${JSON.stringify(phoneTvReport)}\n`);
  if (tvNoSignalReport) process.stdout.write(`${JSON.stringify(tvNoSignalReport)}\n`);
  if (tvTrafficReport) process.stdout.write(`${JSON.stringify(tvTrafficReport)}\n`);
  if (tvEnergyReport) process.stdout.write(`${JSON.stringify(tvEnergyReport)}\n`);
  if (guidedSelectionReport) process.stdout.write(`${JSON.stringify(guidedSelectionReport)}\n`);
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
