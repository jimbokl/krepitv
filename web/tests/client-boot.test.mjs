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

test("статический DOM сохраняется до готовности каталога", async () => {
  let resolveCatalog;
  let renderedCatalog;
  const catalog = { models: [], mounts: [], search: [], seoPages: [] };
  const rootElement = { dataset: { pageKind: "home" }, innerHTML: "<main>Статическая страница</main>" };

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
