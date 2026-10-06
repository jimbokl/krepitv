export function modelsForMountScope(models, vesa) {
  return models.filter((model) => (
    typeof model.id === "string" && typeof model.brand === "string"
    && Number.isFinite(model.weight_kg) && model.weight_kg > 0
    && Number.isFinite(model.diagonal_inches) && model.diagonal_inches > 0
    && Number.isInteger(model.vesa_width_mm) && model.vesa_width_mm > 0
    && Number.isInteger(model.vesa_height_mm) && model.vesa_height_mm > 0
    && (!vesa || (model.vesa_width_mm === vesa[0] && model.vesa_height_mm === vesa[1]))
  ));
}

export function mountsForScope(mounts, mechanism = "any") {
  return mounts.filter((mount) => mechanism === "any" || mount.mechanism === mechanism);
}

// A changed draft or disposed component must never publish an old calculation.
export function createLatestMatchRequest() {
  let version = 0;
  return {
    invalidate() { version += 1; },
    async run(calculate, publish) {
      const current = ++version;
      try {
        const matches = await calculate();
        if (current === version) publish({ status: "ready", matches, error: null });
      } catch {
        if (current === version) publish({ status: "error", matches: [], error: "Не удалось выполнить локальную проверку. Повторите попытку; без расчёта мы не рекомендуем крепление." });
      }
    },
  };
}
