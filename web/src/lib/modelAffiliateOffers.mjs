import {
  getAffiliatePresentation,
  MAX_AFFILIATE_AGE_MS,
} from "./affiliateOffer.mjs";

const PLACEMENT_ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const MODEL_ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const MODEL_PATH_RE = /^\/modeli\/[a-z0-9][a-z0-9-]{2,79}\/$/;

function hasExactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isFresh(value, now, maximumAgeMs) {
  const timestamp = Date.parse(value ?? "");
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || maximumAgeMs < 0) return false;
  const age = now - timestamp;
  return age >= -5 * 60 * 1000 && age <= maximumAgeMs;
}

export function getFreshModelAffiliateOffers(
  snapshot,
  {
    modelId = null,
    now = Date.now(),
    maximumAgeMs = MAX_AFFILIATE_AGE_MS,
  } = {},
) {
  if (
    !hasExactKeys(snapshot, ["schema_version", "generated_at", "placements"]) ||
    snapshot.schema_version !== 1 ||
    !Array.isArray(snapshot.placements) ||
    !isFresh(snapshot.generated_at, now, maximumAgeMs) ||
    (modelId !== null && (typeof modelId !== "string" || !MODEL_ID_RE.test(modelId)))
  ) {
    return [];
  }

  const placementIds = new Set();
  const modelRanks = new Set();
  const modelEntities = new Set();
  const vids = new Set();
  const pathByModel = new Map();
  const modelByPath = new Map();
  const flattened = [];

  for (const placement of snapshot.placements) {
    if (
      !hasExactKeys(placement, [
        "placement_id",
        "model_id",
        "model_path",
        "rank",
        "offer",
      ]) ||
      typeof placement.placement_id !== "string" ||
      !PLACEMENT_ID_RE.test(placement.placement_id) ||
      typeof placement.model_id !== "string" ||
      !MODEL_ID_RE.test(placement.model_id) ||
      typeof placement.model_path !== "string" ||
      !MODEL_PATH_RE.test(placement.model_path) ||
      placement.model_path !== `/modeli/${placement.model_id}/` ||
      !Number.isInteger(placement.rank) ||
      placement.rank < 1 ||
      placement.rank > 3 ||
      !placement.offer ||
      typeof placement.offer !== "object" ||
      Array.isArray(placement.offer) ||
      placement.offer.id !== placement.placement_id ||
      !getAffiliatePresentation(placement.offer, { now, maximumAgeMs })
    ) {
      return [];
    }

    const rankKey = `${placement.model_id}\u0000${placement.model_path}\u0000${placement.rank}`;
    const entityKey = `${placement.model_id}\u0000${placement.model_path}\u0000${placement.offer.entity_id}`;
    const knownPath = pathByModel.get(placement.model_id);
    const knownModel = modelByPath.get(placement.model_path);

    if (
      placementIds.has(placement.placement_id) ||
      modelRanks.has(rankKey) ||
      modelEntities.has(entityKey) ||
      vids.has(placement.offer.vid) ||
      (knownPath !== undefined && knownPath !== placement.model_path) ||
      (knownModel !== undefined && knownModel !== placement.model_id)
    ) {
      return [];
    }

    placementIds.add(placement.placement_id);
    modelRanks.add(rankKey);
    modelEntities.add(entityKey);
    vids.add(placement.offer.vid);
    pathByModel.set(placement.model_id, placement.model_path);
    modelByPath.set(placement.model_path, placement.model_id);

    if (modelId === null || placement.model_id === modelId) {
      flattened.push({
        ...placement.offer,
        placement_id: placement.placement_id,
        model_id: placement.model_id,
        model_path: placement.model_path,
        rank: placement.rank,
      });
    }
  }

  return flattened;
}

export function selectModelAffiliateOffers(model, matches, offers, options) {
  if (
    typeof model?.id !== "string" ||
    !MODEL_ID_RE.test(model.id) ||
    !Array.isArray(matches) ||
    !Array.isArray(offers)
  ) {
    return [];
  }

  const modelPath = `/modeli/${model.id}/`;
  const matchByMount = new Map(
    matches
      .filter(
        (match) =>
          match?.compatible === true &&
          match?.fit_status === "verified-fit" &&
          typeof match?.mount?.id === "string",
      )
      .map((match) => [match.mount.id, match]),
  );

  return offers
    .filter(
      (offer) =>
        offer?.model_id === model.id &&
        offer?.model_path === modelPath &&
        matchByMount.has(offer.entity_id) &&
        getAffiliatePresentation(offer, options),
    )
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3)
    .map((offer) => ({
      ...matchByMount.get(offer.entity_id),
      offer,
      market: getAffiliatePresentation(offer, options),
    }));
}
