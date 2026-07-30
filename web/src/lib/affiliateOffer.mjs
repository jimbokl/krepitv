export const AFFILIATE_LINK_REL = "sponsored nofollow noopener noreferrer";

const MARKET_HOST = "market.yandex.ru";

function isDisclosureComplete(disclosure) {
  return (
    disclosure?.label === "Реклама" &&
    disclosure?.advertiser_name === "ООО «Яндекс Маркет»" &&
    disclosure?.advertiser_inn === "9704254424"
  );
}

export function getAffiliatePresentation(offer) {
  if (!offer?.publishable || offer.eligibility !== "publishable") return null;
  if (!offer.creative?.erid || !isDisclosureComplete(offer.creative.disclosure)) {
    return null;
  }

  let destination;
  try {
    destination = new URL(offer.affiliate_href);
  } catch {
    return null;
  }

  if (
    destination.protocol !== "https:" ||
    destination.hostname !== MARKET_HOST ||
    destination.searchParams.get("erid") !== offer.creative.erid
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
  };
}
