export const AFFILIATE_CLICK_EVENT = "krepitv:affiliate-click";

export function affiliateClickDetail(offer = {}) {
  return {
    entityId: offer.entity_id,
    offerId: offer.id,
    pagePath: offer.page_path,
    vid: offer.vid,
  };
}

export function emitAffiliateClick(windowObject, offer) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }

  windowObject.dispatchEvent(
    new windowObject.CustomEvent(AFFILIATE_CLICK_EVENT, {
      detail: affiliateClickDetail(offer),
    }),
  );
  return true;
}
