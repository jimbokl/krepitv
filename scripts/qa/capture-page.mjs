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
const consent = argument("--consent", "denied");
const affiliateReportEnabled = process.argv.includes("--affiliate-report");
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!Number.isInteger(width) || width < 320 || width > 3840) throw new Error("Invalid viewport width");
if (!Number.isInteger(height) || height < 480 || height > 5000) throw new Error("Invalid viewport height");
if (!["denied", "granted", "prompt"].includes(consent)) throw new Error("Invalid consent mode");
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
  if (selector) {
    const selected = await send("Runtime.evaluate", {
      expression: `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
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
      throw new Error(`Screenshot selector not found: ${selector}`);
    }
  }
  await send("Runtime.evaluate", {
    expression: selector
      ? "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
      : "window.scrollTo(0, 0); new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    awaitPromise: true,
  });
  const dimensions = await send("Runtime.evaluate", {
    expression: "({ innerWidth, innerHeight, scrollX, scrollY, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight })",
    returnByValue: true,
  });
  if (dimensions.result.value.innerWidth !== width || dimensions.result.value.scrollWidth > width) {
    throw new Error(`Viewport overflow: ${JSON.stringify(dimensions.result.value)}`);
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
        if (!commonIsValid || !complianceIsValid) {
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
        rel: offer.rel,
        target: offer.target,
        hasClid: href.searchParams.has("clid"),
        hasVid: href.searchParams.has("vid"),
        erid: offer.erid || null,
      };
    }),
  }));
  process.stdout.write(`${output}\n${JSON.stringify(dimensions.result.value)}\n`);
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
