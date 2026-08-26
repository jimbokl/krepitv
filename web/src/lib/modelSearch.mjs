let homeSearchPromise;

export function normalizeSearch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function filterModelSearchResults(search, value, limit = 5) {
  const normalized = normalizeSearch(value);
  if (!normalized) return [];

  return search
    .filter((item) => normalizeSearch(item.search).includes(normalized))
    .slice(0, limit);
}

export function findExactModelSearchResult(search, value) {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;

  return search.find(
    (item) => normalizeSearch(item.title) === normalized,
  ) ?? null;
}

export function loadHomeSearch() {
  if (!homeSearchPromise) {
    homeSearchPromise = fetch("/data/model-search.json")
      .then(assertResponse)
      .then((response) => response.json())
      .then((search) => {
        if (!Array.isArray(search)) {
          throw new Error("Поисковый индекс моделей повреждён.");
        }
        return search;
      });
  }
  return homeSearchPromise;
}

function assertResponse(response) {
  if (!response.ok) {
    throw new Error(`Не удалось загрузить каталог: ${response.status}`);
  }
  return response;
}
