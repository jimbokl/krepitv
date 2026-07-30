import { chmod, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const PAGE_PATH_RE = /^\/[a-z0-9][a-z0-9/-]*\/$/;
const VID_RE = /^[A-Za-z0-9]{1,150}$/;
const REVISION_RE = /^[A-Za-z0-9._-]{1,80}$/;
const ERID_RE = /^[A-Za-z0-9._:-]{6,256}$/;
const AD_LABEL = "Реклама";
const ADVERTISER_NAME = "ООО «Яндекс Маркет»";
const ADVERTISER_INN = "9704254424";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const FORMS = new Set([
  "banner",
  "text-block",
  "text-graphic-block",
  "video",
  "audio-rec",
  "live-video",
  "live-audio",
]);
const COMPLIANCE_MODES = new Set(["advertising", "non_ad_storefront"]);
const BATCH_STATUSES = new Set(["ok", "unavailable", "error"]);
const ERROR_CODES = new Set([
  "http_error",
  "api_error",
  "invalid_payload",
  "not_rewarded",
  "not_in_stock",
  "wrong_product",
]);
const ELIGIBILITY = new Set([
  "publishable",
  "unmarked",
  "no_reward",
  "out_of_stock",
  "unavailable",
  "error",
]);
const FORBIDDEN_KEYS = /^(?:authorization|oauth|oauth_token|api_?key|access_?token|refresh_?token|client_?secret|secret|token)$/i;
const FORBIDDEN_VALUE_PATTERNS = [
  /\b(?:OAuth|Bearer)\s+[A-Za-z0-9._~+\/-]{8,}/i,
  /\by0_[A-Za-z0-9_-]{12,}\b/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
];
const MARKET_IMAGE_HOST = "avatars.mds.yandex.net";
const MAX_PREVIOUS_OFFER_AGE_MS = 48 * 60 * 60 * 1000;
export const MARKET_AFFILIATE_ENDPOINT =
  "https://api.content.market.yandex.ru/v3/affiliate/partner/link/create";

export class AffiliateValidationError extends Error {
  constructor(issues) {
    super(`Affiliate data validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "AffiliateValidationError";
    this.issues = issues;
  }
}

function normalizeIdentityText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function marketTitleMatchesExpected(title, expectedTokens) {
  const normalizedTitle = ` ${normalizeIdentityText(title)} `;
  return (
    normalizedTitle.trim().length > 0 &&
    Array.isArray(expectedTokens) &&
    expectedTokens.length > 0 &&
    expectedTokens.every((token) => {
      const normalizedToken = normalizeIdentityText(token);
      return normalizedToken.length >= 2 && normalizedTitle.includes(` ${normalizedToken} `);
    })
  );
}

export function buildMarketAffiliateRequestUrl(card) {
  const url = new URL(MARKET_AFFILIATE_ENDPOINT);
  url.searchParams.set("url", card.market_source_url);
  url.searchParams.set("clid", card.clid);
  url.searchParams.set("vid", card.vid);
  url.searchParams.set("format", "json");
  if (card.compliance_mode === "advertising" && card.creative?.erid) {
    url.searchParams.set("erid", card.creative.erid);
  }
  return url;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(issues, location, message) {
  issues.push(`${location}: ${message}`);
}

function exactKeys(value, required, location, issues) {
  if (!isObject(value)) {
    add(issues, location, "must be an object");
    return false;
  }
  const allowed = new Set(required);
  for (const key of required) {
    if (!(key in value)) add(issues, location, `missing key ${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add(issues, location, `unexpected key ${key}`);
  }
  return true;
}

function isIsoDate(value) {
  return (
    typeof value === "string" &&
    ISO_DATE_RE.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isNullableInteger(value) {
  return value === null || (Number.isInteger(value) && value >= 0);
}

function parseHttpsUrl(value, location, issues) {
  if (typeof value !== "string") {
    add(issues, location, "must be a string URL");
    return null;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    add(issues, location, "must be a valid URL");
    return null;
  }
  if (url.protocol !== "https:") add(issues, location, "must use HTTPS");
  if (url.username || url.password) {
    add(issues, location, "must not contain URL credentials");
  }
  for (const key of url.searchParams.keys()) {
    if (FORBIDDEN_KEYS.test(key)) {
      add(issues, location, `must not contain sensitive query parameter ${key}`);
    }
  }
  return url;
}

function isExampleHost(hostname) {
  return hostname === "example.invalid" || hostname.endsWith(".example.invalid");
}

function validateHost(url, kind, allowExampleHosts, location, issues) {
  if (!url) return;
  if (allowExampleHosts) {
    if (!isExampleHost(url.hostname)) {
      add(issues, location, "fixture mode accepts only example.invalid hosts");
    }
    return;
  }
  if (url.hostname !== "market.yandex.ru") {
    add(issues, location, `${kind} host must be market.yandex.ru`);
  }
  if (kind === "source" && !url.pathname.startsWith("/card/")) {
    add(issues, location, "source URL must point to a /card/ page");
  }
  if (kind === "source") {
    const referralParameters = [
      "clid",
      "mclid",
      "vid",
      "erid",
      "cpa",
      "refid",
    ];
    for (const key of url.searchParams.keys()) {
      if (referralParameters.includes(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        add(issues, location, `source URL must not contain referral parameter ${key}`);
      }
    }
    if (url.hash) add(issues, location, "source URL must not contain a fragment");
  }
}

function validateProductPhoto(value, allowExampleHosts, location, issues) {
  if (value === null) return null;
  const url = parseHttpsUrl(value, location, issues);
  if (!url) return null;
  if (allowExampleHosts) {
    if (!isExampleHost(url.hostname)) {
      add(issues, location, "fixture mode accepts only example.invalid image hosts");
    }
  } else if (url.hostname !== MARKET_IMAGE_HOST) {
    add(issues, location, `image host must be ${MARKET_IMAGE_HOST}`);
  }
  return url;
}

function scanForSecrets(value, location, issues) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanForSecrets(item, `${location}[${index}]`, issues),
    );
    return;
  }
  if (isObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.test(key)) {
        add(issues, `${location}.${key}`, "sensitive key is forbidden");
      }
      scanForSecrets(nested, `${location}.${key}`, issues);
    }
    return;
  }
  if (typeof value === "string") {
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        add(issues, location, "value looks like an authorization secret");
        break;
      }
    }
  }
}

