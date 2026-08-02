export function bootClient({ rootElement, loadCatalog, render, onError = reportLoadError }) {
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
