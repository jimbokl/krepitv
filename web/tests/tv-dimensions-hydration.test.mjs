import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const docsRoot = fileURLToPath(new URL("../../docs/", import.meta.url));

test("после client boot таблица, методика и мобильный поиск остаются рабочими", { timeout: 30_000 }, async () => {
  const chromePath = await findChrome();
  const server = await startStaticServer();
  const profile = await mkdtemp(path.join(os.tmpdir(), "krepitv-hydration-"));
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
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 320,
      screenHeight: 1000,
    });
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: 'localStorage.setItem("krepitv:metrika-consent", "denied");',
    });

    const loaded = browser.once("Page.loadEventFired");
    await browser.send("Page.navigate", {
      url: `${server.origin}/razmery-televizora-po-diagonali/`,
    });
    await loaded;
    await browser.evaluate(`new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const calculator = document.querySelector('[data-tv-dimensions-calculator="true"]');
        const table = document.querySelector('[data-tv-dimensions-reference-table="true"]');
        if (calculator && table) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - startedAt > 10000) {
          clearInterval(timer);
          reject(new Error('hydrated reference timeout'));
        }
      }, 50);
    })`);

    const hydrated = await browser.evaluate(`(() => {
      const table = document.querySelector('[data-tv-dimensions-reference-table="true"]');
      const hint = document.querySelector('[data-tv-dimensions-table-scroll-hint="true"]');
      return {
        answerCount: document.querySelectorAll('[data-tv-dimensions-answer="true"]').length,
        tableCount: document.querySelectorAll('[data-tv-dimensions-reference-table="true"]').length,
        rowCount: table?.querySelectorAll('[data-tv-dimensions-row]').length ?? 0,
        methodCount: document.querySelectorAll('[data-tv-dimensions-method="true"] article').length,
        tableVisible: Boolean(table && getComputedStyle(table).display !== 'none'),
        hintVisible: Boolean(hint && getComputedStyle(hint).display !== 'none'),
      };
    })()`);
    assert.deepEqual(hydrated, {
      answerCount: 1,
      tableCount: 1,
      rowCount: 7,
      methodCount: 3,
      tableVisible: true,
      hintVisible: true,
    });

    const mobileSearch = await browser.evaluate(`new Promise((resolve, reject) => {
      const calculator = document.querySelector('[data-tv-dimensions-calculator="true"]');
      calculator.querySelector('input[name="tv-dimensions-mode"][value="niche"]').click();
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const input = calculator.querySelector('input[aria-label="Модель телевизора"]');
        if (!input) {
          if (Date.now() - startedAt > 5000) {
            clearInterval(timer);
            reject(new Error('model input timeout'));
          }
          return;
        }
        clearInterval(timer);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Samsung QE55Q70DAUXRU');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const optionsStartedAt = Date.now();
        const optionsTimer = setInterval(() => {
          const form = input.closest('form');
          const option = form.querySelector('[role="option"]');
          const button = form.querySelector(':scope > button[type="submit"]');
          if (option && button && !button.disabled) {
            clearInterval(optionsTimer);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const optionRect = option.getBoundingClientRect();
              const buttonRect = button.getBoundingClientRect();
              resolve({
                separated: optionRect.bottom <= buttonRect.top,
              });
            }));
          } else if (Date.now() - optionsStartedAt > 5000) {
            clearInterval(optionsTimer);
            reject(new Error('model option timeout'));
          }
        }, 50);
      }, 50);
    })`);
    assert.deepEqual(mobileSearch, { separated: true });

    const homeLoaded = browser.once("Page.loadEventFired");
    await browser.send("Page.navigate", { url: `${server.origin}/` });
    await homeLoaded;
    await browser.evaluate(`new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const input = document.querySelector('input[aria-label="Модель телевизора"]');
        if (input) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - startedAt > 10000) {
          clearInterval(timer);
          reject(new Error('home model search timeout'));
        }
      }, 50);
    })`);

    const keyboardSelection = await browser.evaluate(`new Promise((resolve, reject) => {
      const input = document.querySelector('input[aria-label="Модель телевизора"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'TCL 55P6K');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const option = document.querySelector('[role="option"]');
        if (option) {
          clearInterval(timer);
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          requestAnimationFrame(() => resolve({
            activeDescendant: input.getAttribute('aria-activedescendant'),
            selected: option.getAttribute('aria-selected'),
            optionId: option.id,
          }));
        } else if (Date.now() - startedAt > 5000) {
          clearInterval(timer);
          reject(new Error('keyboard option timeout'));
        }
      }, 50);
    })`);
    assert.equal(keyboardSelection.activeDescendant, keyboardSelection.optionId);
    assert.equal(keyboardSelection.selected, "true");

    const modelLoaded = browser.once("Page.loadEventFired");
    await browser.evaluate(`(() => {
      document.querySelector('input[aria-label="Модель телевизора"]')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      return true;
    })()`);
    await modelLoaded;
    assert.equal(
      await browser.evaluate("location.pathname"),
      "/modeli/tcl-55p6k/",
    );
    await browser.evaluate(`new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (document.querySelector('button[aria-controls="site-primary-navigation"]')) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - startedAt > 10000) {
          clearInterval(timer);
          reject(new Error('mobile navigation hydration timeout'));
        }
      }, 50);
    })`);

    const mobileMenu = await browser.evaluate(`new Promise((resolve) => {
      const button = document.querySelector('button[aria-controls="site-primary-navigation"]');
      button.click();
      requestAnimationFrame(() => {
        const nav = document.getElementById('site-primary-navigation');
        const opened = button.getAttribute('aria-expanded') === 'true'
          && getComputedStyle(nav).display !== 'none';
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        requestAnimationFrame(() => resolve({
          opened,
          closed: button.getAttribute('aria-expanded') === 'false',
          focusReturned: document.activeElement === button,
        }));
      });
    })`);
    assert.deepEqual(mobileMenu, {
      opened: true,
      closed: true,
      focusReturned: true,
    });

  } finally {
    socket?.close();
    await stopChrome(chrome);
    await new Promise((resolve) => server.http.close(resolve));
    await rm(profile, {
      force: true,
      recursive: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
});

async function stopChrome(chrome) {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return;

  let timeout;
  const exited = new Promise((resolve) => chrome.once("exit", resolve));
  chrome.kill("SIGTERM");
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve(false), 5_000);
    }),
  ]);
  clearTimeout(timeout);

  if (!stopped) {
    chrome.kill("SIGKILL");
    await exited;
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Продолжаем до первого доступного браузера.
    }
  }
  throw new Error("Для обязательного hydration-теста не найден Chrome/Chromium");
}

function chromeEndpoint(chrome) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error("Chrome не запустился за 30 секунд")), 30_000);
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
      reject(new Error(`Chrome завершился до проверки: ${code}`));
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
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const once = (method) => new Promise((resolve) => {
    events.set(method, [...(events.get(method) ?? []), resolve]);
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) throw new Error("Выражение browser-теста завершилось ошибкой");
    return response.result?.value;
  };
  return { evaluate, once, send };
}

async function startStaticServer() {
  const http = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const relative = requestPath.endsWith("/") ? `${requestPath}index.html` : requestPath;
      const file = path.resolve(docsRoot, `.${relative}`);
      if (!file.startsWith(path.resolve(docsRoot) + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, { "content-type": contentType(file) });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Не найдено");
    }
  });
  await new Promise((resolve, reject) => {
    http.once("error", reject);
    http.listen(0, "127.0.0.1", resolve);
  });
  const address = http.address();
  return { http, origin: `http://127.0.0.1:${address.port}` };
}

function contentType(file) {
  const extension = path.extname(file);
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })[extension] ?? "application/octet-stream";
}