function validateCreative(creative, complianceMode, location, issues) {
  if (complianceMode === "non_ad_storefront") {
    if (creative !== null) {
      add(issues, location, "non-ad storefront placement must have creative set to null");
    }
    return;
  }
  const keys = [
    "form",
    "content_revision",
    "erid",
    "registered_at",
    "disclosure",
  ];
  if (!exactKeys(creative, keys, location, issues)) return;
  if (!FORMS.has(creative.form)) add(issues, `${location}.form`, "unsupported form");
  if (
    typeof creative.content_revision !== "string" ||
    !REVISION_RE.test(creative.content_revision)
  ) {
    add(issues, `${location}.content_revision`, "invalid revision");
  }
  if (creative.erid !== null) {
    if (typeof creative.erid !== "string" || !ERID_RE.test(creative.erid)) {
      add(issues, `${location}.erid`, "invalid ERID");
    }
  }
  if (creative.registered_at !== null && !isIsoDate(creative.registered_at)) {
    add(issues, `${location}.registered_at`, "must be an ISO UTC timestamp or null");
  }
  if ((creative.erid === null) !== (creative.registered_at === null)) {
    add(issues, location, "erid and registered_at must both be present or both be null");
  }

  const disclosureLocation = `${location}.disclosure`;
  const disclosureKeys = ["label", "advertiser_name", "advertiser_inn"];
  if (!exactKeys(creative.disclosure, disclosureKeys, disclosureLocation, issues)) {
    return;
  }
  if (complianceMode === "advertising") {
    if (creative.disclosure.label !== AD_LABEL) {
      add(issues, `${disclosureLocation}.label`, `must equal ${AD_LABEL}`);
    }
    if (creative.disclosure.advertiser_name !== ADVERTISER_NAME) {
      add(
        issues,
        `${disclosureLocation}.advertiser_name`,
        `must equal ${ADVERTISER_NAME}`,
      );
    }
    if (creative.disclosure.advertiser_inn !== ADVERTISER_INN) {
      add(
        issues,
        `${disclosureLocation}.advertiser_inn`,
        `must equal ${ADVERTISER_INN}`,
      );
    }
  }
}

