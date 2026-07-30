export const AFFILIATE_LINK_REL = "sponsored nofollow noopener noreferrer";
export const MAX_AFFILIATE_AGE_MS = 48 * 60 * 60 * 1000;

const MARKET_HOST = "market.yandex.ru";
const MARKET_IMAGE_HOST = "avatars.mds.yandex.net";

function isDisclosureComplete(disclosure) {
  return (
    disclosure?.label === "Реклама" &&
    disclosure?.advertiser_name === "ООО «Яндекс Маркет»" &&
    disclosure?.advertiser_inn === "9704254424"
  );
}

function isFresh(value, now, maximumAgeMs) {
  const checkedAt = Date.parse(value ?? "");
  if (!Number.isFinite(checkedAt)) return false;
  const age = now - checkedAt;
  return age >= -5 * 60 * 1000 && age <= maximumAgeMs;
}

export function getAffiliatePresentation(
  offer,
  { now = Date.now(), maximumAgeMs = MAX_AFFILIATE_AGE_MS } = {},
) {
  if (!offer?.publishable || offer.eligibility !== "publishable") return null;
  if (!isFresh(offer.checked_at, now, maximumAgeMs)) return null;
  if (!offer.creative?.erid || !isDisclosureComplete(offer.creative.disclosure)) {
    return null;
  }

  let destination;
  try {
    destination = new URL(offer.affiliate_href);
  } catch {
    return null;
  }
  let productPhoto;
  try {
    productPhoto = new URL(offer.product_photo);
  } catch {
    return null;
  }

  if (
    destination.protocol !== "https:" ||
    destination.hostname !== MARKET_HOST ||
    destination.searchParams.get("erid") !== offer.creative.erid ||
    offer.entity_kind !== "mount" ||
    typeof offer.entity_id !== "string" ||
    offer.page_path !== `/kronshteyny/${offer.entity_id}/` ||
    offer.page_name !== "POKUPKI_PRODUCT" ||
    typeof offer.title !== "string" ||
    !offer.title.trim() ||
    productPhoto.protocol !== "https:" ||
    productPhoto.hostname !== MARKET_IMAGE_HOST
  ) {
    return null;
  }

  return {
    href: destination.toString(),
    rel: AFFILIATE_LINK_REL,
    target: "_blank",
    label: offer.creative.disclosure.label,
    advertiserName: offer.creative.disclosure.advertiser_name,
    advertiserInn: offer.creative.disclosure.advertiser_inn,
    erid: offer.creative.erid,
    productTitle: offer.title,
    productPhoto: productPhoto.toString(),
    checkedAt: offer.checked_at,
  };
}

export function selectAffiliateOffer(offers, identity, options) {
  const { pagePath, entityKind, entityId } = identity ?? {};
  return (offers ?? []).find(
    (offer) =>
      offer.page_path === pagePath &&
      offer.entity_kind === entityKind &&
      offer.entity_id === entityId &&
      getAffiliatePresentation(offer, options),
  ) ?? null;
}
