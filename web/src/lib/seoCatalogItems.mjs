import { selectAffiliateOffer } from "./affiliateOffer.mjs";

export const SEO_HUB_OFFER_PRIORITIES = Object.freeze({
  "mount-brand-onkron": ["onkron-tm6", "onkron-tm5-bw"],
  "buy-tv-mount": ["itech-plb440nt", "itech-ptrb440ln", "itech-slt-460"],
  "mount-brand-kromax": ["kromax-dix-18", "kromax-atlantis-45", "kromax-flat-4"],
  "extendable-mount": ["itech-ptrb440ln", "itech-slt-460", "kromax-dix-18"],
  "mount-brand-holder": ["holder-lcds-5066", "holder-lcds-5036"],
  "mount-brand-itechmount": ["itech-plb440nt", "itech-ptrb440ln", "itech-slt-460"],
});

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
  affiliateOffers,
  options,
) {
  const priorities = SEO_HUB_OFFER_PRIORITIES[page?.id];
  if (
    page?.indexable !== true ||
    catalogItems?.type !== "mounts" ||
    !Array.isArray(catalogItems.values) ||
    !priorities
  ) {
    return [];
  }

  const catalogMountIds = new Set(catalogItems.values.map((mount) => mount?.id));
  const selected = [];
  const seen = new Set();

  for (const entityId of priorities) {
    if (selected.length >= 3) break;
    if (seen.has(entityId) || !catalogMountIds.has(entityId)) continue;
    seen.add(entityId);

    const offer = selectAffiliateOffer(
      affiliateOffers,
      {
        pagePath: `/kronshteyny/${entityId}/`,
        entityKind: "mount",
        entityId,
      },
      options,
    );
    if (offer) selected.push(offer);
  }

  return selected;
}
