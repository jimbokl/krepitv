import { createHash } from "node:crypto";

import {
  buildPublicSnapshot,
  buildSnapshot,
  validateBatch,
  validatePublicSnapshot,
  validateSnapshot,
  validateSource,
  validateSourceAgainstMounts,
} from "./lib.mjs";

const ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const MODEL_PATH_RE = /^\/modeli\/[a-z0-9][a-z0-9-]{2,79}\/$/;
const VID_RE = /^[A-Za-z0-9]{1,150}$/;
const CLID_RE = /^\d{5,20}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export const MODEL_PLACEMENT_SCHEMA_VERSION = 1;
export const MODEL_PLACEMENT_LIMIT = 3;
export const LOAD_SAFETY_FACTOR = 1.25;

export class ModelPlacementValidationError extends Error {
  constructor(issues) {
    super(`Model placement validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "ModelPlacementValidationError";
    this.issues = issues;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(issues, location, message) {
  issues.push(`${location}: ${message}`);
}

function exactKeys(value, keys, location, issues) {
  if (!isObject(value)) {
    add(issues, location, "must be an object");
    return false;
  }
  const expected = new Set(keys);
  for (const key of keys) {
    if (!(key in value)) add(issues, location, `missing key ${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) add(issues, location, `unexpected key ${key}`);
  }
  return true;
}

function finish(issues) {
  if (issues.length) throw new ModelPlacementValidationError(issues);
}

function isIsoDate(value) {
  return (
    typeof value === "string" &&
    ISO_DATE_RE.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function compareRustStrings(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function expectedModelPath(modelId) {
  return `/modeli/${modelId}/`;
}

function flattenedManifest(manifest) {
  return manifest.models.flatMap((model) =>
    model.placements.map((placement) => ({
      ...placement,
      model_id: model.model_id,
      model_path: model.model_path,
    })),
  );
}

function validateCatalogOptions(source, { allowExampleHosts = false, catalogMounts }) {
  validateSource(source, { allowExampleHosts });
  if (!allowExampleHosts) {
    validateSourceAgainstMounts(source, catalogMounts, { allowExampleHosts });
  }
}

function validateCatalogInputs(models, catalogMounts, issues) {
  if (!Array.isArray(models)) {
    add(issues, "$.catalog.models", "must be an array");
  }
  if (!Array.isArray(catalogMounts)) {
    add(issues, "$.catalog.mounts", "must be an array");
  }
  if (!Array.isArray(models) || !Array.isArray(catalogMounts)) return;

  const modelIds = new Set();
  models.forEach((model, index) => {
    const location = `$.catalog.models[${index}]`;
    if (!isObject(model)) {
      add(issues, location, "must be an object");
      return;
    }
    if (typeof model.id !== "string" || !ID_RE.test(model.id)) {
      add(issues, `${location}.id`, "invalid model ID");
    } else if (modelIds.has(model.id)) {
      add(issues, `${location}.id`, "duplicate model ID");
    } else modelIds.add(model.id);
    if (!Number.isFinite(model.weight_kg) || model.weight_kg <= 0) {
      add(issues, `${location}.weight_kg`, "must be a positive finite number");
    }
    if (!Number.isFinite(model.diagonal_inches) || model.diagonal_inches <= 0) {
      add(issues, `${location}.diagonal_inches`, "must be a positive finite number");
    }
    for (const field of ["vesa_width_mm", "vesa_height_mm"]) {
      if (!Number.isInteger(model[field]) || model[field] <= 0) {
        add(issues, `${location}.${field}`, "must be a positive integer");
      }
    }
  });

  const mountIds = new Set();
  catalogMounts.forEach((mount, index) => {
    const location = `$.catalog.mounts[${index}]`;
    if (!isObject(mount)) {
      add(issues, location, "must be an object");
      return;
    }
    if (typeof mount.id !== "string" || !ID_RE.test(mount.id)) {
      add(issues, `${location}.id`, "invalid mount ID");
    } else if (mountIds.has(mount.id)) {
      add(issues, `${location}.id`, "duplicate mount ID");
    } else mountIds.add(mount.id);
    if (typeof mount.title !== "string" || !mount.title.trim()) {
      add(issues, `${location}.title`, "must be a non-empty string");
    }
    if (!Array.isArray(mount.vesa) || mount.vesa.some((item) => typeof item !== "string")) {
      add(issues, `${location}.vesa`, "must be an array of strings");
    }
    for (const field of ["max_load_kg", "min_diagonal_in", "max_diagonal_in"]) {
      if (!Number.isFinite(mount[field]) || mount[field] <= 0) {
        add(issues, `${location}.${field}`, "must be a positive finite number");
      }
    }
    if (
      Number.isFinite(mount.min_diagonal_in) &&
      Number.isFinite(mount.max_diagonal_in) &&
      mount.min_diagonal_in > mount.max_diagonal_in
    ) {
      add(issues, location, "minimum diagonal must not exceed maximum diagonal");
    }
  });
}

function prioritizedSourceCards(source) {
  const byEntity = new Map();
  for (const card of source.cards) {
    const existing = byEntity.get(card.entity_id) ?? [];
    existing.push(card);
    byEntity.set(card.entity_id, existing);
  }
  return byEntity;
}

function rustScore(model, mount) {
  const requiredLoadKg = model.weight_kg * LOAD_SAFETY_FACTOR;
  let score = 100;
  score += Math.trunc(Math.min(mount.max_load_kg - requiredLoadKg, 20) / 2);
  if (
    model.diagonal_inches < mount.min_diagonal_in ||
    model.diagonal_inches > mount.max_diagonal_in
  ) {
    score -= 12;
  }
  return score;
}

function sourceBackedCompatibility(model, mount, sourceCard) {
  const requestedVesa = `${model.vesa_width_mm}x${model.vesa_height_mm}`;
  const requiredLoadKg = model.weight_kg * LOAD_SAFETY_FACTOR;
  const compatible =
    mount.vesa.includes(requestedVesa) &&
    mount.max_load_kg + Number.EPSILON >= requiredLoadKg &&
    model.diagonal_inches >= mount.min_diagonal_in &&
    model.diagonal_inches <= mount.max_diagonal_in;
  if (!compatible) return null;
  return {
    entity_id: mount.id,
    source_card_id: sourceCard.id,
    score: rustScore(model, mount),
    fit_status: "verified-fit",
    required_load_kg: Math.round(requiredLoadKg * 10) / 10,
  };
}

export function selectModelPlacementCandidates(
  model,
  { source, catalogMounts, limit = MODEL_PLACEMENT_LIMIT } = {},
) {
  const issues = [];
  validateCatalogInputs([model], catalogMounts, issues);
  if (!isObject(source) || !Array.isArray(source.cards)) {
    add(issues, "$.source", "must be a standard affiliate source manifest");
  }
  if (!Number.isInteger(limit) || limit < 0 || limit > MODEL_PLACEMENT_LIMIT) {
    add(issues, "$.limit", `must be an integer from 0 to ${MODEL_PLACEMENT_LIMIT}`);
  }
  finish(issues);

  // Source manifest order is an explicit editorial priority: the first card
  // for an entity is the same primary offer the existing storefront selects.
  const sourceCards = prioritizedSourceCards(source);
  return catalogMounts
    .map((mount) => {
      const sourceCard = sourceCards.get(mount.id)?.[0];
      return sourceCard
        ? sourceBackedCompatibility(model, mount, sourceCard)
        : null;
    })
    .filter(Boolean)
    .sort((left, right) =>
      right.score - left.score ||
      compareRustStrings(
        catalogMounts.find((mount) => mount.id === left.entity_id).title,
        catalogMounts.find((mount) => mount.id === right.entity_id).title,
      ) ||
      compareRustStrings(left.entity_id, right.entity_id) ||
      compareRustStrings(left.source_card_id, right.source_card_id),
    )
    .slice(0, limit);
}

export function modelPlacementId(modelId, rank, entityId) {
  return `model-${modelId}-r${String(rank).padStart(2, "0")}-${entityId}`;
}

export function modelPlacementVid(modelId, rank, entityId) {
  const placementId = modelPlacementId(modelId, rank, entityId);
  const readable = placementId.replace(/[^A-Za-z0-9]/g, "");
  const digest = createHash("sha256").update(placementId, "utf8").digest("hex").slice(0, 12);
  return `krepitv${readable}${digest}`;
}

export function generateModelPlacementManifest({
  source,
  models,
  catalogMounts,
  allowExampleHosts = false,
} = {}) {
  const issues = [];
  if (!isObject(source) || !Array.isArray(source.cards) || source.cards.length === 0) {
    add(issues, "$.source", "must contain at least one affiliate card");
    finish(issues);
  }
  validateCatalogInputs(models, catalogMounts, issues);
  finish(issues);
  validateCatalogOptions(source, { allowExampleHosts, catalogMounts });

  const clids = new Set(source.cards.map((card) => card.clid));
  if (clids.size !== 1 || !CLID_RE.test([...clids][0] ?? "")) {
    throw new ModelPlacementValidationError([
      "$.source.cards: every source card must use one shared valid CLID",
    ]);
  }
  const clid = [...clids][0];
  const orderedModels = [...models].sort((left, right) => compareRustStrings(left.id, right.id));
  const modelEntries = orderedModels.map((model) => {
    const candidates = selectModelPlacementCandidates(model, { source, catalogMounts });
    const placements = candidates.map((candidate, index) => {
      const rank = index + 1;
      return {
        placement_id: modelPlacementId(model.id, rank, candidate.entity_id),
        rank,
        entity_id: candidate.entity_id,
        source_card_id: candidate.source_card_id,
        vid: modelPlacementVid(model.id, rank, candidate.entity_id),
      };
    });
    return {
      model_id: model.id,
      model_path: expectedModelPath(model.id),
      expected_offer_count: placements.length,
      placements,
    };
  });
  const manifest = {
    schema_version: MODEL_PLACEMENT_SCHEMA_VERSION,
    clid,
    expected_offer_count: modelEntries.reduce(
      (total, model) => total + model.expected_offer_count,
      0,
    ),
    models: modelEntries,
  };
  return validateModelPlacementManifest(manifest, {
    source,
    models,
    catalogMounts,
    allowExampleHosts,
  });
}

export function validateModelPlacementManifest(
  manifest,
  { source, models, catalogMounts, allowExampleHosts = false } = {},
) {
  const issues = [];
  if (!exactKeys(
    manifest,
    ["schema_version", "clid", "expected_offer_count", "models"],
    "$",
    issues,
  )) {
    finish(issues);
  }
  if (manifest.schema_version !== MODEL_PLACEMENT_SCHEMA_VERSION) {
    add(issues, "$.schema_version", `must equal ${MODEL_PLACEMENT_SCHEMA_VERSION}`);
  }
  if (typeof manifest.clid !== "string" || !CLID_RE.test(manifest.clid)) {
    add(issues, "$.clid", "must contain 5-20 digits");
  }
  if (!Number.isInteger(manifest.expected_offer_count) || manifest.expected_offer_count < 0) {
    add(issues, "$.expected_offer_count", "must be a non-negative integer");
  }
  if (!Array.isArray(manifest.models)) {
    add(issues, "$.models", "must be an array");
    finish(issues);
  }
  if (!isObject(source) || !Array.isArray(source.cards)) {
    add(issues, "$.source", "must be a standard affiliate source manifest");
  }
  validateCatalogInputs(models, catalogMounts, issues);
  finish(issues);
  validateCatalogOptions(source, { allowExampleHosts, catalogMounts });

  source.cards.forEach((card, index) => {
    if (card.clid !== manifest.clid) {
      add(
        issues,
        `$.source.cards[${index}].clid`,
        "every source card CLID must match manifest.clid",
      );
    }
  });

  const modelById = new Map(models.map((model) => [model.id, model]));
  const mountById = new Map(catalogMounts.map((mount) => [mount.id, mount]));
  const sourceById = new Map(source.cards.map((card) => [card.id, card]));
  const baseIds = new Set(source.cards.map((card) => card.id));
  const baseVids = new Set(source.cards.map((card) => card.vid));
  const orderedModelIds = [...modelById.keys()].sort(compareRustStrings);
  const seenModelIds = new Set();
  const seenModelPaths = new Set();
  const placementIds = new Set();
  const placementVids = new Set();
  let actualOfferCount = 0;
  let declaredOfferCount = 0;

  if (manifest.models.length !== models.length) {
    add(issues, "$.models", "must contain every catalog model exactly once");
  }

  manifest.models.forEach((modelEntry, modelIndex) => {
    const location = `$.models[${modelIndex}]`;
    if (!exactKeys(
      modelEntry,
      ["model_id", "model_path", "expected_offer_count", "placements"],
      location,
      issues,
    )) return;

    if (typeof modelEntry.model_id !== "string" || !ID_RE.test(modelEntry.model_id)) {
      add(issues, `${location}.model_id`, "invalid model ID");
    } else if (seenModelIds.has(modelEntry.model_id)) {
      add(issues, `${location}.model_id`, "duplicate model ID");
    } else seenModelIds.add(modelEntry.model_id);
    if (modelEntry.model_id !== orderedModelIds[modelIndex]) {
      add(issues, `${location}.model_id`, "models must be in deterministic ID order");
    }

    if (typeof modelEntry.model_path !== "string" || !MODEL_PATH_RE.test(modelEntry.model_path)) {
      add(issues, `${location}.model_path`, "must be a lowercase model path with trailing slash");
    } else if (seenModelPaths.has(modelEntry.model_path)) {
      add(issues, `${location}.model_path`, "duplicate model path");
    } else seenModelPaths.add(modelEntry.model_path);
    if (modelEntry.model_path !== expectedModelPath(modelEntry.model_id)) {
      add(issues, `${location}.model_path`, "must match model_id");
    }

    const catalogModel = modelById.get(modelEntry.model_id);
    if (!catalogModel) {
      add(issues, `${location}.model_id`, "does not reference a catalog model");
    }
    if (
      !Number.isInteger(modelEntry.expected_offer_count) ||
      modelEntry.expected_offer_count < 0 ||
      modelEntry.expected_offer_count > MODEL_PLACEMENT_LIMIT
    ) {
      add(
        issues,
        `${location}.expected_offer_count`,
        `must be an integer from 0 to ${MODEL_PLACEMENT_LIMIT}`,
      );
    } else declaredOfferCount += modelEntry.expected_offer_count;

    if (!Array.isArray(modelEntry.placements)) {
      add(issues, `${location}.placements`, "must be an array");
      return;
    }
    actualOfferCount += modelEntry.placements.length;
    if (modelEntry.placements.length !== modelEntry.expected_offer_count) {
      add(issues, `${location}.placements`, "length must equal expected_offer_count");
    }

    const expectedCandidates = catalogModel
      ? selectModelPlacementCandidates(catalogModel, { source, catalogMounts })
      : [];
    if (modelEntry.placements.length !== expectedCandidates.length) {
      add(issues, `${location}.placements`, "must contain the exact top compatible source-backed mounts");
    }
    const seenEntities = new Set();
    const seenRanks = new Set();
    modelEntry.placements.forEach((placement, placementIndex) => {
      const placementLocation = `${location}.placements[${placementIndex}]`;
      if (!exactKeys(
        placement,
        ["placement_id", "rank", "entity_id", "source_card_id", "vid"],
        placementLocation,
        issues,
      )) return;

      if (typeof placement.placement_id !== "string" || !ID_RE.test(placement.placement_id)) {
        add(issues, `${placementLocation}.placement_id`, "invalid placement ID");
      } else if (placementIds.has(placement.placement_id) || baseIds.has(placement.placement_id)) {
        add(issues, `${placementLocation}.placement_id`, "duplicate or base-colliding placement ID");
      } else placementIds.add(placement.placement_id);

      if (!Number.isInteger(placement.rank) || placement.rank < 1 || placement.rank > MODEL_PLACEMENT_LIMIT) {
        add(issues, `${placementLocation}.rank`, `must be an integer from 1 to ${MODEL_PLACEMENT_LIMIT}`);
      } else if (seenRanks.has(placement.rank)) {
        add(issues, `${placementLocation}.rank`, "duplicate rank in model");
      } else seenRanks.add(placement.rank);
      if (placement.rank !== placementIndex + 1) {
        add(issues, `${placementLocation}.rank`, "placements must be ordered contiguously from rank 1");
      }

      if (typeof placement.entity_id !== "string" || !ID_RE.test(placement.entity_id)) {
        add(issues, `${placementLocation}.entity_id`, "invalid mount entity ID");
      } else if (seenEntities.has(placement.entity_id)) {
        add(issues, `${placementLocation}.entity_id`, "duplicate entity in model");
      } else seenEntities.add(placement.entity_id);
      if (!mountById.has(placement.entity_id)) {
        add(issues, `${placementLocation}.entity_id`, "does not reference a catalog mount");
      }

      if (typeof placement.source_card_id !== "string" || !ID_RE.test(placement.source_card_id)) {
        add(issues, `${placementLocation}.source_card_id`, "invalid source card ID");
      }
      const sourceCard = sourceById.get(placement.source_card_id);
      if (!sourceCard) {
        add(issues, `${placementLocation}.source_card_id`, "does not reference a source card");
      } else {
        if (sourceCard.entity_id !== placement.entity_id) {
          add(issues, `${placementLocation}.entity_id`, "must match the source card entity");
        }
        if (sourceCard.clid !== manifest.clid) {
          add(issues, `${placementLocation}.source_card_id`, "source card CLID must match manifest.clid");
        }
      }

      if (typeof placement.vid !== "string" || !VID_RE.test(placement.vid)) {
        add(issues, `${placementLocation}.vid`, "must contain 1-150 Latin letters or digits");
      } else if (placementVids.has(placement.vid) || baseVids.has(placement.vid)) {
        add(issues, `${placementLocation}.vid`, "duplicate or base-colliding VID");
      } else placementVids.add(placement.vid);

      const expected = expectedCandidates[placementIndex];
      if (expected) {
        if (placement.entity_id !== expected.entity_id) {
          add(issues, `${placementLocation}.entity_id`, "must match Rust score ordering");
        }
        if (placement.source_card_id !== expected.source_card_id) {
          add(issues, `${placementLocation}.source_card_id`, "must match the canonical source card");
        }
        const expectedId = modelPlacementId(modelEntry.model_id, placementIndex + 1, expected.entity_id);
        if (placement.placement_id !== expectedId) {
          add(issues, `${placementLocation}.placement_id`, "must match the deterministic placement ID");
        }
        const expectedVid = modelPlacementVid(modelEntry.model_id, placementIndex + 1, expected.entity_id);
        if (placement.vid !== expectedVid) {
          add(issues, `${placementLocation}.vid`, "must match the deterministic placement VID");
        }
      }
    });
  });

  for (const modelId of modelById.keys()) {
    if (!seenModelIds.has(modelId)) {
      add(issues, "$.models", `missing catalog model ${modelId}`);
    }
  }
  if (actualOfferCount !== manifest.expected_offer_count) {
    add(issues, "$.expected_offer_count", "must equal the number of placements");
  }
  if (declaredOfferCount !== manifest.expected_offer_count) {
    add(issues, "$.expected_offer_count", "must equal the sum of model expected counts");
  }

  finish(issues);
  return manifest;
}

export function expandModelPlacementCards(manifest, options = {}) {
  const { source } = options;
  validateModelPlacementManifest(manifest, options);
  const sourceById = new Map(source.cards.map((card) => [card.id, card]));
  return flattenedManifest(manifest).map((placement) => {
    const card = structuredClone(sourceById.get(placement.source_card_id));
    card.id = placement.placement_id;
    card.vid = placement.vid;
    validateSource(
      { schema_version: 2, cards: [card] },
      { allowExampleHosts: options.allowExampleHosts ?? false },
    );
    return {
      placement_id: placement.placement_id,
      model_id: placement.model_id,
      model_path: placement.model_path,
      rank: placement.rank,
      card,
    };
  });
}

function manifestPlacementMap(manifest) {
  if (!manifest) return null;
  return new Map(flattenedManifest(manifest).map((placement) => [placement.placement_id, placement]));
}

function validateModelSnapshot(snapshot, {
  manifest,
  source,
  models,
  catalogMounts,
  allowExampleHosts = false,
  publicOnly = false,
} = {}) {
  if (manifest) {
    validateModelPlacementManifest(manifest, {
      source,
      models,
      catalogMounts,
      allowExampleHosts,
    });
  }
  const issues = [];
  if (!exactKeys(snapshot, ["schema_version", "generated_at", "placements"], "$", issues)) {
    finish(issues);
  }
  if (snapshot.schema_version !== MODEL_PLACEMENT_SCHEMA_VERSION) {
    add(issues, "$.schema_version", `must equal ${MODEL_PLACEMENT_SCHEMA_VERSION}`);
  }
  if (!isIsoDate(snapshot.generated_at)) {
    add(issues, "$.generated_at", "must be an ISO UTC timestamp");
  }
  if (!Array.isArray(snapshot.placements)) {
    add(issues, "$.placements", "must be an array");
    finish(issues);
  }

  const expected = manifestPlacementMap(manifest);
  const sourceById = source?.cards
    ? new Map(source.cards.map((card) => [card.id, card]))
    : null;
  const ids = new Set();
  const vids = new Set();
  const offers = [];
  snapshot.placements.forEach((entry, index) => {
    const location = `$.placements[${index}]`;
    if (!exactKeys(
      entry,
      ["placement_id", "model_id", "model_path", "rank", "offer"],
      location,
      issues,
    )) return;
    if (typeof entry.placement_id !== "string" || !ID_RE.test(entry.placement_id)) {
      add(issues, `${location}.placement_id`, "invalid placement ID");
    } else if (ids.has(entry.placement_id)) {
      add(issues, `${location}.placement_id`, "duplicate placement ID");
    } else ids.add(entry.placement_id);
    if (typeof entry.model_id !== "string" || !ID_RE.test(entry.model_id)) {
      add(issues, `${location}.model_id`, "invalid model ID");
    }
    if (typeof entry.model_path !== "string" || !MODEL_PATH_RE.test(entry.model_path)) {
      add(issues, `${location}.model_path`, "invalid model path");
    }
    if (!Number.isInteger(entry.rank) || entry.rank < 1 || entry.rank > MODEL_PLACEMENT_LIMIT) {
      add(issues, `${location}.rank`, `must be an integer from 1 to ${MODEL_PLACEMENT_LIMIT}`);
    }
    if (!isObject(entry.offer)) {
      add(issues, `${location}.offer`, "must be a standard offer object");
      return;
    }
    if (entry.offer.id !== entry.placement_id) {
      add(issues, `${location}.offer.id`, "must equal placement_id");
    }
    if (typeof entry.offer.vid === "string") {
      if (vids.has(entry.offer.vid)) add(issues, `${location}.offer.vid`, "duplicate VID");
      else vids.add(entry.offer.vid);
    }

    const configured = expected?.get(entry.placement_id);
    if (expected && !configured) {
      add(issues, `${location}.placement_id`, "not present in manifest");
    } else if (configured) {
      for (const field of ["model_id", "model_path", "rank"]) {
        if (entry[field] !== configured[field]) {
          add(issues, `${location}.${field}`, "must match manifest");
        }
      }
      if (entry.offer.entity_id !== configured.entity_id) {
        add(issues, `${location}.offer.entity_id`, "must match manifest entity_id");
      }
      if (entry.offer.vid !== configured.vid) {
        add(issues, `${location}.offer.vid`, "must match manifest VID");
      }
      if (entry.offer.clid !== manifest.clid) {
        add(issues, `${location}.offer.clid`, "must match manifest CLID");
      }
      const sourceCard = sourceById?.get(configured.source_card_id);
      if (sourceById && !sourceCard) {
        add(issues, `${location}.placement_id`, "manifest source card is missing");
      } else if (sourceCard) {
        for (const field of [
          "market_source_url",
          "page_path",
          "entity_kind",
          "entity_id",
          "compliance_mode",
          "clid",
        ]) {
          if (entry.offer[field] !== sourceCard[field]) {
            add(issues, `${location}.offer.${field}`, "must match the source card");
          }
        }
        if (JSON.stringify(entry.offer.creative) !== JSON.stringify(sourceCard.creative)) {
          add(issues, `${location}.offer.creative`, "must match the source card");
        }
      }
    }
    offers.push(entry.offer);
  });

  if (!publicOnly && expected && snapshot.placements.length !== expected.size) {
    add(issues, "$.placements", "private snapshot must contain every manifest placement");
  }
  finish(issues);

  const standardSnapshot = {
    schema_version: 2,
    generated_at: snapshot.generated_at,
    offers,
  };
  if (publicOnly) validatePublicSnapshot(standardSnapshot, { allowExampleHosts });
  else validateSnapshot(standardSnapshot, { allowExampleHosts });
  return snapshot;
}

export function validateModelPrivateSnapshot(snapshot, options = {}) {
  return validateModelSnapshot(snapshot, { ...options, publicOnly: false });
}

export function validateModelPublicSnapshot(snapshot, options = {}) {
  return validateModelSnapshot(snapshot, { ...options, publicOnly: true });
}

export function buildModelPrivateSnapshot({
  manifest,
  source,
  models,
  catalogMounts,
  batch,
  allowExampleHosts = false,
}) {
  const expanded = expandModelPlacementCards(manifest, {
    source,
    models,
    catalogMounts,
    allowExampleHosts,
  });
  validateBatch(batch, { allowExampleHosts });

  const expectedIds = new Set(expanded.map((entry) => entry.placement_id));
  const checks = new Map(batch.checks.map((check) => [check.id, check]));
  const issues = [];
  for (const id of checks.keys()) {
    if (!expectedIds.has(id)) add(issues, `$.checks.${id}`, "not present in placement manifest");
  }
  for (const id of expectedIds) {
    if (!checks.has(id)) add(issues, `$.placements.${id}`, "missing check result");
  }
  finish(issues);

  const placements = expanded.map((entry) => {
    const decision = buildSnapshot(
      { schema_version: 2, cards: [entry.card] },
      {
        schema_version: 2,
        generated_at: batch.generated_at,
        checks: [checks.get(entry.placement_id)],
      },
      { allowExampleHosts, catalogMounts },
    );
    return {
      placement_id: entry.placement_id,
      model_id: entry.model_id,
      model_path: entry.model_path,
      rank: entry.rank,
      offer: decision.offers[0],
    };
  });
  const snapshot = {
    schema_version: MODEL_PLACEMENT_SCHEMA_VERSION,
    generated_at: batch.generated_at,
    placements,
  };
  return validateModelPrivateSnapshot(snapshot, {
    manifest,
    source,
    models,
    catalogMounts,
    allowExampleHosts,
  });
}

export function buildModelPublicSnapshot(
  privateSnapshot,
  { manifest, source, models, catalogMounts, allowExampleHosts = false } = {},
) {
  validateModelPrivateSnapshot(privateSnapshot, {
    manifest,
    source,
    models,
    catalogMounts,
    allowExampleHosts,
  });
  const placements = [];
  for (const entry of privateSnapshot.placements) {
    const publicDecision = buildPublicSnapshot(
      {
        schema_version: 2,
        generated_at: privateSnapshot.generated_at,
        offers: [entry.offer],
      },
      { allowExampleHosts },
    );
    if (publicDecision.offers.length === 0) continue;
    placements.push({
      placement_id: entry.placement_id,
      model_id: entry.model_id,
      model_path: entry.model_path,
      rank: entry.rank,
      offer: publicDecision.offers[0],
    });
  }
  const snapshot = {
    schema_version: MODEL_PLACEMENT_SCHEMA_VERSION,
    generated_at: privateSnapshot.generated_at,
    placements,
  };
  return validateModelPublicSnapshot(snapshot, {
    manifest,
    source,
    models,
    catalogMounts,
    allowExampleHosts,
  });
}
