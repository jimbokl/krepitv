import { AFFILIATE_CLICK_EVENT } from "./affiliateClick.mjs";

export { AFFILIATE_CLICK_EVENT };
export const AFFILIATE_CLICK_GOAL = "market_click";

const METRIKA_SCRIPT_ID = "krepitv-yandex-metrika";
const METRIKA_SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";
const SAFE_TOKEN = /^[A-Za-z0-9_-]{1,150}$/;
const SAFE_PAGE_PATH = /^(?:\/|\/[A-Za-z0-9/_-]{1,240})$/;

function normalizeCounterId(value) {
  const counterId = Number(value);
  return Number.isSafeInteger(counterId) && counterId > 0 ? counterId : null;
}

function safeToken(value) {
  return typeof value === "string" && SAFE_TOKEN.test(value) ? value : undefined;
}

function safePagePath(value) {
  return typeof value === "string" && SAFE_PAGE_PATH.test(value) ? value : undefined;
}

function createQueuedMetrika(windowObject) {
  if (typeof windowObject.ym === "function") return windowObject.ym;

  function ym(...args) {
    ym.a.push(args);
  }
  ym.a = [];
  ym.l = Date.now();
  windowObject.ym = ym;
  return ym;
}

export function installMetrika({
  counterId,
  windowObject = globalThis.window,
  documentObject = globalThis.document,
} = {}) {
  const normalizedCounterId = normalizeCounterId(counterId);
  if (!normalizedCounterId || !windowObject || !documentObject) {
    return { enabled: false, dispose() {}, trackMarketClick() { return false; } };
  }

  const ym = createQueuedMetrika(windowObject);
  if (!documentObject.getElementById(METRIKA_SCRIPT_ID)) {
    const script = documentObject.createElement("script");
    script.id = METRIKA_SCRIPT_ID;
    script.async = true;
    script.src = METRIKA_SCRIPT_URL;
    (documentObject.head || documentObject.body).appendChild(script);
  }

  ym(normalizedCounterId, "init", {
    accurateTrackBounce: true,
    clickmap: false,
    trackLinks: true,
    webvisor: false,
  });

  function trackMarketClick(detail = {}) {
    const parameters = {
      entity_id: safeToken(detail.entityId),
      offer_id: safeToken(detail.offerId),
      page_path: safePagePath(detail.pagePath),
      placement_id: safeToken(detail.placementId),
      placement_rank: Number.isInteger(detail.placementRank) &&
        detail.placementRank >= 1 && detail.placementRank <= 3
        ? detail.placementRank
        : undefined,
      source_path: safePagePath(detail.sourcePath),
      vid: safeToken(detail.vid),
    };
    for (const [key, value] of Object.entries(parameters)) {
      if (value === undefined) delete parameters[key];
    }
    ym(normalizedCounterId, "reachGoal", AFFILIATE_CLICK_GOAL, parameters);
    return true;
  }

  function handleAffiliateClick(event) {
    trackMarketClick(event?.detail);
  }

  windowObject.addEventListener(AFFILIATE_CLICK_EVENT, handleAffiliateClick);
  return {
    enabled: true,
    dispose() {
      windowObject.removeEventListener(AFFILIATE_CLICK_EVENT, handleAffiliateClick);
    },
    trackMarketClick,
  };
}
