import visualPages from "../../../data/internal_visual_pages.json" with { type: "json" };

const visualByPageId = new Map();

for (const [name, theme] of Object.entries(visualPages)) {
  for (const id of theme.ids) {
    if (visualByPageId.has(id)) {
      throw new Error(`Повтор страницы во внутренней визуальной когорте: ${id}`);
    }
    visualByPageId.set(id, { name, src: theme.src, alt: theme.alt, caption: theme.caption });
  }
}

export function getInternalVisual(pageId) {
  return visualByPageId.get(pageId) ?? null;
}

export function internalVisualCount() {
  return visualByPageId.size;
}
