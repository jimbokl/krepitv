export function getCatalogItems(page, catalog) {
  if (page.kind === "mechanism") {
    const mechanism = {
      "fixed-mount": "fixed",
      "tilt-mount": "tilt",
      "full-motion-mount": "full-motion",
      "extendable-mount": "full-motion",
    }[page.id];
    return {
      type: "mounts",
      values: catalog.mounts.filter((mount) => mount.mechanism === mechanism),
    };
  }

  if (page.kind === "commercial") {
    return { type: "mounts", values: catalog.mounts };
  }

  if (page.kind === "mount-brand") {
    const brand = page.id.replace(/^mount-brand-/i, "").toLocaleLowerCase("ru-RU");
    return {
      type: "mounts",
      values: catalog.mounts.filter(
        (mount) => String(mount.brand ?? "").trim().toLocaleLowerCase("ru-RU") === brand,
      ),
    };
  }

  if (page.kind === "vesa") {
    const vesa = page.id.replace("vesa-", "");
    return {
      type: "models",
      values: catalog.models.filter(
        (model) => `${model.vesa_width_mm}x${model.vesa_height_mm}` === vesa,
      ),
    };
  }

  if (page.kind === "diagonal") {
    const diagonal = Number(page.id.replace("diagonal-", ""));
    return {
      type: "models",
      values: catalog.models.filter((model) => model.diagonal_inches === diagonal),
    };
  }

  if (page.kind === "brand") {
    const brand = page.id.replace(/^brand-/i, "").toLocaleLowerCase("ru-RU");
    return {
      type: "models",
      values: catalog.models.filter(
        (model) => String(model.brand ?? "").trim().toLocaleLowerCase("ru-RU") === brand,
      ),
    };
  }

  return { type: "models", values: catalog.models };
}