function validateAffiliateBinding(
  affiliateUrl,
  sourceUrl,
  offer,
  allowExampleHosts,
  location,
  issues,
) {
  if (!affiliateUrl || !sourceUrl) return;
  if (affiliateUrl.hash) {
    add(issues, location, "affiliate URL must not contain a fragment");
  }
  if (affiliateUrl.pathname !== sourceUrl.pathname) {
    add(issues, location, "affiliate path must match the configured Market card");
  }
  const clidValues = affiliateUrl.searchParams.getAll("clid");
  if (clidValues.length !== 1 || clidValues[0] !== offer.clid) {
    add(issues, location, "CLID query must match the configured clid");
  }
  const vidValues = affiliateUrl.searchParams.getAll("vid");
  if (vidValues.length !== 1 || vidValues[0] !== offer.vid) {
    add(issues, location, "VID query must match the configured vid");
  }
  if (affiliateUrl.searchParams.get("distr_type") !== "7") {
    add(issues, location, "distr_type query must equal 7");
  }
  if (affiliateUrl.searchParams.get("utm_source") !== "partner_network") {
    add(issues, location, "utm_source query must equal partner_network");
  }
  if (affiliateUrl.searchParams.get("utm_campaign") !== offer.clid) {
    add(issues, location, "utm_campaign query must match the configured clid");
  }

  const linkErids = affiliateUrl.searchParams.getAll("erid");
  if (offer.compliance_mode === "non_ad_storefront" && linkErids.length !== 0) {
    add(issues, location, "non-ad storefront link must not contain ERID");
  }
  if (
    offer.compliance_mode === "advertising" &&
    offer.creative?.erid &&
    (linkErids.length !== 1 || linkErids[0] !== offer.creative.erid)
  ) {
    add(issues, location, "ERID query must match creative.erid");
  }

  if (!allowExampleHosts && affiliateUrl.hostname !== sourceUrl.hostname) {
    add(issues, location, "affiliate destination must remain on the Market card host");
  }
}

function finish(issues) {
  if (issues.length) throw new AffiliateValidationError(issues);
}

export function validateSource(source, options = {}) {
  const { allowExampleHosts = false } = options;
  const issues = [];
  scanForSecrets(source, "$", issues);
  if (!exactKeys(source, ["schema_version", "cards"], "$", issues)) {
    finish(issues);
  }
  if (source.schema_version !== 2) add(issues, "$.schema_version", "must equal 2");
  if (!Array.isArray(source.cards)) {
    add(issues, "$.cards", "must be an array");
    finish(issues);
  }

  const ids = new Set();
  const vids = new Set();
  const urls = new Set();
  source.cards.forEach((card, index) => {
    const location = `$.cards[${index}]`;
    const keys = [
      "id",
      "market_source_url",
      "page_path",
      "entity_kind",
      "entity_id",
      "compliance_mode",
      "clid",
      "vid",
      "expected_title_tokens",
      "creative",
    ];
    if (!exactKeys(card, keys, location, issues)) return;
    if (typeof card.id !== "string" || !ID_RE.test(card.id)) {
      add(issues, `${location}.id`, "invalid stable ID");
    } else if (ids.has(card.id)) add(issues, `${location}.id`, "duplicate ID");
    else ids.add(card.id);

    const sourceUrl = parseHttpsUrl(
      card.market_source_url,
      `${location}.market_source_url`,
      issues,
    );
    validateHost(
      sourceUrl,
      "source",
      allowExampleHosts,
      `${location}.market_source_url`,
      issues,
    );
    if (sourceUrl) {
      const normalized = sourceUrl.toString();
      if (urls.has(normalized)) {
        add(issues, `${location}.market_source_url`, "duplicate source URL");
      } else urls.add(normalized);
    }

    if (typeof card.page_path !== "string" || !PAGE_PATH_RE.test(card.page_path)) {
      add(issues, `${location}.page_path`, "must be a lowercase trailing-slash path");
    }
    if (card.entity_kind !== "mount") {
      add(issues, `${location}.entity_kind`, "must equal mount");
    }
    if (typeof card.entity_id !== "string" || !ID_RE.test(card.entity_id)) {
      add(issues, `${location}.entity_id`, "invalid mount entity ID");
    } else if (card.page_path !== `/kronshteyny/${card.entity_id}/`) {
      add(issues, `${location}.page_path`, "must match the mount entity ID");
    }
    if (!COMPLIANCE_MODES.has(card.compliance_mode)) {
      add(issues, `${location}.compliance_mode`, "unsupported compliance mode");
    }
    if (typeof card.clid !== "string" || !/^\d{5,20}$/.test(card.clid)) {
      add(issues, `${location}.clid`, "must contain 5-20 digits");
    }
    if (typeof card.vid !== "string" || !VID_RE.test(card.vid)) {
      add(issues, `${location}.vid`, "must contain 1-150 Latin letters or digits");
    } else if (vids.has(card.vid)) add(issues, `${location}.vid`, "duplicate VID");
    else vids.add(card.vid);
    if (
      !Array.isArray(card.expected_title_tokens) ||
      card.expected_title_tokens.length < 1 ||
      card.expected_title_tokens.length > 6
    ) {
      add(issues, `${location}.expected_title_tokens`, "must contain 1-6 identity tokens");
    } else {
      const normalizedTokens = new Set();
      card.expected_title_tokens.forEach((token, tokenIndex) => {
        const normalized = normalizeIdentityText(token);
        if (typeof token !== "string" || token.trim().length > 80 || normalized.length < 2) {
          add(
            issues,
            `${location}.expected_title_tokens[${tokenIndex}]`,
            "must be a 2-80 character identity token",
          );
        } else if (normalizedTokens.has(normalized)) {
          add(
            issues,
            `${location}.expected_title_tokens[${tokenIndex}]`,
            "duplicate normalized identity token",
          );
        } else normalizedTokens.add(normalized);
      });
    }
    validateCreative(
      card.creative,
      card.compliance_mode,
      `${location}.creative`,
      issues,
    );
  });
  finish(issues);
  return source;
}

