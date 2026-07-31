export const AFFILIATE_CLICK_EVENT = "krepitv:affiliate-click";

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
