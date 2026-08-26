export function bootClient({
  rootElement,
  loadCatalog,
  render,
  loadHomeSearch,
  renderHome,
  loadIslandData,
  renderIsland,
  onError = reportLoadError,
}) {
  if (!rootElement) {
    throw new Error("Не найден корневой элемент приложения.");
  }

  if (rootElement.dataset.pageKind === "not-found") {
    return Promise.resolve({ status: "static" });
  }

  if (rootElement.dataset.pageKind === "trust") {
    render();
    return Promise.resolve({ status: "rendered" });
  }

  if (rootElement.dataset.pageKind === "home") {
    const island = rootElement.querySelector?.('[data-home-search-island="true"]');
    if (!island || typeof loadHomeSearch !== "function" || typeof renderHome !== "function") {
      return Promise.resolve({ status: "static" });
    }
    return loadHomeSearch().then(
      (search) => {
        renderHome(island, search);
        return { status: "enhanced" };
      },
      (error) => {
        onError(error);
        return { status: "static", error };
      },
    );
  }

  const islandSelector = {
    matcher: '[data-guided-selection-island="true"]',
    model: '[data-model-offers-island="true"]',
  }[rootElement.dataset.pageKind];
  if (islandSelector) {
    const island = rootElement.querySelector?.(islandSelector);
    if (!island || typeof loadIslandData !== "function" || typeof renderIsland !== "function") {
      return Promise.resolve({ status: "static" });
    }
    return loadIslandData().then(
      (data) => {
        renderIsland(island, data);
        return { status: "enhanced" };
      },
      (error) => {
        onError(error);
        return { status: "static", error };
      },
    );
  }

  return loadCatalog().then(
    (catalog) => {
      render(catalog);
      return { status: "rendered" };
    },
    (error) => {
      onError(error);
      return { status: "static", error };
    },
  );
}

function reportLoadError(error) {
  console.error("Не удалось подключить интерактивный режим; оставлен статический контент.", error);
}