export function validateSourceAgainstMounts(source, mounts, options = {}) {
  validateSource(source, options);
  const issues = [];
  if (!Array.isArray(mounts)) {
    add(issues, "$.mounts", "must be an array");
    finish(issues);
  }

  const catalog = new Map();
  mounts.forEach((mount, index) => {
    const location = `$.mounts[${index}]`;
    if (!isObject(mount) || typeof mount.id !== "string" || !ID_RE.test(mount.id)) {
      add(issues, `${location}.id`, "invalid mount entity ID");
      return;
    }
    if (catalog.has(mount.id)) {
      add(issues, `${location}.id`, "duplicate catalog mount ID");
      return;
    }
    if (typeof mount.brand !== "string" || normalizeIdentityText(mount.brand).length < 2) {
      add(issues, `${location}.brand`, "catalog mount must have a stable brand");
    }
    if (typeof mount.model !== "string" || normalizeIdentityText(mount.model).length < 2) {
      add(issues, `${location}.model`, "catalog mount must have a stable model");
    }
    catalog.set(mount.id, mount);
  });

  source.cards.forEach((card, index) => {
    const location = `$.cards[${index}]`;
    const mount = catalog.get(card.entity_id);
    if (!mount) {
      add(issues, `${location}.entity_id`, "mount does not exist in data/mounts.json");
      return;
    }

    const configuredTokens = new Set(
      card.expected_title_tokens.map((token) => normalizeIdentityText(token)),
    );
    for (const [field, value] of [
      ["brand", mount.brand],
      ["model", mount.model],
    ]) {
      const requiredToken = normalizeIdentityText(value);
      if (!configuredTokens.has(requiredToken)) {
        add(
          issues,
          `${location}.expected_title_tokens`,
          `must include the exact catalog ${field} token ${JSON.stringify(value)}`,
        );
      }
    }
  });

  finish(issues);
  return source;
}

