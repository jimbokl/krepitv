import { createHash } from "node:crypto";

const AMBIGUOUS_PRODUCT_IDS = new Set([
  "5633566305",
  "5815811859",
  "1093227948",
  "1563910346",
  "882566140",
  "5891562672",
  "5857304311",
  "5829371587",
  "5717516735",
]);

const BRAND_NAMES = new Map([
  ["artel", "Artel"],
  ["general electronics", "General Electronics"],
  ["hyundai", "Hyundai"],
  ["sber", "Sber"],
  ["starwind", "Starwind"],
  ["skyworth", "Skyworth"],
  ["topdevice", "TopDevice"],
]);

const CYRILLIC = new Map(Object.entries({
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}));

export function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gu, "")
    .trim();
}

export function slugifyMarketModel(value) {
  const transliterated = [...String(value ?? "").normalize("NFKC").toLocaleLowerCase("ru")]
    .map((character) => CYRILLIC.get(character) ?? character)
    .join("");
  return transliterated
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");
}

export function extractDiagonal(product) {
  const title = String(product.market_title ?? "");
  const explicit = [...title.matchAll(/(\d{2,3}(?:[.,]\d+)?)\s*(?:["″]|дюйм)/giu)]
    .map((match) => Number(match[1].replace(",", ".")))
    .find((value) => value >= 17 && value <= 115);
  if (explicit) return explicit;
  const fallback = [...title.matchAll(/(?<![a-zа-я0-9])(\d{2,3})(?![a-zа-я0-9])/giu)]
    .map((match) => Number(match[1]))
    .find((value) => value >= 17 && value <= 115);
  return fallback ?? null;
}

function displayBrand(value) {
  const brand = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (!brand) return "Бренд не указан";
  return BRAND_NAMES.get(brand.toLocaleLowerCase("ru")) ?? brand;
}

function safeModel(product, diagonal) {
  const candidate = String(product.model_candidate ?? "").replace(/\s+/gu, " ").trim();
  if (candidate) return candidate;
  return diagonal ? `телевизор ${diagonal}″` : `товар ${product.market_product_id}`;
}

function containsDiagonal(model, diagonal) {
  return diagonal !== null && new RegExp(`(^|\\D)${String(diagonal).replace(".", "[.,]")}(\\D|$)`, "u").test(model);
}

function modelEncodesPlausibleDiagonal(model) {
  return [...String(model).matchAll(/(?<!\d)(\d{2,3})(?!\d)/gu)]
    .map((match) => Number(match[1]))
    .some((value) => value >= 17 && value <= 115);
}

function pageTitle(brand, model, diagonal) {
  const identity = brand === "Бренд не указан" ? model : `${brand} ${model}`;
  return containsDiagonal(model, diagonal) || diagonal === null ? identity : `${identity} ${diagonal}″`;
}

function identityConfidence(product) {
  if (AMBIGUOUS_PRODUCT_IDS.has(String(product.market_product_id))) return "low";
  return ["high", "medium"].includes(product.model_candidate_confidence)
    ? product.model_candidate_confidence
    : "low";
}

function comparePrimary(left, right) {
  return (right.purchase_count ?? -1) - (left.purchase_count ?? -1)
    || (right.rating_count ?? -1) - (left.rating_count ?? -1)
    || left.observed_rank - right.observed_rank;
}

function capId(value, suffix = "") {
  const maximumBase = 79 - suffix.length;
  const base = String(value).slice(0, maximumBase).replace(/-+$/u, "");
  return `${base}${suffix}`;
}

export function buildMarketModelPages(research, verifiedModels) {
  if (!Array.isArray(research?.products) || research.products.length !== 133) {
    throw new Error("Market research must contain exactly 133 products");
  }
  if (!Array.isArray(verifiedModels) || !verifiedModels.length) {
    throw new Error("Verified TV catalog is empty");
  }
  const verifiedById = new Map(verifiedModels.map((model) => [model.id, model]));
  const prepared = research.products.map((product) => {
    const diagonal = extractDiagonal(product);
    const brand = displayBrand(product.brand);
    const model = safeModel(product, diagonal);
    const verifiedModel = product.catalog_model_id
      ? verifiedById.get(product.catalog_model_id)
      : null;
    if (product.catalog_model_id && !verifiedModel) {
      throw new Error(`Unknown verified model ${product.catalog_model_id}`);
    }
    return {
      source: product,
      brand,
      model,
      title: verifiedModel?.title ?? pageTitle(brand, model, diagonal),
      diagonal_inches: diagonal,
      confidence: verifiedModel ? "verified" : identityConfidence(product),
      verified_model_id: verifiedModel?.id ?? null,
      identity_key: verifiedModel?.id
        ?? `${normalizeIdentity(brand)}|${normalizeIdentity(model)}|${modelEncodesPlausibleDiagonal(model) ? "encoded" : diagonal ?? "unknown"}`,
    };
  });

  const groups = new Map();
  for (const item of prepared) {
    const group = groups.get(item.identity_key) ?? [];
    group.push(item);
    groups.set(item.identity_key, group);
  }
  for (const group of groups.values()) {
    const knownDiagonals = [...new Set(group
      .map((item) => item.diagonal_inches)
      .filter((value) => value !== null))];
    if (knownDiagonals.length === 1) {
      for (const item of group) {
        if (item.diagonal_inches === null) {
          item.diagonal_inches = knownDiagonals[0];
          item.title = item.verified_model_id
            ? item.title
            : pageTitle(item.brand, item.model, item.diagonal_inches);
        }
      }
    }
    group.sort((left, right) => comparePrimary(left.source, right.source));
  }

  const proposedBases = new Map();
  for (const [key, group] of groups) {
    const primary = group[0];
    if (primary.verified_model_id) {
      proposedBases.set(key, primary.verified_model_id);
      continue;
    }
    const slug = slugifyMarketModel(`${primary.brand} ${primary.model}`)
      || `market-tv-${primary.source.market_product_id}`;
    proposedBases.set(key, slug);
  }
  const duplicateBaseCounts = new Map();
  for (const base of proposedBases.values()) {
    duplicateBaseCounts.set(base, (duplicateBaseCounts.get(base) ?? 0) + 1);
  }
  const assigned = new Set(verifiedModels.map((model) => model.id));
  const canonicalIds = new Map();
  for (const [key, group] of groups) {
    const primary = group[0];
    if (primary.verified_model_id) {
      canonicalIds.set(key, primary.verified_model_id);
      continue;
    }
    let base = proposedBases.get(key);
    if ((duplicateBaseCounts.get(base) ?? 0) > 1 && primary.diagonal_inches !== null) {
      base = `${base}-${String(primary.diagonal_inches).replace(".", "-")}`;
    }
    if (assigned.has(base)) base = `${base}-market`;
    if (assigned.has(base)) base = `${base}-${primary.source.market_product_id.slice(-6)}`;
    base = capId(base);
    if (!/^[a-z0-9][a-z0-9-]{2,78}$/u.test(base)) {
      base = `market-tv-${primary.source.market_product_id}`;
    }
    assigned.add(base);
    canonicalIds.set(key, base);
  }

  const records = [];
  for (const [key, group] of groups) {
    const canonicalId = canonicalIds.get(key);
    for (let index = 0; index < group.length; index += 1) {
      const item = group[index];
      const verified = Boolean(item.verified_model_id) && index === 0;
      const alias = index > 0;
      let id = verified || !alias
        ? canonicalId
        : capId(canonicalId, `-market-${item.source.market_product_id}`);
      if (alias && assigned.has(id)) id = `market-tv-${item.source.market_product_id}`;
      assigned.add(id);
      records.push({
        record_id: item.source.market_product_id,
        id,
        canonical_id: canonicalId,
        canonical_path: `/modeli/${canonicalId}/`,
        route_path: `/modeli/${id}/`,
        page_kind: verified ? "verified" : alias ? "alias" : "observed",
        // A Market observation proves only that a product card was visible. It does
        // not prove VESA, weight or a compatible mount. Keep the verification
        // route accessible, but fail closed for search indexing until this model
        // is promoted into the source-backed TV catalog.
        indexable: false,
        identity_confidence: item.confidence,
        brand: item.brand,
        model: item.model,
        title: item.title,
        market_title: item.source.market_title,
        diagonal_inches: item.diagonal_inches,
        market_product_id: item.source.market_product_id,
        market_url: item.source.market_url,
        purchase_count: item.source.purchase_count,
        purchase_label: item.source.purchase_label,
        rating_value: item.source.rating_value,
        rating_count: item.source.rating_count,
        observed_rank: item.source.observed_rank,
        observed_at: research.observed_at,
        checked_at: String(research.observed_at).slice(0, 10),
        verified_model_id: verified ? item.verified_model_id : null,
        source_label: "Карточка телевизора в выдаче Яндекс Маркета",
      });
    }
  }
  records.sort((left, right) => left.observed_rank - right.observed_rank);

  const manifest = {
    schema_version: 1,
    observed_at: research.observed_at,
    source_url: research.research_contract.public_source_url,
    source_scope: "Сохранённый верхний срез выдачи; присутствие на дату наблюдения, не полный каталог и не статистика продаж",
    summary: {
      market_observations: records.length,
      unique_identities: groups.size,
      verified_routes: records.filter((record) => record.page_kind === "verified").length,
      observed_canonicals: records.filter((record) => record.page_kind === "observed").length,
      indexable_observed_canonicals: records.filter((record) => record.indexable).length,
      alias_routes: records.filter((record) => record.page_kind === "alias").length,
      low_confidence_routes: records.filter((record) => record.identity_confidence === "low").length,
    },
    records,
  };
  manifest.batch_sha256 = createHash("sha256").update(JSON.stringify(records)).digest("hex");
  validateMarketModelPages(manifest, verifiedModels);
  return manifest;
}

export function validateMarketModelPages(manifest, verifiedModels) {
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.records)) {
    throw new Error("Invalid market model page manifest");
  }
  if (manifest.records.length !== 133) throw new Error("Every Market observation must resolve to a route");
  const verifiedIds = new Set(verifiedModels.map((model) => model.id));
  const routePaths = new Set();
  const recordIds = new Set();
  for (const record of manifest.records) {
    if (recordIds.has(record.record_id)) throw new Error(`Duplicate Market record ${record.record_id}`);
    recordIds.add(record.record_id);
    if (!/^\/modeli\/[a-z0-9][a-z0-9-]{2,78}\/$/u.test(record.route_path)) {
      throw new Error(`Unsafe observed model route ${record.route_path}`);
    }
    if (routePaths.has(record.route_path) && record.page_kind !== "verified") {
      throw new Error(`Duplicate observed route ${record.route_path}`);
    }
    routePaths.add(record.route_path);
    if (!/^https:\/\/market\.yandex\.ru\/card\/[^?]+\/\d+$/u.test(record.market_url)) {
      throw new Error(`Market URL must be canonical and untracked: ${record.market_url}`);
    }
    if (record.page_kind === "verified" && !verifiedIds.has(record.verified_model_id)) {
      throw new Error(`Verified route has no catalog model: ${record.record_id}`);
    }
    if (record.page_kind === "alias" && (record.indexable || record.id === record.canonical_id)) {
      throw new Error(`Alias must be noindex and point to another canonical: ${record.record_id}`);
    }
    if (record.page_kind === "observed" && record.indexable) {
      throw new Error(`Observed route without verified fit must be noindex: ${record.record_id}`);
    }
    for (const forbidden of ["vesa_width_mm", "vesa_height_mm", "weight_kg", "compatible_mounts"]) {
      if (Object.hasOwn(record, forbidden)) throw new Error(`Observed record contains unverified ${forbidden}`);
    }
  }
  return true;
}
