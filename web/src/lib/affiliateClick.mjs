export const AFFILIATE_CLICK_EVENT = "krepitv:affiliate-click";
export const AFFILIATE_VIEW_EVENT = "krepitv:affiliate-view";
const AFFILIATE_SELECTOR = "a[data-affiliate-offer-id][data-affiliate-placement-id]";
const VIEW_SESSION_PREFIX = "krepitv:affiliate-view:v1:";

export function affiliateClickDetail(offer = {}, sourcePath) {
  const detail = {
    entityId: offer.entity_id,
    offerId: offer.id,
    pagePath: offer.page_path,
    sourcePath,
    vid: offer.vid,
  };
  if (typeof offer.placement_id === "string") {
    detail.placementId = offer.placement_id;
  }
  if (Number.isInteger(offer.rank) && offer.rank >= 1 && offer.rank <= 3) {
    detail.placementRank = offer.rank;
  }
  return detail;
}

export function emitAffiliateClick(windowObject, offer) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }

  try {
    windowObject.dispatchEvent(
      new windowObject.CustomEvent(AFFILIATE_CLICK_EVENT, {
        detail: affiliateClickDetail(offer, windowObject.location?.pathname),
      }),
    );
  } catch {
    return false;
  }
  return true;
}

export function emitAffiliateView(windowObject, offer) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) return false;
  try {
    windowObject.dispatchEvent(new windowObject.CustomEvent(AFFILIATE_VIEW_EVENT, {
      detail: affiliateClickDetail(offer, windowObject.location?.pathname),
    }));
  } catch {
    return false;
  }
  return true;
}

function offerFromAnchor(anchor) {
  const rank = Number(anchor?.dataset?.affiliateRank);
  return {
    entity_id: anchor?.dataset?.entityId,
    id: anchor?.dataset?.affiliateOfferId,
    page_path: anchor?.dataset?.pagePath,
    placement_id: anchor?.dataset?.affiliatePlacementId,
    rank: Number.isInteger(rank) ? rank : undefined,
    vid: anchor?.dataset?.vid,
  };
}

function closestAffiliateAnchor(target) {
  return target?.closest?.(AFFILIATE_SELECTOR) ?? null;
}

function sessionViewWasRecorded(windowObject, key) {
  try {
    return windowObject?.sessionStorage?.getItem?.(key) === "1";
  } catch {
    return false;
  }
}

function rememberSessionView(windowObject, key) {
  try {
    windowObject?.sessionStorage?.setItem?.(key, "1");
  } catch {
    // The in-memory set remains authoritative for this page load.
  }
}

export function installAffiliateInteractionTracker({
  documentObject = globalThis.document,
  windowObject = globalThis.window,
} = {}) {
  if (!documentObject?.addEventListener || !windowObject) {
    return { dispose() {}, enabled: false };
  }

  const viewed = new Set();
  const observed = new WeakSet();
  const IntersectionObserverClass = windowObject.IntersectionObserver;
  const MutationObserverClass = windowObject.MutationObserver;

  function handleClick(event) {
    if (event.type === "auxclick" && event.button !== 1) return;
    const anchor = closestAffiliateAnchor(event.target);
    if (anchor) emitAffiliateClick(windowObject, offerFromAnchor(anchor));
  }

  const observer = typeof IntersectionObserverClass === "function"
    ? new IntersectionObserverClass((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const anchor = entry.target;
        const placementId = anchor?.dataset?.affiliatePlacementId;
        if (!placementId) continue;
        const key = `${windowObject.location?.pathname ?? ""}\n${placementId}`;
        const sessionKey = `${VIEW_SESSION_PREFIX}${key}`;
        if (viewed.has(key) || sessionViewWasRecorded(windowObject, sessionKey)) {
          observer.unobserve(anchor);
          continue;
        }
        emitAffiliateView(windowObject, offerFromAnchor(anchor));
        viewed.add(key);
        rememberSessionView(windowObject, sessionKey);
        observer.unobserve(anchor);
      }
    }, { threshold: 0.5 })
    : null;

  function observeAnchors(root = documentObject) {
    if (!observer || !root?.querySelectorAll) return;
    for (const anchor of root.querySelectorAll(AFFILIATE_SELECTOR)) {
      if (observed.has(anchor)) continue;
      observed.add(anchor);
      observer.observe(anchor);
    }
  }

  const mutationObserver = observer && typeof MutationObserverClass === "function"
    ? new MutationObserverClass(() => observeAnchors())
    : null;

  documentObject.addEventListener("click", handleClick, true);
  documentObject.addEventListener("auxclick", handleClick, true);
  observeAnchors();
  mutationObserver?.observe(documentObject.documentElement ?? documentObject.body, {
    childList: true,
    subtree: true,
  });

  return {
    dispose() {
      documentObject.removeEventListener?.("click", handleClick, true);
      documentObject.removeEventListener?.("auxclick", handleClick, true);
      mutationObserver?.disconnect();
      observer?.disconnect();
      viewed.clear();
    },
    enabled: true,
  };
}