export function validateBatch(batch, options = {}) {
  const { allowExampleHosts = false } = options;
  const issues = [];
  scanForSecrets(batch, "$", issues);
  if (!exactKeys(batch, ["schema_version", "generated_at", "checks"], "$", issues)) {
    finish(issues);
  }
  if (batch.schema_version !== 2) add(issues, "$.schema_version", "must equal 2");
  if (!isIsoDate(batch.generated_at)) {
    add(issues, "$.generated_at", "must be an ISO UTC timestamp");
  }
  if (!Array.isArray(batch.checks)) {
    add(issues, "$.checks", "must be an array");
    finish(issues);
  }

  const ids = new Set();
  batch.checks.forEach((check, index) => {
    const location = `$.checks[${index}]`;
    const keys = [
      "id",
      "market_source_url",
      "compliance_mode",
      "clid",
      "vid",
      "status",
      "affiliate_href",
      "page_name",
      "title",
      "product_photo",
      "promise",
      "price",
      "stock",
      "checked_at",
      "error_code",
    ];
    if (!exactKeys(check, keys, location, issues)) return;
    if (typeof check.id !== "string" || !ID_RE.test(check.id)) {
      add(issues, `${location}.id`, "invalid stable ID");
    } else if (ids.has(check.id)) add(issues, `${location}.id`, "duplicate ID");
    else ids.add(check.id);

    if (!COMPLIANCE_MODES.has(check.compliance_mode)) {
      add(issues, `${location}.compliance_mode`, "unsupported compliance mode");
    }
    if (typeof check.clid !== "string" || !/^\d{5,20}$/.test(check.clid)) {
      add(issues, `${location}.clid`, "must contain 5-20 digits");
    }
    if (typeof check.vid !== "string" || !VID_RE.test(check.vid)) {
      add(issues, `${location}.vid`, "invalid VID");
    }

    const sourceUrl = parseHttpsUrl(
      check.market_source_url,
      `${location}.market_source_url`,
      issues,
    );
    validateHost(
      sourceUrl,
      "source",
      allowExampleHosts,
      `${location}.market_source_url`,
      issues,
    );
    let affiliateUrl = null;
    if (check.affiliate_href !== null) {
      affiliateUrl = parseHttpsUrl(
        check.affiliate_href,
        `${location}.affiliate_href`,
        issues,
      );
      validateHost(
        affiliateUrl,
        "affiliate",
        allowExampleHosts,
        `${location}.affiliate_href`,
        issues,
      );
    }
    const productPhoto = validateProductPhoto(
      check.product_photo,
      allowExampleHosts,
      `${location}.product_photo`,
      issues,
    );

    if (check.page_name !== null && check.page_name !== "POKUPKI_PRODUCT") {
      add(issues, `${location}.page_name`, "must be POKUPKI_PRODUCT or null");
    }
    if (check.title !== null && (typeof check.title !== "string" || !check.title.trim())) {
      add(issues, `${location}.title`, "must be a non-empty string or null");
    }

    if (!BATCH_STATUSES.has(check.status)) {
      add(issues, `${location}.status`, "unsupported status");
    }
    for (const field of ["promise", "price", "stock"]) {
      if (!isNullableInteger(check[field])) {
        add(issues, `${location}.${field}`, "must be a non-negative integer or null");
      }
    }
    if (!isIsoDate(check.checked_at)) {
      add(issues, `${location}.checked_at`, "must be an ISO UTC timestamp");
    }
    if (check.error_code !== null && !ERROR_CODES.has(check.error_code)) {
      add(issues, `${location}.error_code`, "unsupported sanitized error code");
    }

    if (check.status === "ok") {
      if (!affiliateUrl) add(issues, `${location}.affiliate_href`, "required for ok status");
      if (check.page_name !== "POKUPKI_PRODUCT") {
        add(issues, `${location}.page_name`, "required for ok status");
      }
      if (typeof check.title !== "string" || !check.title.trim()) {
        add(issues, `${location}.title`, "required for ok status");
      }
      if (!productPhoto) add(issues, `${location}.product_photo`, "required for ok status");
      for (const field of ["promise", "price", "stock"]) {
        if (!Number.isInteger(check[field])) {
          add(issues, `${location}.${field}`, "required for ok status");
        }
      }
      if (check.error_code !== null) {
        add(issues, `${location}.error_code`, "must be null for ok status");
      }
    } else {
      if (affiliateUrl) {
        add(issues, `${location}.affiliate_href`, "must be null unless status is ok");
      }
      if (check.error_code === null) {
        add(issues, `${location}.error_code`, "required when status is not ok");
      }
      if (check.status === "error") {
        for (const field of [
          "promise",
          "price",
          "stock",
          "page_name",
          "title",
          "product_photo",
        ]) {
          if (check[field] !== null) {
            add(issues, `${location}.${field}`, "must be null for error status");
          }
        }
      }
    }
  });
  finish(issues);
  return batch;
}

function expectedEligibility(offer) {
  if (offer.eligibility === "error" || offer.eligibility === "unavailable") {
    return offer.eligibility;
  }
  if (offer.compliance_mode === "advertising" && !offer.creative?.erid) {
    return "unmarked";
  }
  if (!Number.isInteger(offer.promise) || offer.promise <= 0) return "no_reward";
  if (!Number.isInteger(offer.stock) || offer.stock <= 0) return "out_of_stock";
  return "publishable";
}

