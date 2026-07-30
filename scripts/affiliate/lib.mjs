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
const BATCH_STATUSES = new Set(["ok", "unavailable", "error"]);
const ERROR_CODES = new Set([
  "http_error",
  "api_error",
  "invalid_payload",
  "not_rewarded",
  "not_in_stock",
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

export class AffiliateValidationError extends Error {
  constructor(issues) {
    super(`Affiliate data validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "AffiliateValidationError";
    this.issues = issues;
  }
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

function validateCreative(creative, location, issues) {
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
  if (source.schema_version !== 1) add(issues, "$.schema_version", "must equal 1");
  if (!Array.isArray(source.cards)) {
    add(issues, "$.cards", "must be an array");
    finish(issues);
  }

  const ids = new Set();
  const vids = new Set();
  const urls = new Set();
  source.cards.forEach((card, index) => {
    const location = `$.cards[${index}]`;
    const keys = ["id", "market_source_url", "page_path", "vid", "creative"];
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
    if (typeof card.vid !== "string" || !VID_RE.test(card.vid)) {
      add(issues, `${location}.vid`, "must contain 1-150 Latin letters or digits");
    } else if (vids.has(card.vid)) add(issues, `${location}.vid`, "duplicate VID");
    else vids.add(card.vid);
    validateCreative(card.creative, `${location}.creative`, issues);
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
  if (batch.schema_version !== 1) add(issues, "$.schema_version", "must equal 1");
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
      "status",
      "affiliate_href",
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
        for (const field of ["promise", "price", "stock"]) {
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
  if (!offer.creative.erid) return "unmarked";
  if (!Number.isInteger(offer.promise) || offer.promise <= 0) return "no_reward";
  if (!Number.isInteger(offer.stock) || offer.stock <= 0) return "out_of_stock";
  return "publishable";
}

export function validateSnapshot(snapshot, options = {}) {
  const { allowExampleHosts = false } = options;
  const issues = [];
  scanForSecrets(snapshot, "$", issues);
  if (!exactKeys(snapshot, ["schema_version", "generated_at", "offers"], "$", issues)) {
    finish(issues);
  }
  if (snapshot.schema_version !== 1) add(issues, "$.schema_version", "must equal 1");
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
      "vid",
      "affiliate_href",
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
    if (typeof offer.page_path !== "string" || !PAGE_PATH_RE.test(offer.page_path)) {
      add(issues, `${location}.page_path`, "invalid page path");
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
    validateCreative(offer.creative, `${location}.creative`, issues);

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
      } else if (affiliateUrl.searchParams.get("erid") !== offer.creative.erid) {
        add(issues, `${location}.affiliate_href`, "ERID query must match creative.erid");
      }
    } else if (offer.affiliate_href !== null) {
      add(issues, `${location}.affiliate_href`, "must be null for non-publishable offer");
    }
  });
  finish(issues);
  return snapshot;
}

export function buildSnapshot(source, batch, options = {}) {
  validateSource(source, options);
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
    if (check.market_source_url !== card.market_source_url) {
      throw new AffiliateValidationError([
        `$.checks.${card.id}.market_source_url: does not match source manifest`,
      ]);
    }

    let eligibility;
    if (check.status === "error") eligibility = "error";
    else if (check.status === "unavailable") eligibility = "unavailable";
    else if (!card.creative.erid) eligibility = "unmarked";
    else if (check.promise <= 0) eligibility = "no_reward";
    else if (check.stock <= 0) eligibility = "out_of_stock";
    else eligibility = "publishable";

    const publishable = eligibility === "publishable";
    return {
      id: card.id,
      market_source_url: card.market_source_url,
      page_path: card.page_path,
      vid: card.vid,
      affiliate_href: publishable ? check.affiliate_href : null,
      promise: check.promise,
      price: check.price,
      stock: check.stock,
      checked_at: check.checked_at,
      eligibility,
      publishable,
      creative: { ...card.creative },
    };
  });

  const snapshot = {
    schema_version: 1,
    generated_at: batch.generated_at,
    offers,
  };
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
