import { getFreshAffiliateOffers } from "./affiliateOffer.mjs";
import { parseCommercialProfiles } from "./commercialProfiles.mjs";
import { getFreshHubAffiliateOffers } from "./hubAffiliateOffers.mjs";
import { getFreshModelAffiliateOffers } from "./modelAffiliateOffers.mjs";
import { buildInstallationKitWithEngine } from "./installationKit.js";

let catalogPromise;
let enginePromise;
let engineLoadAttempt = 0;

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
    const activeModelId = modelIdFromPath(globalThis.location?.pathname);
    catalogPromise = Promise.all([
      fetch("/data/tv-models.json").then(assertResponse),
      fetch("/data/market-tv-models.json").then(assertResponse),
      fetch("/data/mounts.json").then(assertResponse),
      fetch("/data/model-search.json").then(assertResponse),
      fetch("/data/seo-pages.json").then(assertResponse),
      fetch("/data/compatibility-graph.json").then(assertResponse),
      fetch("/data/commercial-profiles.json").then(assertResponse),
      loadFreshAffiliateOffers(),
      loadFreshHubAffiliateOffers(),
      activeModelId
        ? loadFreshModelAffiliateOffers({ modelId: activeModelId })
        : Promise.resolve([]),
    ]).then(async ([
      models,
      marketModels,
      mounts,
      search,
      seoPages,
      compatibilityEdges,
      commercialProfiles,
      affiliateOffers,
      hubAffiliateOffers,
      modelAffiliateOffers,
    ]) => ({
      models: await models.json(),
      marketModels: parseMarketModels(await marketModels.json()),
      mounts: await mounts.json(),
      search: await search.json(),
      seoPages: await seoPages.json(),
      compatibilityEdges: await compatibilityEdges.json(),
      commercialProfiles: parseCommercialProfiles(await commercialProfiles.json()),
      affiliateOffers,
      hubAffiliateOffers,
      modelAffiliateOffers,
    }));
  }
  return catalogPromise;
}

export function parseMarketModels(manifest) {
  if (
    !manifest
    || manifest.schema_version !== 1
    || !Array.isArray(manifest.records)
    || manifest.records.length !== 133
  ) {
    throw new Error("Реестр моделей Маркета повреждён или имеет неподдерживаемую версию.");
  }
  return manifest.records;
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

export async function loadFreshModelAffiliateOffers({
  fetchImpl = globalThis.fetch,
  modelId,
  now = Date.now(),
  origin = globalThis.location?.origin,
} = {}) {
  const shardKey = modelOfferShardKey(modelId);
  if (!shardKey) return [];
  return loadSameOriginSnapshot({
    fetchImpl,
    now,
    origin,
    path: `/data/affiliate-model-offers/${shardKey}.json`,
    parse: (snapshot, options) => getFreshModelAffiliateOffers(snapshot, {
      ...options,
      modelId,
    }),
  });
}

export function modelIdFromPath(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^\/modeli\/([a-z0-9][a-z0-9-]{2,79})\/?$/i);
  return match ? match[1].toLocaleLowerCase("ru-RU") : null;
}

export function modelOfferShardKey(modelId) {
  if (typeof modelId !== "string" || !/^[a-z0-9][a-z0-9-]{2,79}$/u.test(modelId)) {
    return null;
  }
  const key = /^samsung-qe\d/u.test(modelId)
    ? "samsung-qe"
    : /^samsung-ue\d/u.test(modelId)
      ? "samsung-ue"
      : modelId.split("-", 1)[0];
  return /^[a-z0-9]{2,20}(?:-[a-z0-9]{2,20})?$/u.test(key) ? key : null;
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
    const loadAttempt = new Promise((resolve, reject) => {
      if (globalThis.__krepitvEngine) {
        resolve(globalThis.__krepitvEngine);
        return;
      }

      const cleanup = () => {
        globalThis.removeEventListener("krepitv-engine-ready", ready);
        globalThis.removeEventListener("krepitv-engine-error", fail);
      };
      const ready = () => {
        cleanup();
        if (globalThis.__krepitvEngine) resolve(globalThis.__krepitvEngine);
        else fail();
      };
      const fail = () => {
        cleanup();
        document.querySelector('script[data-krepitv-engine="loader"]')?.remove();
        globalThis.__krepitvEngineError = true;
        reject(new Error(
          "Не удалось загрузить локальный модуль расчёта. Нажмите «Повторить» и попробуйте ещё раз.",
        ));
      };
      globalThis.addEventListener("krepitv-engine-ready", ready, { once: true });
      globalThis.addEventListener("krepitv-engine-error", fail, { once: true });

      const existing = document.querySelector('script[data-krepitv-engine="loader"]');
      if (existing) {
        if (globalThis.__krepitvEngineError) existing.remove();
        else return;
      }
      if (globalThis.__krepitvEngineError) {
        delete globalThis.__krepitvEngineError;
      }

      engineLoadAttempt += 1;
      const script = document.createElement("script");
      script.dataset.krepitvEngine = "loader";
      script.src = engineLoadAttempt === 1
        ? "/krepitv-engine-loader.js"
        : `/krepitv-engine-loader.js?retry=${engineLoadAttempt}`;
      script.type = "module";
      script.addEventListener("error", fail, { once: true });
      document.head.append(script);
    });
    enginePromise = loadAttempt.catch((error) => {
      enginePromise = undefined;
      throw error;
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

export async function buildInstallationKit(values) {
  const engine = await loadEngine();
  return buildInstallationKitWithEngine(engine, values);
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

export async function calculateVesaScrewLength(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.vesa_screw_length_plan_json(
      values.engagementMin,
      values.engagementMax,
      values.plate,
      values.washers,
      values.spacer,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
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

export async function calculateWallScenePlan(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.wall_scene_plan_json(
      values.diagonal,
      values.screenWidth,
      values.screenHeight,
      values.wallWidth,
      values.wallHeight,
      values.centerX,
      values.centerY,
      values.furnitureWidth,
      values.furnitureHeight,
      values.eyeLine,
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

export async function calculateTvDimensionsPlan(values) {
  const engine = await loadEngine();
  const mode = values.mode;
  const primary = mode === "diagonal"
    ? values.diagonal
    : mode === "measured"
      ? values.measuredWidth
      : values.nicheWidth;
  const secondary = mode === "measured"
    ? values.measuredHeight
    : mode === "niche"
      ? values.nicheHeight
      : 0;
  const response = JSON.parse(
    engine.tv_dimensions_plan_json(
      mode,
      primary,
      secondary,
      mode === "niche" ? values.gap : 0,
      values.exactCaseWidth ?? 0,
      values.exactCaseHeight ?? 0,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculatePhoneTvConnection(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.phone_tv_connection_plan_json(
      values.phone,
      values.tv,
      values.goal,
      values.connector,
      values.sameNetwork,
      values.hdmi,
      values.androidVideoOutput,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateTvNoSignal(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.calculate_tv_no_signal_json(
      values.source,
      values.tvMenuVisible,
      values.sourcePowered,
      values.inputMatches,
      values.cableConnected,
      values.receiverMenuVisible,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateTvTrafficTask(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.tv_traffic_task_plan_json(
      values.task,
      values.primary,
      values.secondary,
      values.tertiary,
      values.detail,
    ),
  );
  if (response.error) throw new Error(response.error);
  return response;
}

export async function calculateTvEnergyPlan(values) {
  const engine = await loadEngine();
  const response = JSON.parse(
    engine.tv_energy_plan_json(
      values.activePowerW,
      values.hoursPerDay,
      values.standbyPowerW,
      values.tariffRubPerKwh,
    ),
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
