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

function preferredRelatedIds(pageId) {
  const groups = {
    "wall-mounted-tv": ["mounting-map", "vesa", "full-motion-mount", "mounting-height"],
    "mounting-map": ["wall-mounted-tv", "mounting-height", "vesa", "how-to-find-vesa"],
    vesa: ["wall-mounted-tv", "how-to-find-vesa", "vesa-200x200"],
    "vesa-200x200": ["vesa", "how-to-find-vesa", "diagonal-55"],
    "vesa-300x200": ["vesa", "how-to-find-vesa", "diagonal-55"],
    "diagonal-55": ["wall-mounted-tv", "mounting-height", "vesa"],
    "fixed-mount": ["wall-mounted-tv", "full-motion-mount", "mounting-height"],
    "full-motion-mount": ["wall-mounted-tv", "fixed-mount", "mounting-height"],
    "how-to-find-vesa": ["vesa", "vesa-200x200", "vesa-300x200"],
    "mounting-height": ["mounting-map", "wall-mounted-tv", "viewing-distance", "diagonal-55"],
    "viewing-distance": ["mounting-height", "diagonal-55", "full-motion-mount"],
  };
  return groups[pageId] ?? ["vesa", "how-to-find-vesa", "mounting-height"];
}
