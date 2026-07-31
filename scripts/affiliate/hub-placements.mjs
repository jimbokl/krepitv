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
const PAGE_PATH_RE = /^\/[a-z0-9][a-z0-9/-]*\/$/;
const VID_RE = /^[A-Za-z0-9]{1,150}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export class HubPlacementValidationError extends Error {
  constructor(issues) {
    super(`Hub placement validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "HubPlacementValidationError";
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
  if (issues.length) throw new HubPlacementValidationError(issues);
}

function isIsoDate(value) {
  return (
    typeof value === "string" &&
    ISO_DATE_RE.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function flattenManifest(manifest) {
  return manifest.hubs.flatMap((hub) =>
    hub.placements.map((placement) => ({
      ...placement,
      hub_id: hub.hub_id,
      hub_path: hub.hub_path,
    })),
  );
}

function validateCatalogOptions(source, options) {
  const { allowExampleHosts = false, catalogMounts } = options;
  validateSource(source, { allowExampleHosts });
  if (!allowExampleHosts) {
    validateSourceAgainstMounts(source, catalogMounts, { allowExampleHosts });
  }
}

function normalizedCatalogValue(value) {
  return String(value ?? "").trim().toLocaleLowerCase("ru-RU");
}

function pageAllowsMount(page, mount) {
  if (!isObject(page) || !isObject(mount)) return false;
  if (page.kind === "commercial") return true;
  if (page.kind === "mount-brand") {
    const expectedBrand = normalizedCatalogValue(page.id).replace(/^mount-brand-/, "");
    return normalizedCatalogValue(mount.brand) === expectedBrand;
  }
  if (page.kind === "mechanism") {
    const expectedMechanism = {
      "fixed-mount": "fixed",
      "tilt-mount": "tilt",
      "full-motion-mount": "full-motion",
      "extendable-mount": "full-motion",
    }[page.id];
    return expectedMechanism !== undefined && mount.mechanism === expectedMechanism;
  }
  return false;
}

export function validateHubPlacementManifest(
  manifest,
  {
    source,
    seoPages,
    catalogMounts,
    allowExampleHosts = false,
  } = {},
) {
  const issues = [];
  if (!exactKeys(
    manifest,
    ["schema_version", "clid", "expected_offer_count", "hubs"],
    "$",
    issues,
  )) {
    finish(issues);
  }
  if (manifest.schema_version !== 1) {
    add(issues, "$.schema_version", "must equal 1");
  }
  if (typeof manifest.clid !== "string" || !/^\d{5,20}$/.test(manifest.clid)) {
    add(issues, "$.clid", "must contain 5-20 digits");
  }
  if (!Number.isInteger(manifest.expected_offer_count) || manifest.expected_offer_count < 0) {
    add(issues, "$.expected_offer_count", "must be a non-negative integer");
  }
  if (!Array.isArray(manifest.hubs)) {
    add(issues, "$.hubs", "must be an array");
    finish(issues);
  }
  if (!isObject(source) || !Array.isArray(source.cards)) {
    add(issues, "$.source", "must be a standard affiliate source manifest");
    finish(issues);
  }
  if (!Array.isArray(seoPages)) {
    add(issues, "$.seoPages", "must be an array");
    finish(issues);
  }

  validateCatalogOptions(source, {
    allowExampleHosts,
    catalogMounts,
  });

  const sourceById = new Map(source.cards.map((card) => [card.id, card]));
  const mountById = Array.isArray(catalogMounts)
    ? new Map(catalogMounts.map((mount) => [mount.id, mount]))
    : null;
  const baseIds = new Set(source.cards.map((card) => card.id));
  const baseVids = new Set(source.cards.map((card) => card.vid));
  const placementIds = new Set();
  const placementVids = new Set();
  const hubIds = new Set();
  const hubPaths = new Set();
  let actualOfferCount = 0;
  let declaredOfferCount = 0;

  manifest.hubs.forEach((hub, hubIndex) => {
    const location = `$.hubs[${hubIndex}]`;
    if (!exactKeys(
      hub,
      ["hub_id", "hub_path", "expected_offer_count", "placements"],
      location,
      issues,
    )) return;

    if (typeof hub.hub_id !== "string" || !ID_RE.test(hub.hub_id)) {
      add(issues, `${location}.hub_id`, "invalid hub ID");
    } else if (hubIds.has(hub.hub_id)) {
      add(issues, `${location}.hub_id`, "duplicate hub ID");
    } else hubIds.add(hub.hub_id);

    if (typeof hub.hub_path !== "string" || !PAGE_PATH_RE.test(hub.hub_path)) {
      add(issues, `${location}.hub_path`, "must be a lowercase trailing-slash path");
    } else if (hubPaths.has(hub.hub_path)) {
      add(issues, `${location}.hub_path`, "duplicate hub path");
    } else hubPaths.add(hub.hub_path);

    if (
      !Number.isInteger(hub.expected_offer_count) ||
      hub.expected_offer_count < 1 ||
      hub.expected_offer_count > 3
    ) {
      add(issues, `${location}.expected_offer_count`, "must be an integer from 1 to 3");
    } else declaredOfferCount += hub.expected_offer_count;

    if (!Array.isArray(hub.placements)) {
      add(issues, `${location}.placements`, "must be an array");
      return;
    }
    actualOfferCount += hub.placements.length;
    if (hub.placements.length !== hub.expected_offer_count) {
      add(
        issues,
        `${location}.placements`,
        "length must equal expected_offer_count",
      );
    }

    const page = seoPages.find((item) => item?.id === hub.hub_id);
    if (!page) {
      add(issues, `${location}.hub_id`, "does not reference an SEO page");
    } else {
      if (page.indexable !== true) {
        add(issues, `${location}.hub_id`, "SEO page must be indexable");
      }
      if (page.path !== hub.hub_path) {
        add(issues, `${location}.hub_path`, "must match the SEO page path");
      }
    }

    const entityIds = new Set();
    const ranks = new Set();
    hub.placements.forEach((placement, placementIndex) => {
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

      if (!Number.isInteger(placement.rank) || placement.rank < 1) {
        add(issues, `${placementLocation}.rank`, "must be a positive integer");
      } else if (ranks.has(placement.rank)) {
        add(issues, `${placementLocation}.rank`, "duplicate rank in hub");
      } else ranks.add(placement.rank);

      if (typeof placement.entity_id !== "string" || !ID_RE.test(placement.entity_id)) {
        add(issues, `${placementLocation}.entity_id`, "invalid mount entity ID");
      } else if (entityIds.has(placement.entity_id)) {
        add(issues, `${placementLocation}.entity_id`, "duplicate entity in hub");
      } else entityIds.add(placement.entity_id);

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
        const catalogMount = mountById?.get(sourceCard.entity_id);
        if (mountById && !catalogMount) {
          add(issues, `${placementLocation}.entity_id`, "does not reference a catalog mount");
        } else if (catalogMount && page && !pageAllowsMount(page, catalogMount)) {
          add(
            issues,
            `${placementLocation}.entity_id`,
            "does not belong to the configured SEO hub",
          );
        }
      }

      if (typeof placement.vid !== "string" || !VID_RE.test(placement.vid)) {
        add(issues, `${placementLocation}.vid`, "must contain 1-150 Latin letters or digits");
      } else if (placementVids.has(placement.vid) || baseVids.has(placement.vid)) {
        add(issues, `${placementLocation}.vid`, "duplicate or base-colliding VID");
      } else placementVids.add(placement.vid);
    });

    for (let rank = 1; rank <= hub.placements.length; rank += 1) {
      if (!ranks.has(rank)) {
        add(issues, `${location}.placements`, `ranks must be contiguous from 1; missing ${rank}`);
      }
    }
  });

  if (actualOfferCount !== manifest.expected_offer_count) {
    add(issues, "$.expected_offer_count", "must equal the number of placements");
  }
  if (declaredOfferCount !== manifest.expected_offer_count) {
    add(issues, "$.expected_offer_count", "must equal the sum of hub expected counts");
  }

  finish(issues);
  return manifest;
}

export function expandHubPlacementCards(manifest, options = {}) {
  const { source } = options;
  validateHubPlacementManifest(manifest, options);
  const sourceById = new Map(source.cards.map((card) => [card.id, card]));

  return flattenManifest(manifest).map((placement) => {
    const card = structuredClone(sourceById.get(placement.source_card_id));
    card.id = placement.placement_id;
    card.vid = placement.vid;
    validateSource(
      { schema_version: 2, cards: [card] },
      { allowExampleHosts: options.allowExampleHosts ?? false },
    );
    return {
      placement_id: placement.placement_id,
      hub_id: placement.hub_id,
      hub_path: placement.hub_path,
      rank: placement.rank,
      card,
    };
  });
}

function manifestPlacementMap(manifest) {
  if (!manifest) return null;
  return new Map(flattenManifest(manifest).map((item) => [item.placement_id, item]));
}

function validateHubSnapshot(snapshot, {
  manifest,
  source,
  allowExampleHosts = false,
  publicOnly = false,
} = {}) {
  const issues = [];
  if (!exactKeys(snapshot, ["schema_version", "generated_at", "placements"], "$", issues)) {
    finish(issues);
  }
  if (snapshot.schema_version !== 1) add(issues, "$.schema_version", "must equal 1");
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
      ["placement_id", "hub_id", "hub_path", "rank", "offer"],
      location,
      issues,
    )) return;
    if (typeof entry.placement_id !== "string" || !ID_RE.test(entry.placement_id)) {
      add(issues, `${location}.placement_id`, "invalid placement ID");
    } else if (ids.has(entry.placement_id)) {
      add(issues, `${location}.placement_id`, "duplicate placement ID");
    } else ids.add(entry.placement_id);
    if (typeof entry.hub_id !== "string" || !ID_RE.test(entry.hub_id)) {
      add(issues, `${location}.hub_id`, "invalid hub ID");
    }
    if (typeof entry.hub_path !== "string" || !PAGE_PATH_RE.test(entry.hub_path)) {
      add(issues, `${location}.hub_path`, "invalid hub path");
    }
    if (!Number.isInteger(entry.rank) || entry.rank < 1 || entry.rank > 3) {
      add(issues, `${location}.rank`, "must be an integer from 1 to 3");
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
      for (const field of ["hub_id", "hub_path", "rank"]) {
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

export function validateHubPrivateSnapshot(snapshot, options = {}) {
  return validateHubSnapshot(snapshot, { ...options, publicOnly: false });
}

export function validateHubPublicSnapshot(snapshot, options = {}) {
  return validateHubSnapshot(snapshot, { ...options, publicOnly: true });
}

export function buildHubPrivateSnapshot({
  manifest,
  source,
  seoPages,
  catalogMounts,
  batch,
  allowExampleHosts = false,
}) {
  const expanded = expandHubPlacementCards(manifest, {
    source,
    seoPages,
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
    const singleSource = { schema_version: 2, cards: [entry.card] };
    const singleBatch = {
      schema_version: 2,
      generated_at: batch.generated_at,
      checks: [checks.get(entry.placement_id)],
    };
    const decision = buildSnapshot(singleSource, singleBatch, {
      allowExampleHosts,
      catalogMounts,
    });
    return {
      placement_id: entry.placement_id,
      hub_id: entry.hub_id,
      hub_path: entry.hub_path,
      rank: entry.rank,
      offer: decision.offers[0],
    };
  });

  const snapshot = {
    schema_version: 1,
    generated_at: batch.generated_at,
    placements,
  };
  return validateHubPrivateSnapshot(snapshot, {
    manifest,
    source,
    allowExampleHosts,
  });
}

export function buildHubPublicSnapshot(
  privateSnapshot,
  { manifest, source, allowExampleHosts = false } = {},
) {
  validateHubPrivateSnapshot(privateSnapshot, { manifest, source, allowExampleHosts });
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
      hub_id: entry.hub_id,
      hub_path: entry.hub_path,
      rank: entry.rank,
      offer: publicDecision.offers[0],
    });
  }

  const snapshot = {
    schema_version: 1,
    generated_at: privateSnapshot.generated_at,
    placements,
  };
  return validateHubPublicSnapshot(snapshot, {
    manifest,
    source,
    allowExampleHosts,
  });
}
