#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROUTES = [
  "/",
  "/modeli/tcl-55c6k/",
  "/podbor/?model=tcl-55c6k",
];
const DEFAULT_BUDGETS = Object.freeze({
  cls: 0.1,
  lcpMs: 2500,
  tbtMs: 200,
});

export function evaluateLayoutRun(run, budgets = DEFAULT_BUDGETS) {
  const failures = [];
  if (run.rootEmptyEvents > 0) failures.push("корневой SSR временно исчез");
  if (run.fullRootReplacements > 0) {
    failures.push("корневой SSR был полностью заменён после первой отрисовки");
  }
  if (!Number.isFinite(run.cls) || run.cls > budgets.cls) {
    failures.push(`CLS выше ${budgets.cls}`);
  }
  if (!Number.isFinite(run.lcpMs) || run.lcpMs <= 0 || run.lcpMs > budgets.lcpMs) {
    failures.push(`LCP выше ${budgets.lcpMs} мс или не измерен`);
  }
  if (!Number.isFinite(run.tbtMs) || run.tbtMs > budgets.tbtMs) {
    failures.push(`TBT выше ${budgets.tbtMs} мс`);
  }
  return { passed: failures.length === 0, failures };
}

export function summarizeRouteRuns(route, runs, budgets = DEFAULT_BUDGETS) {
  if (!Array.isArray(runs) || runs.length === 0) {
    throw new Error("Для маршрута нужен хотя бы один завершённый запуск.");
  }
  const evaluated = runs.map((run) => ({ ...run, gate: evaluateLayoutRun(run, budgets) }));
  const metrics = ["cls", "fcpMs", "lcpMs", "tbtMs"];
  const median = Object.fromEntries(metrics.map((metric) => [
    metric,
    medianOf(runs.map((run) => run[metric])),
  ]));
  const failedRuns = evaluated.filter((run) => !run.gate.passed).length;
  return {
    route,
    passed: failedRuns === 0,
    failedRuns,
    median,
    runs: evaluated,
  };
}

