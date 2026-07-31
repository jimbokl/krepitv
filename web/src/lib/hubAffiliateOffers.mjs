import {
  getAffiliatePresentation,
  MAX_AFFILIATE_AGE_MS,
} from "./affiliateOffer.mjs";

const PLACEMENT_ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const HUB_ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const HUB_PATH_RE = /^\/[a-z0-9][a-z0-9/-]*\/$/;

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

function isHubPath(value) {
  return (
    typeof value === "string" &&
    HUB_PATH_RE.test(value) &&
    !value.includes("//")
  );
}

export function getFreshHubAffiliateOffers(
  snapshot,
  { now = Date.now(), maximumAgeMs = MAX_AFFILIATE_AGE_MS } = {},
) {
  if (
    !hasExactKeys(snapshot, ["schema_version", "generated_at", "placements"]) ||
    snapshot.schema_version !== 1 ||
    !Array.isArray(snapshot.placements) ||
    !isFresh(snapshot.generated_at, now, maximumAgeMs)
  ) {
    return [];
  }

  const placementIds = new Set();
  const hubRanks = new Set();
  const hubEntities = new Set();
  const vids = new Set();
  const pathByHub = new Map();
  const hubByPath = new Map();
  const flattened = [];

  for (const placement of snapshot.placements) {
    if (
      !hasExactKeys(placement, [
        "placement_id",
        "hub_id",
        "hub_path",
        "rank",
        "offer",
      ]) ||
      typeof placement.placement_id !== "string" ||
      !PLACEMENT_ID_RE.test(placement.placement_id) ||
      typeof placement.hub_id !== "string" ||
      !HUB_ID_RE.test(placement.hub_id) ||
      !isHubPath(placement.hub_path) ||
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

    const rankKey = `${placement.hub_id}\u0000${placement.hub_path}\u0000${placement.rank}`;
    const entityKey = `${placement.hub_id}\u0000${placement.hub_path}\u0000${placement.offer.entity_id}`;
    const knownPath = pathByHub.get(placement.hub_id);
    const knownHub = hubByPath.get(placement.hub_path);

    if (
      placementIds.has(placement.placement_id) ||
      hubRanks.has(rankKey) ||
      hubEntities.has(entityKey) ||
      vids.has(placement.offer.vid) ||
      (knownPath !== undefined && knownPath !== placement.hub_path) ||
      (knownHub !== undefined && knownHub !== placement.hub_id)
    ) {
      return [];
    }

    placementIds.add(placement.placement_id);
    hubRanks.add(rankKey);
    hubEntities.add(entityKey);
    vids.add(placement.offer.vid);
    pathByHub.set(placement.hub_id, placement.hub_path);
    hubByPath.set(placement.hub_path, placement.hub_id);
    flattened.push({
      ...placement.offer,
      placement_id: placement.placement_id,
      hub_id: placement.hub_id,
      hub_path: placement.hub_path,
      rank: placement.rank,
    });
  }

  return flattened;
}
