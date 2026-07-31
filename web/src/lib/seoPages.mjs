export function isIndexableSeoPage(page) {
  return page?.indexable === true;
}

export function getRelatedPages(page, pages, limit = 6) {
  const preferred = preferredRelatedIds(page.id);
  return pages
    .filter((item) => item.id !== page.id && isIndexableSeoPage(item))
    .map((item, index) => ({
      item,
      index,
      score: preferred.includes(item.id)
        ? preferred.indexOf(item.id)
        : preferred.length + (item.kind === page.kind ? 0 : 1),
    }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getModelContextPages(model, pages) {
  if (!model) return [];

  const candidates = [
    {
      id: `brand-${String(model.brand ?? "").trim().toLocaleLowerCase("ru-RU")}`,
      label: `Кронштейны для телевизоров ${model.brand}`,
    },
    {
      id: `diagonal-${Number(model.diagonal_inches)}`,
      label: `Кронштейны для телевизоров ${Number(model.diagonal_inches)}″`,
    },
    {
      id: `vesa-${model.vesa_width_mm}x${model.vesa_height_mm}`,
      label: `Модели с VESA ${model.vesa_width_mm}×${model.vesa_height_mm}`,
    },
  ];

  return candidates.flatMap((candidate) => {
    const page = pages.find((item) => item.id === candidate.id && isIndexableSeoPage(item));
    return page ? [{ ...candidate, path: page.path }] : [];
  });
}

function preferredRelatedIds(pageId) {
  if (pageId.startsWith("mount-brand-")) {
    return [
      "buy-tv-mount",
      "extendable-mount",
      "full-motion-mount",
      "tilt-mount",
      "mount-brand-onkron",
      "mount-brand-kromax",
      "mount-brand-holder",
      "mount-brand-itechmount",
    ];
  }
  if (pageId.startsWith("brand-")) {
    return [
      "diagonal-50",
      "diagonal-55",
      "diagonal-75",
      "vesa-300x300",
      "vesa-400x400",
      "brand-lg",
      "brand-samsung",
      "brand-hisense",
      "brand-tcl",
      "brand-xiaomi",
    ];
  }
  if (pageId.startsWith("diagonal-")) {
    return [
      "buy-tv-mount",
      "mounting-height",
      "vesa",
      "brand-lg",
      "brand-samsung",
      "brand-hisense",
      "brand-tcl",
      "brand-xiaomi",
    ];
  }
  if (/^vesa-\d+x\d+$/i.test(pageId)) {
    return [
      "vesa",
      "how-to-find-vesa",
      "buy-tv-mount",
      "diagonal-50",
      "diagonal-55",
      "diagonal-75",
      "brand-lg",
      "brand-samsung",
    ];
  }

  const groups = {
    "wall-mounted-tv": ["mounting-map", "tv-zone-sockets", "vesa", "full-motion-mount", "mounting-height"],
    "mounting-map": ["tv-zone-sockets", "wall-mounted-tv", "mounting-height", "vesa", "how-to-find-vesa"],
    "tv-zone-sockets": ["mounting-map", "wall-mounted-tv", "mounting-height", "vesa"],
    vesa: ["wall-mounted-tv", "how-to-find-vesa", "vesa-200x200"],
    "fixed-mount": ["buy-tv-mount", "wall-mounted-tv", "tilt-mount", "full-motion-mount", "mounting-height"],
    "tilt-mount": ["buy-tv-mount", "mounting-height", "mounting-map", "wall-mounted-tv", "fixed-mount", "full-motion-mount"],
    "full-motion-mount": ["extendable-mount", "buy-tv-mount", "wall-mounted-tv", "fixed-mount", "tilt-mount", "mounting-height"],
    "buy-tv-mount": ["wall-mounted-tv", "extendable-mount", "mount-brand-onkron", "vesa", "fixed-mount", "tilt-mount"],
    "extendable-mount": ["buy-tv-mount", "full-motion-mount", "wall-mounted-tv", "mount-brand-onkron", "vesa", "mounting-map"],
    "how-to-find-vesa": ["vesa", "vesa-200x200", "vesa-300x200"],
    "mounting-height": ["mounting-map", "tilt-mount", "tv-zone-sockets", "wall-mounted-tv", "viewing-distance", "diagonal-55"],
    "viewing-distance": ["mounting-height", "diagonal-55", "full-motion-mount"],
  };
  return groups[pageId] ?? ["vesa", "how-to-find-vesa", "mounting-height"];
}
