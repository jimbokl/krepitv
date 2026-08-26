import assert from "node:assert/strict";
import test from "node:test";
import { bootClient } from "../src/lib/clientBoot.mjs";

test("страница доверия отрисовывается сразу и не загружает каталог", async () => {
  let loadCalls = 0;
  let renderCalls = 0;

  const boot = bootClient({
    rootElement: { dataset: { pageKind: "trust" } },
    loadCatalog() {
      loadCalls += 1;
      return new Promise(() => {});
    },
    render(catalog) {
      renderCalls += 1;
      assert.equal(catalog, undefined);
    },
  });

  assert.equal(loadCalls, 0);
  assert.equal(renderCalls, 1);
  assert.deepEqual(await boot, { status: "rendered" });
});

test("страница 404 сохраняет полезный статический DOM после загрузки JavaScript", async () => {
  let loadCalls = 0;
  let renderCalls = 0;
  const rootElement = {
    dataset: { pageKind: "not-found" },
    innerHTML: '<main data-not-found-page="true">Страница не найдена</main>',
  };

  const result = await bootClient({
    rootElement,
    loadCatalog() {
      loadCalls += 1;
      return Promise.resolve({});
    },
    render() {
      renderCalls += 1;
    },
  });

  assert.deepEqual(result, { status: "static" });
  assert.equal(loadCalls, 0);
  assert.equal(renderCalls, 0);
  assert.match(rootElement.innerHTML, /data-not-found-page="true"/);
});

test("главная усиливает только поисковый island и не заменяет корневой SSR", async () => {
  const island = { innerHTML: '<a href="/modeli/">Открыть каталог</a>' };
  const rootElement = {
    dataset: { pageKind: "home" },
    innerHTML: '<main><section data-home-search-island="true"></section></main>',
    querySelector(selector) {
      return selector === '[data-home-search-island="true"]' ? island : null;
    },
  };
  const originalRootHtml = rootElement.innerHTML;
  const search = [{ id: "tcl-55p6k", title: "TCL 55P6K", search: "tcl 55p6k" }];
  let catalogLoads = 0;
  let fullRenders = 0;
  let searchLoads = 0;
  let renderedIsland;
  let renderedSearch;

  const result = await bootClient({
    rootElement,
    loadCatalog() {
      catalogLoads += 1;
      return Promise.resolve({});
    },
    render() {
      fullRenders += 1;
    },
    loadHomeSearch() {
      searchLoads += 1;
      return Promise.resolve(search);
    },
    renderHome(target, value) {
      renderedIsland = target;
      renderedSearch = value;
    },
  });

  assert.deepEqual(result, { status: "enhanced" });
  assert.equal(catalogLoads, 0);
  assert.equal(fullRenders, 0);
  assert.equal(searchLoads, 1);
  assert.equal(renderedIsland, island);
  assert.equal(renderedSearch, search);
  assert.equal(rootElement.innerHTML, originalRootHtml);
});

test("модель усиливает только блок предложений и сохраняет паспортный SSR", async () => {
  const island = { innerHTML: "Проверяем предложения" };
  const rootElement = {
    dataset: { pageKind: "model" },
    innerHTML: '<header>Навигация</header><main><h1>Кронштейн для TCL 55C6K</h1></main>',
    querySelector(selector) {
      return selector === '[data-model-offers-island="true"]' ? island : null;
    },
  };
  const originalRootHtml = rootElement.innerHTML;
  const offers = [{ id: "offer-1" }];
  let fullRenders = 0;
  let catalogLoads = 0;

  const result = await bootClient({
    rootElement,
    loadCatalog() {
      catalogLoads += 1;
      return Promise.resolve({});
    },
    render() {
      fullRenders += 1;
    },
    loadIslandData: () => Promise.resolve(offers),
    renderIsland(target, value) {
      assert.equal(target, island);
      assert.equal(value, offers);
    },
  });

  assert.deepEqual(result, { status: "enhanced" });
  assert.equal(catalogLoads, 0);
  assert.equal(fullRenders, 0);
  assert.equal(rootElement.innerHTML, originalRootHtml);
});

test("на остальных страницах статический DOM сохраняется до готовности каталога", async () => {
  let resolveCatalog;
  let renderedCatalog;
  const catalog = { models: [], mounts: [], search: [], seoPages: [] };
  const rootElement = { dataset: { pageKind: "seo" }, innerHTML: "<main>Статическая страница</main>" };

  const boot = bootClient({
    rootElement,
    loadCatalog: () => new Promise((resolve) => {
      resolveCatalog = resolve;
    }),
    render(value) {
      renderedCatalog = value;
    },
  });

  assert.equal(renderedCatalog, undefined);
  assert.equal(rootElement.innerHTML, "<main>Статическая страница</main>");

  resolveCatalog(catalog);
  assert.deepEqual(await boot, { status: "rendered" });
  assert.equal(renderedCatalog, catalog);
});

test("ошибка каталога оставляет статический DOM и не запускает React", async () => {
  const error = new Error("Сеть недоступна");
  const rootElement = { dataset: { pageKind: "seo" }, innerHTML: "<main>Статическая страница</main>" };
  let reportedError;

  const result = await bootClient({
    rootElement,
    loadCatalog: () => Promise.reject(error),
    render() {
      assert.fail("React не должен запускаться при ошибке каталога");
    },
    onError(value) {
      reportedError = value;
    },
  });

  assert.equal(result.status, "static");
  assert.equal(result.error, error);
  assert.equal(reportedError, error);
  assert.equal(rootElement.innerHTML, "<main>Статическая страница</main>");
});
