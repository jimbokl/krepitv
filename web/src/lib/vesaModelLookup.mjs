export function findVesaModel(models, item) {
  if (!Array.isArray(models) || typeof item?.id !== "string") return null;
  return models.find((model) => model?.id === item.id) ?? null;
}

export function vesaConflictFor(model) {
  return model?.wall_mount_screws?.vesa_conflict ?? null;
}

export function verifiedMountCountFor(model, compatibilityEdges) {
  if (typeof model?.id !== "string" || !Array.isArray(compatibilityEdges)) return 0;
  // A disagreement between official sources makes the VESA dimension itself
  // unresolved. Graph edges built from one of those values remain useful as
  // candidates on the model page, but must not be presented as verified here.
  if (vesaConflictFor(model)) return 0;
  return compatibilityEdges.filter(
    (edge) =>
      edge?.tv_id === model.id &&
      edge?.compatible === true &&
      edge?.fit_status === "verified-fit",
  ).length;
}

export function classifyVesaLookupSelection(models, item) {
  const model = findVesaModel(models, item);
  if (!model) return { model: null, status: "unknown" };
  return {
    model,
    status: vesaConflictFor(model) ? "source-conflict" : "verified-size",
  };
}
