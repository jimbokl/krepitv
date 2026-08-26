import { AFFILIATE_CLICK_EVENT } from "./affiliateClick.mjs";
import {
  MOUNT_DETAIL_CLICK_EVENT,
  mountDetailClickDetail,
} from "./mountDetailClick.mjs";
import { RESULT_COMPLETED_EVENT } from "./resultCompleted.mjs";
import {
  INSTALLATION_KIT_INTERACTION_EVENT,
  installationKitInteractionDetail,
} from "./installationKitInteraction.mjs";
import {
  TOOL_USAGE_EVENT,
  toolUsageDetail,
} from "./toolUsage.mjs";

export {
  AFFILIATE_CLICK_EVENT,
  MOUNT_DETAIL_CLICK_EVENT,
  RESULT_COMPLETED_EVENT,
  INSTALLATION_KIT_INTERACTION_EVENT,
  TOOL_USAGE_EVENT,
};
export const AFFILIATE_CLICK_GOAL = "market_click";
export const MOUNT_DETAIL_CLICK_GOAL = "mount_detail_click";
export const RESULT_COMPLETED_GOAL = "result_completed";
export const INSTALLATION_KIT_INTERACTION_GOAL = "installation_kit_interaction";
export const TOOL_USAGE_GOAL = "tool_usage";

const METRIKA_SCRIPT_ID = "krepitv-yandex-metrika";
const METRIKA_SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";
const SAFE_TOKEN = /^[A-Za-z0-9_-]{1,150}$/;
const SAFE_RESULT_TOKEN = /^[a-z][a-z0-9_-]{0,63}$/;
const SAFE_PAGE_PATH = /^(?:\/|\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?)$/;

function normalizeCounterId(value) {
  const counterId = Number(value);
  return Number.isSafeInteger(counterId) && counterId > 0 ? counterId : null;
}

function safeToken(value) {
  return typeof value === "string" && SAFE_TOKEN.test(value) ? value : undefined;
}

function safeResultToken(value) {
  return typeof value === "string" && SAFE_RESULT_TOKEN.test(value)
    ? value
    : undefined;
}

function safePagePath(value) {
  return typeof value === "string" &&
    value.length <= 241 &&
    SAFE_PAGE_PATH.test(value)
    ? value
    : undefined;
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
    return {
      enabled: false,
      dispose() {},
      trackMarketClick() { return false; },
      trackMountDetailClick() { return false; },
      trackResultCompleted() { return false; },
      trackInstallationKitInteraction() { return false; },
      trackToolUsage() { return false; },
    };
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

  function trackMountDetailClick(detail = {}) {
    const safeDetail = mountDetailClickDetail(detail);
    if (!safeDetail) return false;
    ym(normalizedCounterId, "reachGoal", MOUNT_DETAIL_CLICK_GOAL, safeDetail);
    return true;
  }

  function handleMountDetailClick(event) {
    trackMountDetailClick(event?.detail);
  }

  function trackResultCompleted(detail = {}) {
    const toolId = safeResultToken(detail.toolId);
    const resultType = safeResultToken(detail.resultType);
    if (!toolId || !resultType) return false;

    const parameters = {
      result_count: Number.isInteger(detail.resultCount) &&
        detail.resultCount >= 0 && detail.resultCount <= 1000
        ? detail.resultCount
        : undefined,
      result_type: resultType,
      source_path: safePagePath(detail.sourcePath),
      tool_id: toolId,
    };
    for (const [key, value] of Object.entries(parameters)) {
      if (value === undefined) delete parameters[key];
    }
    ym(normalizedCounterId, "reachGoal", RESULT_COMPLETED_GOAL, parameters);
    return true;
  }

  function handleResultCompleted(event) {
    trackResultCompleted(event?.detail);
  }

  function trackInstallationKitInteraction(detail = {}) {
    const safeDetail = installationKitInteractionDetail(detail);
    if (!safeDetail) return false;
    ym(
      normalizedCounterId,
      "reachGoal",
      INSTALLATION_KIT_INTERACTION_GOAL,
      safeDetail,
    );
    return true;
  }

  function handleInstallationKitInteraction(event) {
    trackInstallationKitInteraction(event?.detail);
  }

  function trackToolUsage(detail = {}) {
    const safeDetail = toolUsageDetail(detail, detail?.sourcePath);
    if (!safeDetail) return false;
    const parameters = {
      action: safeDetail.action,
      source_path: safeDetail.sourcePath,
      tool_id: safeDetail.toolId,
    };
    if (parameters.source_path === undefined) delete parameters.source_path;
    ym(normalizedCounterId, "reachGoal", TOOL_USAGE_GOAL, parameters);
    return true;
  }

  function handleToolUsage(event) {
    trackToolUsage(event?.detail);
  }

  windowObject.addEventListener(AFFILIATE_CLICK_EVENT, handleAffiliateClick);
  windowObject.addEventListener(MOUNT_DETAIL_CLICK_EVENT, handleMountDetailClick);
  windowObject.addEventListener(RESULT_COMPLETED_EVENT, handleResultCompleted);
  windowObject.addEventListener(
    INSTALLATION_KIT_INTERACTION_EVENT,
    handleInstallationKitInteraction,
  );
  windowObject.addEventListener(TOOL_USAGE_EVENT, handleToolUsage);
  return {
    enabled: true,
    dispose() {
      windowObject.removeEventListener(AFFILIATE_CLICK_EVENT, handleAffiliateClick);
      windowObject.removeEventListener(MOUNT_DETAIL_CLICK_EVENT, handleMountDetailClick);
      windowObject.removeEventListener(RESULT_COMPLETED_EVENT, handleResultCompleted);
      windowObject.removeEventListener(
        INSTALLATION_KIT_INTERACTION_EVENT,
        handleInstallationKitInteraction,
      );
      windowObject.removeEventListener(TOOL_USAGE_EVENT, handleToolUsage);
    },
    trackMarketClick,
    trackMountDetailClick,
    trackResultCompleted,
    trackInstallationKitInteraction,
    trackToolUsage,
  };
}
