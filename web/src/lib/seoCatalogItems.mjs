import { selectAffiliateOffer } from "./affiliateOffer.mjs";

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

export function selectSeoHubAffiliateOffers(
  page,
  catalogItems,
  hubAffiliateOffers,
  options,
) {
  if (
    page?.indexable !== true ||
    typeof page.id !== "string" ||
    typeof page.path !== "string" ||
    catalogItems?.type !== "mounts" ||
    !Array.isArray(catalogItems.values) ||
    !Array.isArray(hubAffiliateOffers)
  ) {
    return [];
  }

  const catalogMountIds = new Set(catalogItems.values.map((mount) => mount?.id));
  const placements = hubAffiliateOffers
    .filter(
      (offer) => offer?.hub_id === page.id && offer?.hub_path === page.path,
    )
    .sort((left, right) => left.rank - right.rank);
  const placementIds = new Set();
  const ranks = new Set();
  const entities = new Set();
  const selected = [];

  for (const placement of placements) {
    if (
      typeof placement.placement_id !== "string" ||
      !Number.isInteger(placement.rank) ||
      placement.rank < 1 ||
      placement.rank > 3 ||
      placementIds.has(placement.placement_id) ||
      ranks.has(placement.rank) ||
      entities.has(placement.entity_id)
    ) {
      return [];
    }
    placementIds.add(placement.placement_id);
    ranks.add(placement.rank);
    entities.add(placement.entity_id);

    if (selected.length >= 3 || !catalogMountIds.has(placement.entity_id)) continue;

    const offer = selectAffiliateOffer(
      [placement],
      {
        pagePath: `/kronshteyny/${placement.entity_id}/`,
        entityKind: "mount",
        entityId: placement.entity_id,
      },
      options,
    );
    if (offer) selected.push(offer);
  }

  return selected;
}
