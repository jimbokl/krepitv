export function isIndexableSeoPage(page) {
  return page?.indexable === true;
}

export function getRelatedPages(page, pages, limit = 6) {
  return pages
    .filter((item) => item.id !== page.id && isIndexableSeoPage(item))
    .map((item, index) => ({
      item,
      index,
      score: item.kind === page.kind ? 0 : 1,
    }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, limit)
    .map(({ item }) => item);
}
