import { getFreshAffiliateOffers } from "./affiliateOffer.mjs";
import { parseCommercialProfiles } from "./commercialProfiles.mjs";
import { getFreshHubAffiliateOffers } from "./hubAffiliateOffers.mjs";

let catalogPromise;
let enginePromise;

export function normalizeSearch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function filterModelSearchResults(search, value, limit = 5) {
  const normalized = normalizeSearch(value);
  if (!normalized) return [];

  return search
    .filter((item) => normalizeSearch(item.search).includes(normalized))
    .slice(0, limit);
}

export function findExactModelSearchResult(search, value) {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;

  return search.find(
    (item) => normalizeSearch(item.title) === normalized,
  ) ?? null;
}

export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      fetch("/data/tv-models.json").then(assertResponse),
      fetch("/data/mounts.json").then(assertResponse),
      fetch("/data/model-search.json").then(assertResponse),
      fetch("/data/seo-pages.json").then(assertResponse),
      fetch("/data/compatibility-graph.json").then(assertResponse),
      fetch("/data/commercial-profiles.json").then(assertResponse),
      loadFreshAffiliateOffers(),
      loadFreshHubAffiliateOffers(),
    ]).then(async ([
      models,
      mounts,
      search,
      seoPages,
      compatibilityEdges,
      commercialProfiles,
      affiliateOffers,
      hubAffiliateOffers,
    ]) => ({
      models: await models.json(),
      mounts: await mounts.json(),
      search: await search.json(),
      seoPages: await seoPages.json(),
      compatibilityEdges: await compatibilityEdges.json(),
      commercialProfiles: parseCommercialProfiles(await commercialProfiles.json()),
      affiliateOffers,
      hubAffiliateOffers,
    }));
  }
  return catalogPromise;
}

export async function loadFreshAffiliateOffers({
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  origin = globalThis.location?.origin,
} = {}) {
  return loadSameOriginSnapshot({
    fetchImpl,
    now,
    origin,
    path: "/data/affiliate-offers.json",
    parse: getFreshAffiliateOffers,
  });
}

export async function loadFreshHubAffiliateOffers({
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  origin = globalThis.location?.origin,
} = {}) {
  return loadSameOriginSnapshot({
    fetchImpl,
    now,
    origin,
    path: "/data/affiliate-hub-offers.json",
    parse: getFreshHubAffiliateOffers,
  });
}

async function loadSameOriginSnapshot({ fetchImpl, now, origin, path, parse }) {
  if (
    typeof fetchImpl !== "function" ||
    typeof origin !== "string" ||
    typeof parse !== "function"
  ) {
    return [];
  }

  let allowedOrigin;
  let snapshotUrl;
  try {
    allowedOrigin = new URL(origin).origin;
    snapshotUrl = new URL(path, allowedOrigin);
  } catch {
    return [];
  }

  try {
    const response = await fetchImpl(snapshotUrl.toString(), {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    });
    if (!response?.ok) return [];

    const responseUrl = new URL(response.url || snapshotUrl.toString(), allowedOrigin);
    if (responseUrl.origin !== allowedOrigin) return [];

    return parse(await response.json(), { now });
  } catch {
    return [];
  }
}

function assertResponse(response) {
  if (!response.ok) {
    throw new Error("Не удалось загрузить проверенные данные. Обновите страницу.");
  }
  return response;
}

export function loadEngine() {
  if (!enginePromise) {
    enginePromise = new Promise((resolve, reject) => {
      if (globalThis.__krepitvEngine) {
        resolve(globalThis.__krepitvEngine);
        return;
      }

      const fail = () => reject(new Error(
        "Не удалось загрузить локальный модуль расчёта. Обновите страницу.",
      ));
      globalThis.addEventListener(
        "krepitv-engine-ready",
        () => resolve(globalThis.__krepitvEngine),
        { once: true },
      );
      globalThis.addEventListener("krepitv-engine-error", fail, { once: true });

      const existing = document.querySelector('script[data-krepitv-engine="loader"]');
      if (existing) {
        if (globalThis.__krepitvEngineError) fail();
        return;
      }

      const script = document.createElement("script");
      script.dataset.krepitvEngine = "loader";
      script.src = "/krepitv-engine-loader.js";
      script.type = "module";
      script.addEventListener("error", fail, { once: true });
      document.head.append(script);
    });
  }
  return enginePromise;
}

export async function findCompatibleMounts(model, mounts, mechanism = "any") {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.match_mounts_json(
      model.weight_kg,
      model.diagonal_inches,
      model.vesa_width_mm,
      model.vesa_height_mm,
      mechanism,
      JSON.stringify(mounts),
    ),
  );
  if (response.error) throw new Error(response.error);
  return response.matches;
}

export async function calculateHeight(model, values) {
  const engine = await loadEngine();
  return JSON.parse(
    engine.height_plan_json(
      model.diagonal_inches,
      values.eyeHeight,
      values.viewingDistance,
      values.viewingAngle,
      values.furnitureHeight,
      values.clearance,
    ),
  );
}

export async function calculateMountingMap(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.mounting_map_json(
      values.diagonal,
      values.eyeHeight,
      values.viewingDistance,
      values.viewingAngle,
      values.furnitureHeight,
      values.clearance,
      values.vesaVerticalOffset,
      values.wallPlateOffset,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateTvZoneSocketPlan(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.tv_zone_socket_plan_json(
      values.diagonal,
      values.screenCenterHeight,
      values.plateWidth,
      values.plateHeight,
      values.plateHorizontalOffset,
      values.plateVerticalOffset,
      values.socketWidth,
      values.socketHeight,
      values.socketHorizontalOffset,
      values.socketVerticalOffset,
      values.serviceMargin,
      values.requiredDepth,
      values.wallClearance,
      values.poweredDevices,
      values.sparePowerModules,
      values.ethernetModules,
      values.antennaModules,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateViewingGeometry(mode, value, horizontalAngle) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.viewing_geometry_json(mode, value, horizontalAngle),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateTurnClearance(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.turn_clearance_plan_json(
      values.tvWidth,
      values.vesaOffset,
      values.targetAngle,
      values.availableExtension,
      values.safetyClearance,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateTiltAngle(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.tilt_angle_plan_json(
      values.diagonal,
      values.screenCenterHeight,
      values.eyeHeight,
      values.viewingDistance,
      values.maximumDownTilt,
      values.maximumUpTilt,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateVesaMatch(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.vesa_match_plan_json(
      values.width,
      values.height,
      values.unit,
      values.mountSpec,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export function modelHref(model) {
  return `/modeli/${model.id}/`;
}

export function mountHref(mount) {
  return `/kronshteyny/${mount.id}/`;
}
