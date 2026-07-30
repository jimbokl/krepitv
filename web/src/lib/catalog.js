let catalogPromise;
let enginePromise;

export function normalizeSearch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      fetch("/data/tv-models.json").then(assertResponse),
      fetch("/data/mounts.json").then(assertResponse),
      fetch("/data/model-search.json").then(assertResponse),
      fetch("/data/seo-pages.json").then(assertResponse),
    ]).then(async ([models, mounts, search, seoPages]) => ({
      models: await models.json(),
      mounts: await mounts.json(),
      search: await search.json(),
      seoPages: await seoPages.json(),
    }));
  }
  return catalogPromise;
}

function assertResponse(response) {
  if (!response.ok) {
    throw new Error("Не удалось загрузить проверенные данные. Обновите страницу.");
  }
  return response;
}

export function loadEngine() {
  if (!enginePromise) {
    const enginePath = "/pkg/krepitv_engine.js";
    enginePromise = import(/* @vite-ignore */ enginePath).then(
      async (engine) => {
        await engine.default();
        return engine;
      },
    );
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

export function modelHref(model) {
  return `/modeli/${model.id}/`;
}
