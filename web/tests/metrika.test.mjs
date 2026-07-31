import assert from "node:assert/strict";
import test from "node:test";
import {
  AFFILIATE_CLICK_EVENT,
  AFFILIATE_CLICK_GOAL,
  installMetrika,
} from "../src/lib/metrika.mjs";

function createBrowserDouble() {
  const listeners = new Map();
  const scripts = [];
  const windowObject = {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };
  const documentObject = {
    body: { appendChild(node) { scripts.push(node); } },
    createElement(tagName) {
      return { tagName };
    },
    getElementById(id) {
      return scripts.find((script) => script.id === id) ?? null;
    },
    head: { appendChild(node) { scripts.push(node); } },
  };
  return { documentObject, listeners, scripts, windowObject };
}

test("без идентификатора Метрика не загружается и не подписывается на клики", () => {
  const browser = createBrowserDouble();
  const metrika = installMetrika({
    counterId: null,
    documentObject: browser.documentObject,
    windowObject: browser.windowObject,
  });

  assert.equal(metrika.enabled, false);
  assert.equal(browser.scripts.length, 0);
  assert.equal(browser.listeners.size, 0);
  assert.equal(browser.windowObject.ym, undefined);
});

test("счётчик грузится один раз и получает обезличенную цель перехода", () => {
  const browser = createBrowserDouble();
  const calls = [];
  browser.windowObject.ym = (...args) => calls.push(args);
  const metrika = installMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    windowObject: browser.windowObject,
  });

  assert.equal(metrika.enabled, true);
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.scripts[0].src, "https://mc.yandex.ru/metrika/tag.js");
  assert.deepEqual(calls[0], [123456, "init", {
    accurateTrackBounce: true,
    clickmap: false,
    trackLinks: true,
    webvisor: false,
  }]);

  browser.listeners.get(AFFILIATE_CLICK_EVENT)({
    detail: {
      entityId: "itech-slt-460",
      offerId: "offer01",
      pagePath: "/kronshteyny/itech-slt-460/",
      placementId: "seo-hub-buy-tv-mount-r03-itech-slt-460",
      placementRank: 3,
      sourcePath: "/modeli/tcl-55c6k/",
      vid: "krepitvsl46001",
      ignored: "персональные данные не передаются",
    },
  });
  assert.deepEqual(calls[1], [123456, "reachGoal", AFFILIATE_CLICK_GOAL, {
    entity_id: "itech-slt-460",
    offer_id: "offer01",
    page_path: "/kronshteyny/itech-slt-460/",
    placement_id: "seo-hub-buy-tv-mount-r03-itech-slt-460",
    placement_rank: 3,
    source_path: "/modeli/tcl-55c6k/",
    vid: "krepitvsl46001",
  }]);

  metrika.dispose();
  assert.equal(browser.listeners.size, 0);
});

test("параметры цели фильтруются до безопасных технических идентификаторов", () => {
  const browser = createBrowserDouble();
  const calls = [];
  browser.windowObject.ym = (...args) => calls.push(args);
  const metrika = installMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    windowObject: browser.windowObject,
  });

  metrika.trackMarketClick({
    entityId: "телефон:+79990000000",
    offerId: "offer 01",
    pagePath: "https://example.test/?email=user@example.test",
    placementId: "bad placement id",
    placementRank: 9,
    sourcePath: "mailto:user@example.test",
    vid: "validVID01",
  });

  assert.deepEqual(calls[1][3], { vid: "validVID01" });
});

test("корневая SEO-страница сохраняется в обезличенном событии", () => {
  const browser = createBrowserDouble();
  const calls = [];
  browser.windowObject.ym = (...args) => calls.push(args);
  const metrika = installMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    windowObject: browser.windowObject,
  });

  metrika.trackMarketClick({
    entityId: "onkron-tm6",
    offerId: "offer01",
    pagePath: "/kronshteyny/onkron-tm6/",
    sourcePath: "/",
    vid: "validVID01",
  });

  assert.equal(calls[1][3].source_path, "/");
});
