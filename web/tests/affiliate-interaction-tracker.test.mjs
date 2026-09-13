import assert from "node:assert/strict";
import test from "node:test";
import {
  AFFILIATE_CLICK_EVENT,
  AFFILIATE_VIEW_EVENT,
  installAffiliateInteractionTracker,
} from "../src/lib/affiliateClick.mjs";

test("единый трекер считает SSR-ссылку один раз и не дублирует показ в сессии", () => {
  const documentListeners = new Map();
  const dispatched = [];
  const session = new Map();
  const anchor = {
    dataset: {
      affiliateOfferId: "offer01",
      affiliatePlacementId: "model-tcl-r01-mount",
      affiliateRank: "1",
      entityId: "mount",
      pagePath: "/kronshteyny/mount/",
      vid: "validvid01",
    },
  };
  anchor.closest = () => anchor;

  let intersectionCallback;
  const observed = [];
  class FakeIntersectionObserver {
    constructor(callback) { intersectionCallback = callback; }
    observe(node) { observed.push(node); }
    unobserve() {}
    disconnect() {}
  }
  class FakeCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  const documentObject = {
    addEventListener(type, callback) { documentListeners.set(type, callback); },
    removeEventListener(type, callback) {
      if (documentListeners.get(type) === callback) documentListeners.delete(type);
    },
    documentElement: {},
    querySelectorAll() { return [anchor]; },
  };
  const windowObject = {
    CustomEvent: FakeCustomEvent,
    IntersectionObserver: FakeIntersectionObserver,
    dispatchEvent(event) { dispatched.push(event); },
    location: { pathname: "/modeli/tcl-65c7k/" },
    sessionStorage: {
      getItem(key) { return session.get(key) ?? null; },
      setItem(key, value) { session.set(key, String(value)); },
    },
  };

  const tracker = installAffiliateInteractionTracker({ documentObject, windowObject });
  assert.equal(tracker.enabled, true);
  assert.deepEqual(observed, [anchor]);

  documentListeners.get("click")({ target: anchor, type: "click" });
  intersectionCallback([{ intersectionRatio: 0.75, isIntersecting: true, target: anchor }]);
  intersectionCallback([{ intersectionRatio: 0.75, isIntersecting: true, target: anchor }]);

  assert.deepEqual(dispatched.map((event) => event.type), [
    AFFILIATE_CLICK_EVENT,
    AFFILIATE_VIEW_EVENT,
  ]);
  assert.equal(dispatched[0].detail.sourcePath, "/modeli/tcl-65c7k/");
  assert.equal(dispatched[1].detail.placementId, "model-tcl-r01-mount");

  tracker.dispose();
  assert.equal(documentListeners.size, 0);
});
