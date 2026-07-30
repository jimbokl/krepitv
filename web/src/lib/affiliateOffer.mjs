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

function hasExactlyOneQueryValue(url, key, expected) {
  const values = url.searchParams.getAll(key);
  return values.length === 1 && values[0] === expected;
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
  let source;
  try {
    source = new URL(offer.market_source_url);
  } catch {
    return null;
  }

  const commonTrackingIsValid =
    /^\d{5,20}$/.test(offer.clid ?? "") &&
    /^[A-Za-z0-9]{1,150}$/.test(offer.vid ?? "") &&
    hasExactlyOneQueryValue(destination, "clid", offer.clid) &&
    hasExactlyOneQueryValue(destination, "vid", offer.vid) &&
    hasExactlyOneQueryValue(destination, "distr_type", "7") &&
    hasExactlyOneQueryValue(destination, "utm_source", "partner_network") &&
    hasExactlyOneQueryValue(destination, "utm_campaign", offer.clid);
  const isAdvertising = offer.compliance_mode === "advertising";
  const isNonAdStorefront = offer.compliance_mode === "non_ad_storefront";
  const complianceIsValid = isAdvertising
    ? Boolean(
        offer.creative?.erid &&
          isDisclosureComplete(offer.creative.disclosure) &&
          hasExactlyOneQueryValue(destination, "erid", offer.creative.erid),
      )
    : isNonAdStorefront
      ? offer.creative === null && destination.searchParams.getAll("erid").length === 0
      : false;

  if (
    destination.protocol !== "https:" ||
    destination.hostname !== MARKET_HOST ||
    destination.hash ||
    source.protocol !== "https:" ||
    source.hostname !== MARKET_HOST ||
    source.pathname !== destination.pathname ||
    !commonTrackingIsValid ||
    !complianceIsValid ||
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
    mode: offer.compliance_mode,
    label: isAdvertising ? offer.creative.disclosure.label : "Партнёрская ссылка",
    notice: isAdvertising
      ? `${offer.creative.disclosure.label} · ${offer.creative.disclosure.advertiser_name} · ИНН ${offer.creative.disclosure.advertiser_inn} · erid: ${offer.creative.erid}`
      : null,
    advertiserName: isAdvertising
      ? offer.creative.disclosure.advertiser_name
      : null,
    advertiserInn: isAdvertising
      ? offer.creative.disclosure.advertiser_inn
      : null,
    erid: isAdvertising ? offer.creative.erid : null,
    clid: offer.clid,
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
