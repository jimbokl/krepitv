const PUBLIC_MARKET_ORIGIN = "https://market.yandex.ru";

function objectValues(value) {
  return value && typeof value === "object" ? Object.values(value) : [];
}

function findCollections(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 12) return null;
  if (
    value.visibleSearchResult
    && value.searchResult
    && value.visibleEntity
    && value.productShowPlace
  ) return value;
  for (const child of Object.values(value)) {
    const found = findCollections(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function parseNoframesStates(html) {
  return [...String(html).matchAll(/<noframes\b[^>]*>([\s\S]*?)<\/noframes>/gi)]
    .map((match) => match[1])
    .filter((text) => text.includes('"visibleSearchResult"') && text.includes('"productShowPlace"'))
    .map((text) => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function normalizeComparable(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, "")
    .trim();
}

export function parsePurchaseCount(value) {
  const text = String(value ?? "").replace(/\u00a0|\u2009/g, " ");
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(k|к|тыс(?:\.|яч[аи])?)?\s+купил/iu);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * (match[2] ? 1_000 : 1));
}

function cleanBrand(value) {
  const brand = String(value ?? "").replace(/\s+/g, " ").trim();
  return brand || null;
}

function inferBrand(title) {
  const cleaned = String(title ?? "")
    .replace(/^\s*(?:умный\s+)?телевизор\s+/iu, "")
    .replace(/^\s*\d+(?:[.,]\d+)?\s*(?:дюйм\w*|["″])?\s*/iu, "")
    .trim();
  const match = cleaned.match(/^([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9.+&-]*(?:\s+Electronics)?)/u);
  return cleanBrand(match?.[1]);
}

export function inferModelCandidate(title, brand, slug = "") {
  const rawTitle = String(title ?? "").replace(/\s+/g, " ").trim();
  const rawBrand = String(brand ?? "").trim();
  const tokenCandidates = rawTitle
    .match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-_/][A-Za-zА-Яа-яЁё0-9]+)*/gu)
    ?.filter((token) => {
      const normalized = normalizeComparable(token);
      return normalized.length >= 2
        && /[a-zа-я]/iu.test(token)
        && /\d/u.test(token)
        && !/^\d+[xх]\d+$/iu.test(token)
        && !/^(?:4k|8k|hd|fhd|uhd|3d)$/iu.test(token)
        && !/телевизор/iu.test(token);
    })
    .sort((left, right) => normalizeComparable(right).length - normalizeComparable(left).length) ?? [];
  if (tokenCandidates.length) {
    return {
      value: tokenCandidates[0],
      confidence: normalizeComparable(tokenCandidates[0]).length >= 3 ? "high" : "medium",
    };
  }

  let tail = rawTitle.replace(/^\s*(?:умный\s+)?телевизор\s+/iu, "");
  if (rawBrand) {
    const brandIndex = tail.toLocaleLowerCase("ru").indexOf(rawBrand.toLocaleLowerCase("ru"));
    if (brandIndex !== -1) tail = tail.slice(brandIndex + rawBrand.length);
  }
  tail = tail
    .replace(/^\s*\d+(?:[.,]\d+)?\s*(?:дюйм\w*|["″])\s*/iu, "")
    .replace(/^\s*(?:mini\s*)?(?:led|qled|oled)\s+/iu, "")
    .split(/[,;(]|\s+(?:смарт|smart|android|full\s+hd|ultra\s+hd|4k|wi[- ]?fi)\b/iu)[0]
    .replace(/\s+/g, " ")
    .trim();

  const slugTail = String(slug)
    .replace(/^.*?televizor-/u, "")
    .replace(new RegExp(`^${rawBrand.toLocaleLowerCase("ru").replace(/[^a-zа-я0-9]+/giu, "-")}-?`, "iu"), "")
    .replaceAll("-", " ")
    .trim();
  const candidate = tail || slugTail || null;
  if (!candidate) return { value: null, confidence: "low" };

  const compact = normalizeComparable(candidate);
  if (!compact || /^(?:tv|smarttv|телевизор|\d+)$/iu.test(compact)) {
    return { value: null, confidence: "low" };
  }
  const hasLetters = /[a-zа-я]/iu.test(candidate);
  const hasDigits = /\d/u.test(candidate);
  const confidence = hasLetters && hasDigits && compact.length >= 5
    ? "high"
    : compact.length >= 2
      ? "medium"
      : "low";
  return { value: candidate, confidence };
}

function resolveSnippet(collections, productShowPlace) {
  return collections.productSnippet?.[productShowPlace?.productSnippetId] ?? null;
}

function resolveOffer(collections, productShowPlace) {
  const offerShowPlace = collections.offerShowPlace?.[productShowPlace?.defaultOfferShowPlaceId]
    ?? objectValues(collections.offerShowPlace).find((item) => (
      productShowPlace?.offerShowPlaceIds?.includes(String(item.id))
    ));
  return offerShowPlace ? collections.offer?.[offerShowPlace.offerId] ?? null : null;
}

function ratingFromSnippet(snippet) {
  const rating = snippet?.productPayload?.rating;
  const description = rating?.snippet?.descriptionList?.join(" · ")
    ?? rating?.snippet?.description
    ?? "";
  return {
    rating_value: Number.isFinite(Number(rating?.ratingValue)) ? Number(rating.ratingValue) : null,
    rating_count: Number.isFinite(Number(rating?.ratingCount)) ? Number(rating.ratingCount) : null,
    purchase_count: parsePurchaseCount(description),
    purchase_label: String(rating?.snippet?.descriptionList?.find((item) => /купил/iu.test(item)) ?? "") || null,
  };
}

function canonicalCardUrl(slug, productId) {
  if (!slug || !productId) return null;
  return `${PUBLIC_MARKET_ORIGIN}/card/${encodeURIComponent(slug)}/${encodeURIComponent(String(productId))}`;
}

export function parseMarketCategoryPage(html, requestedPage = null) {
  const states = parseNoframesStates(html);
  const collections = states.map((state) => findCollections(state)).find(Boolean);
  if (!collections) throw new Error("Market category state was not found in HTML");

  const visibleSearchResult = objectValues(collections.visibleSearchResult)[0];
  if (!visibleSearchResult) throw new Error("visibleSearchResult is missing");
  const page = Number(visibleSearchResult.page);
  if (requestedPage !== null && page !== Number(requestedPage)) {
    throw new Error(`Market returned page ${page}, requested ${requestedPage}`);
  }
  const searchResultId = visibleSearchResult.searchResultIds?.[String(page)];
  const searchResult = collections.searchResult?.[searchResultId] ?? objectValues(collections.searchResult)[0];
  const visibleIds = searchResult?.visibleEntityIds ?? [];
  if (!Array.isArray(visibleIds) || !visibleIds.length) throw new Error("Visible product list is empty");

  const rows = [];
  for (let index = 0; index < visibleIds.length; index += 1) {
    const visible = collections.visibleEntity?.[visibleIds[index]];
    const productShowPlace = collections.productShowPlace?.[visible?.productShowPlaceId];
    if (!productShowPlace) continue;
    const productId = String(productShowPlace.productId ?? "");
    const product = collections.product?.[productId] ?? null;
    const offer = resolveOffer(collections, productShowPlace);
    const snippet = resolveSnippet(collections, productShowPlace);
    const title = product?.titles?.raw
      ?? offer?.titles?.raw
      ?? snippet?.productPayload?.title?.value
      ?? null;
    const slug = product?.slug ?? offer?.staticSlug ?? offer?.slug ?? null;
    const vendor = collections.vendor?.[String(offer?.vendorId)]?.name;
    const brand = cleanBrand(vendor) ?? inferBrand(title);
    const modelCandidate = inferModelCandidate(title, brand, slug);
    const url = canonicalCardUrl(slug, productId);
    if (!title || !url || !offer) continue;
    rows.push({
      market_product_id: productId,
      market_title: title,
      brand,
      model_candidate: modelCandidate.value,
      model_candidate_confidence: modelCandidate.confidence,
      market_slug: slug,
      market_url: url,
      page,
      page_rank: index + 1,
      observed_rank: ((page - 1) * Number(visibleSearchResult.itemsPerPage || visibleIds.length)) + index + 1,
      sponsored: Boolean(productShowPlace.sponsored),
      currently_listed: true,
      ...ratingFromSnippet(snippet),
    });
  }
  if (!rows.length) throw new Error("No available TV products were extracted from the category page");
  return {
    metadata: {
      page,
      page_count: Number(visibleSearchResult.pageCount),
      items_per_page: Number(visibleSearchResult.itemsPerPage),
      reported_total: Number(visibleSearchResult.total),
      has_next_page: Boolean(visibleSearchResult.hasNextPage),
      sort: visibleSearchResult.sortId ?? null,
      visible_count: visibleIds.length,
      extracted_count: rows.length,
    },
    products: rows,
  };
}

export function matchCatalogModel(marketProduct, catalogModels) {
  const haystack = normalizeComparable(`${marketProduct.market_title} ${marketProduct.market_slug}`);
  const brand = normalizeComparable(marketProduct.brand);
  const candidates = catalogModels.filter((model) => {
    const modelToken = normalizeComparable(model.model);
    if (modelToken.length < 5 || !haystack.includes(modelToken)) return false;
    const modelBrand = normalizeComparable(model.brand);
    return !brand || !modelBrand || brand === modelBrand || haystack.includes(modelBrand);
  });
  if (candidates.length !== 1) return null;
  return {
    catalog_model_id: candidates[0].id,
    catalog_brand: candidates[0].brand,
    catalog_model: candidates[0].model,
    match_type: "exact_model_token",
  };
}

export function deduplicateMarketProducts(products) {
  const byId = new Map();
  for (const product of products) {
    const existing = byId.get(product.market_product_id);
    const position = (Number(product.page) * 10_000) + Number(product.page_rank);
    const existingPosition = existing
      ? (Number(existing.page) * 10_000) + Number(existing.page_rank)
      : Number.POSITIVE_INFINITY;
    if (!existing || position < existingPosition) byId.set(product.market_product_id, product);
  }
  return [...byId.values()].sort((left, right) => (
    left.page - right.page || left.page_rank - right.page_rank
  ));
}