function sameCreative(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canRetainPreviousOffer(card, offer, generatedAt) {
  if (!offer) return false;
  const generatedMs = Date.parse(generatedAt);
  const checkedMs = Date.parse(offer.checked_at);
  const age = generatedMs - checkedMs;
  return (
    Number.isFinite(generatedMs) &&
    Number.isFinite(checkedMs) &&
    age >= -5 * 60 * 1000 &&
    age <= MAX_PREVIOUS_OFFER_AGE_MS &&
    offer.id === card.id &&
    offer.market_source_url === card.market_source_url &&
    offer.page_path === card.page_path &&
    offer.entity_kind === card.entity_kind &&
    offer.entity_id === card.entity_id &&
    offer.compliance_mode === card.compliance_mode &&
    offer.clid === card.clid &&
    offer.vid === card.vid &&
    sameCreative(offer.creative, card.creative)
  );
}

export function validateSnapshot(snapshot, options = {}) {
  const { allowExampleHosts = false } = options;
  const issues = [];
  scanForSecrets(snapshot, "$", issues);
  if (!exactKeys(snapshot, ["schema_version", "generated_at", "offers"], "$", issues)) {
    finish(issues);
  }
  if (snapshot.schema_version !== 2) add(issues, "$.schema_version", "must equal 2");
  if (!isIsoDate(snapshot.generated_at)) {
    add(issues, "$.generated_at", "must be an ISO UTC timestamp");
  }
  if (!Array.isArray(snapshot.offers)) {
    add(issues, "$.offers", "must be an array");
    finish(issues);
  }

  const ids = new Set();
  snapshot.offers.forEach((offer, index) => {
    const location = `$.offers[${index}]`;
    const keys = [
      "id",
      "market_source_url",
      "page_path",
      "entity_kind",
      "entity_id",
      "compliance_mode",
      "clid",
      "vid",
      "affiliate_href",
      "page_name",
      "title",
      "product_photo",
      "promise",
      "price",
      "stock",
      "checked_at",
      "eligibility",
      "publishable",
      "creative",
    ];
    if (!exactKeys(offer, keys, location, issues)) return;
    if (typeof offer.id !== "string" || !ID_RE.test(offer.id)) {
      add(issues, `${location}.id`, "invalid stable ID");
    } else if (ids.has(offer.id)) add(issues, `${location}.id`, "duplicate ID");
    else ids.add(offer.id);

    const sourceUrl = parseHttpsUrl(
      offer.market_source_url,
      `${location}.market_source_url`,
      issues,
    );
    validateHost(
      sourceUrl,
      "source",
      allowExampleHosts,
      `${location}.market_source_url`,
      issues,
    );
    let affiliateUrl = null;
    if (offer.affiliate_href !== null) {
      affiliateUrl = parseHttpsUrl(
        offer.affiliate_href,
        `${location}.affiliate_href`,
        issues,
      );
      validateHost(
        affiliateUrl,
        "affiliate",
        allowExampleHosts,
        `${location}.affiliate_href`,
        issues,
      );
    }
    validateProductPhoto(
      offer.product_photo,
      allowExampleHosts,
      `${location}.product_photo`,
      issues,
    );
    if (offer.page_name !== null && offer.page_name !== "POKUPKI_PRODUCT") {
      add(issues, `${location}.page_name`, "must be POKUPKI_PRODUCT or null");
    }
    if (offer.title !== null && (typeof offer.title !== "string" || !offer.title.trim())) {
      add(issues, `${location}.title`, "must be a non-empty string or null");
    }
    if (typeof offer.page_path !== "string" || !PAGE_PATH_RE.test(offer.page_path)) {
      add(issues, `${location}.page_path`, "invalid page path");
    }
    if (offer.entity_kind !== "mount") {
      add(issues, `${location}.entity_kind`, "must equal mount");
    }
    if (typeof offer.entity_id !== "string" || !ID_RE.test(offer.entity_id)) {
      add(issues, `${location}.entity_id`, "invalid mount entity ID");
    } else if (offer.page_path !== `/kronshteyny/${offer.entity_id}/`) {
      add(issues, `${location}.page_path`, "must match the mount entity ID");
    }
    if (!COMPLIANCE_MODES.has(offer.compliance_mode)) {
      add(issues, `${location}.compliance_mode`, "unsupported compliance mode");
    }
    if (typeof offer.clid !== "string" || !/^\d{5,20}$/.test(offer.clid)) {
      add(issues, `${location}.clid`, "must contain 5-20 digits");
    }
    if (typeof offer.vid !== "string" || !VID_RE.test(offer.vid)) {
      add(issues, `${location}.vid`, "invalid VID");
    }
    for (const field of ["promise", "price", "stock"]) {
      if (!isNullableInteger(offer[field])) {
        add(issues, `${location}.${field}`, "must be a non-negative integer or null");
      }
    }
    if (!isIsoDate(offer.checked_at)) {
      add(issues, `${location}.checked_at`, "must be an ISO UTC timestamp");
    }
    if (!ELIGIBILITY.has(offer.eligibility)) {
      add(issues, `${location}.eligibility`, "unsupported eligibility");
    }
    if (typeof offer.publishable !== "boolean") {
      add(issues, `${location}.publishable`, "must be boolean");
    }
    validateCreative(
      offer.creative,
      offer.compliance_mode,
      `${location}.creative`,
      issues,
    );

    const expected = expectedEligibility(offer);
    if (ELIGIBILITY.has(offer.eligibility) && offer.eligibility !== expected) {
      add(issues, `${location}.eligibility`, `must be ${expected} for these values`);
    }
    if (offer.publishable !== (offer.eligibility === "publishable")) {
      add(issues, `${location}.publishable`, "must match publishable eligibility");
    }
    if (offer.publishable) {
      if (!affiliateUrl) {
        add(issues, `${location}.affiliate_href`, "required for publishable offer");
      } else {
        validateAffiliateBinding(
          affiliateUrl,
          sourceUrl,
          offer,
          allowExampleHosts,
          `${location}.affiliate_href`,
          issues,
        );
      }
      if (
        offer.page_name !== "POKUPKI_PRODUCT" ||
        typeof offer.title !== "string" ||
        !offer.title.trim() ||
        typeof offer.product_photo !== "string"
      ) {
        add(issues, location, "publishable offer requires product identity and photo");
      }
    } else if (offer.affiliate_href !== null) {
      add(issues, `${location}.affiliate_href`, "must be null for non-publishable offer");
    }
  });
  finish(issues);
  return snapshot;
}

export function validatePublicSnapshot(snapshot, options = {}) {
  const issues = [];
  scanForSecrets(snapshot, "$", issues);
  if (!exactKeys(snapshot, ["schema_version", "generated_at", "offers"], "$", issues)) {
    finish(issues);
  }
  if (!Array.isArray(snapshot.offers)) {
    add(issues, "$.offers", "must be an array");
    finish(issues);
  }

  const publicOfferKeys = [
    "id",
    "market_source_url",
    "page_path",
    "entity_kind",
    "entity_id",
    "compliance_mode",
    "clid",
    "vid",
    "affiliate_href",
    "page_name",
    "title",
    "product_photo",
    "checked_at",
    "eligibility",
    "publishable",
    "creative",
  ];
  snapshot.offers.forEach((offer, index) => {
    const location = `$.offers[${index}]`;
    if (!exactKeys(offer, publicOfferKeys, location, issues)) return;
    if (offer.eligibility !== "publishable") {
      add(issues, `${location}.eligibility`, "public data may contain only publishable offers");
    }
    if (offer.publishable !== true) {
      add(issues, `${location}.publishable`, "public data may contain only publishable offers");
    }
  });
  finish(issues);

  // Reuse the stricter decision-snapshot validation for identity, URL,
  // freshness inputs and advertising disclosure. Synthetic positive values
  // never leave this function; exactKeys above guarantees that the private
  // decision inputs are absent from the public object itself.
  validateSnapshot(
    {
      ...snapshot,
      offers: snapshot.offers.map((offer) => ({
        ...offer,
        promise: 1,
        price: 0,
        stock: 1,
      })),
    },
    options,
  );
  return snapshot;
}

export function buildPublicSnapshot(snapshot, options = {}) {
  const validated = validateSnapshot(snapshot, options);
  const publicSnapshot = {
    schema_version: validated.schema_version,
    generated_at: validated.generated_at,
    offers: validated.offers
      .filter((offer) => offer.publishable)
      .map((offer) => {
        const publicOffer = structuredClone(offer);
        delete publicOffer.promise;
        delete publicOffer.price;
        delete publicOffer.stock;
        return publicOffer;
      }),
  };
  return validatePublicSnapshot(publicSnapshot, options);
}

export function buildSnapshot(source, batch, options = {}) {
  validateSource(source, options);
  if (!options.allowExampleHosts) {
    validateSourceAgainstMounts(source, options.catalogMounts, options);
  }
  validateBatch(batch, options);

  const checks = new Map(batch.checks.map((check) => [check.id, check]));
  const sourceIds = new Set(source.cards.map((card) => card.id));
  const issues = [];
  for (const id of checks.keys()) {
    if (!sourceIds.has(id)) add(issues, `$.checks.${id}`, "not present in source manifest");
  }
  for (const card of source.cards) {
    if (!checks.has(card.id)) add(issues, `$.cards.${card.id}`, "missing check result");
  }
  finish(issues);

  const offers = source.cards.map((card) => {
    const check = checks.get(card.id);
    const bindingIssues = [];
    for (const field of ["market_source_url", "compliance_mode", "clid", "vid"]) {
      if (check[field] !== card[field]) {
        add(
          bindingIssues,
          `$.checks.${card.id}.${field}`,
          "does not match source manifest",
        );
      }
    }
    if (check.status === "ok") {
      const sourceUrl = parseHttpsUrl(
        card.market_source_url,
        `$.cards.${card.id}.market_source_url`,
        bindingIssues,
      );
      const affiliateUrl = parseHttpsUrl(
        check.affiliate_href,
        `$.checks.${card.id}.affiliate_href`,
        bindingIssues,
      );
      validateAffiliateBinding(
        affiliateUrl,
        sourceUrl,
        card,
        options.allowExampleHosts ?? false,
        `$.checks.${card.id}.affiliate_href`,
        bindingIssues,
      );
      if (!marketTitleMatchesExpected(check.title, card.expected_title_tokens)) {
        add(
          bindingIssues,
          `$.checks.${card.id}.title`,
          "does not match the configured catalog identity",
        );
      }
    }
    finish(bindingIssues);

    let eligibility;
    if (check.status === "error") eligibility = "error";
    else if (check.status === "unavailable") eligibility = "unavailable";
    else if (card.compliance_mode === "advertising" && !card.creative?.erid) {
      eligibility = "unmarked";
    }
    else if (check.promise <= 0) eligibility = "no_reward";
    else if (check.stock <= 0) eligibility = "out_of_stock";
    else eligibility = "publishable";

    const publishable = eligibility === "publishable";
    return {
      id: card.id,
      market_source_url: card.market_source_url,
      page_path: card.page_path,
      entity_kind: card.entity_kind,
      entity_id: card.entity_id,
      compliance_mode: card.compliance_mode,
      clid: card.clid,
      vid: card.vid,
      affiliate_href: publishable ? check.affiliate_href : null,
      page_name: check.page_name,
      title: check.title,
      product_photo: check.product_photo,
      promise: check.promise,
      price: check.price,
      stock: check.stock,
      checked_at: check.checked_at,
      eligibility,
      publishable,
      creative: card.creative === null ? null : { ...card.creative },
    };
  });

  let snapshot = {
    schema_version: 2,
    generated_at: batch.generated_at,
    offers,
  };
  if (options.previousPrivateSnapshot) {
    const previous = validateSnapshot(options.previousPrivateSnapshot, options);
    const previousById = new Map(previous.offers.map((offer) => [offer.id, offer]));
    const mergedOffers = snapshot.offers.map((offer, index) => {
      if (offer.eligibility !== "error") return offer;
      const card = source.cards[index];
      const previousOffer = previousById.get(card.id);
      return canRetainPreviousOffer(card, previousOffer, batch.generated_at)
        ? structuredClone(previousOffer)
        : offer;
    });
    const unchanged =
      mergedOffers.length === previous.offers.length &&
      JSON.stringify(mergedOffers) === JSON.stringify(previous.offers);
    snapshot = {
      schema_version: 2,
      generated_at: unchanged ? previous.generated_at : batch.generated_at,
      offers: mergedOffers,
    };
  }
  validateSnapshot(snapshot, options);
  return snapshot;
}

export async function readJson(file) {
  const raw = await readFile(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${file}: invalid JSON: ${error.message}`);
  }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(file, 0o600);
}
