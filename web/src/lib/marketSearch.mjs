const MARKET_SEARCH_BASE = "https://market.yandex.ru/search?text=";

function encodeQueryComponent(value) {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (character) =>
    `%${character.codePointAt(0).toString(16).toUpperCase()}`,
  );
}

export function marketMountSearchHref(title) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (!normalizedTitle) return "";
  return `${MARKET_SEARCH_BASE}${encodeQueryComponent(normalizedTitle)}`;
}