function medianOf(values) {
  const sorted = values.map(Number).sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function main() {
  const baseUrl = new URL(argument("--url", "http://127.0.0.1:4173/"));
  const runCount = Number(argument("--runs", "3"));
  const routeArgument = argument("--routes", "");
  const reportOnly = process.argv.includes("--report-only");
  if (!Number.isInteger(runCount) || runCount < 1 || runCount > 10) {
    throw new Error("--runs должен быть целым числом от 1 до 10.");
  }
  const routes = routeArgument
    ? routeArgument.split(",").map((value) => normalizeRoute(value))
    : baseUrl.pathname !== "/" || baseUrl.search
      ? [`${baseUrl.pathname}${baseUrl.search}`]
      : DEFAULT_ROUTES;
  const chromePath = process.env.CHROME_PATH
    ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profile = await mkdtemp(path.join(os.tmpdir(), "krepitv-layout-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let socket;
  try {
    const browserEndpoint = new URL(await chromeEndpoint(chrome));
    const target = await fetch(
      `http://${browserEndpoint.hostname}:${browserEndpoint.port}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT" },
    ).then(async (response) => {
      if (!response.ok) throw new Error(`Не удалось создать вкладку Chrome: ${response.status}`);
      return response.json();
    });
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    const browser = cdpClient(socket);
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    await browser.send("Network.enable");
    await browser.send("Network.setCacheDisabled", { cacheDisabled: true });
    await browser.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width: 412,
      height: 823,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 412,
      screenHeight: 823,
    });
    await browser.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200_000,
      uploadThroughput: 93_750,
      connectionType: "cellular4g",
    });
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: performanceObserverSource(),
    });
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: 'localStorage.setItem("krepitv:metrika-consent", "denied");',
    });

    const summaries = [];
    for (const route of routes) {
      const runs = [];
      for (let index = 0; index < runCount; index += 1) {
        await browser.send("Network.clearBrowserCache");
        const loaded = browser.once("Page.loadEventFired");
        await browser.send("Page.navigate", {
          url: new URL(route, baseUrl.origin).toString(),
        });
        await loaded;
        const result = await browser.evaluate(`(async () => {
          await document.fonts.ready;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return globalThis.__krepitvLayout?.snapshot();
        })()`);
        if (!result) throw new Error(`Не удалось измерить ${route}.`);
        runs.push(result);
      }
      summaries.push(summarizeRouteRuns(route, runs));
    }

    const report = {
      profile: "mobile-412x823-cpu4-slow4g",
      runsPerRoute: runCount,
      passed: summaries.every((summary) => summary.passed),
      routes: summaries,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed && !reportOnly) process.exitCode = 1;
  } finally {
    socket?.close();
    await stopChildAndRemoveProfile({ child: chrome, profile });
  }
}

export async function stopChildAndRemoveProfile({
  child,
  profile,
  remove = rm,
  timeoutMs = 5_000,
}) {
  if (child.exitCode === null && child.signalCode === null) {
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(forceTimer);
        clearTimeout(giveUpTimer);
        child.off?.("exit", finish);
        resolve();
      };
      const forceTimer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
      const giveUpTimer = setTimeout(finish, timeoutMs * 2);
      child.once("exit", finish);
      child.kill("SIGTERM");
    });
  }
  await remove(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

function normalizeRoute(value) {
  const route = String(value ?? "").trim();
  if (!route.startsWith("/") || route.startsWith("//")) {
    throw new Error("Каждый --routes маршрут должен начинаться с одного /.");
  }
  return route;
}

function performanceObserverSource() {
  return `(() => {
    const state = {
      cls: 0,
      lcpMs: 0,
      tbtMs: 0,
      rootEmptyEvents: 0,
      fullRootReplacements: 0,
      initialMainTop: null,
      finalMainTop: null,
      initialRootHeight: null,
      finalRootHeight: null,
    };
    const observe = (type, callback) => {
      try {
        new PerformanceObserver((list) => list.getEntries().forEach(callback))
          .observe({ type, buffered: true });
      } catch {}
    };
    observe("layout-shift", (entry) => {
      if (!entry.hadRecentInput) state.cls += entry.value;
    });
    observe("largest-contentful-paint", (entry) => {
      state.lcpMs = Math.max(state.lcpMs, entry.startTime);
    });
    observe("longtask", (entry) => {
      state.tbtMs += Math.max(0, entry.duration - 50);
    });
    addEventListener("DOMContentLoaded", () => {
      const root = document.getElementById("root");
      if (!root) return;
      const initialFirstChild = root.firstElementChild;
      let wasEmpty = false;
      const sample = () => {
        const empty = root.childElementCount === 0;
        if (empty && !wasEmpty) state.rootEmptyEvents += 1;
        wasEmpty = empty;
        if (initialFirstChild && !initialFirstChild.isConnected) {
          state.fullRootReplacements = 1;
        }
        const main = root.querySelector("main");
        state.finalMainTop = main?.getBoundingClientRect().top ?? null;
        state.finalRootHeight = root.getBoundingClientRect().height;
      };
      const main = root.querySelector("main");
      state.initialMainTop = main?.getBoundingClientRect().top ?? null;
      state.initialRootHeight = root.getBoundingClientRect().height;
      new MutationObserver(sample).observe(root, { childList: true, subtree: true });
      sample();
    }, { once: true });
    globalThis.__krepitvLayout = {
      snapshot() {
        const paints = performance.getEntriesByType("paint");
        const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
        return {
          cls: Number(state.cls.toFixed(4)),
          fcpMs: Math.round(fcp?.startTime ?? 0),
          lcpMs: Math.round(state.lcpMs),
          tbtMs: Math.round(state.tbtMs),
          rootEmptyEvents: state.rootEmptyEvents,
          fullRootReplacements: state.fullRootReplacements,
          initialMainTop: state.initialMainTop,
          finalMainTop: state.finalMainTop,
          initialRootHeight: state.initialRootHeight,
          finalRootHeight: state.finalRootHeight,
        };
      },
    };
  })();`;
}

function chromeEndpoint(chrome) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error("Chrome DevTools не запустился.")), 10_000);
    chrome.stderr.setEncoding("utf8");
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/u);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[1]);
    });
    chrome.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome завершился до запуска DevTools: ${code}`));
    });
  });
}

function cdpClient(socket) {
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
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        id += 1;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method) {
      return new Promise((resolve) => {
        events.set(method, [...(events.get(method) ?? []), resolve]);
      });
    },
    async evaluate(expression) {
      const response = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (response.exceptionDetails) throw new Error("Ошибка измерения в Chrome.");
      return response.result.value;
    },
  };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Ошибка измерения."}\n`);
    process.exitCode = 1;
  });
}
