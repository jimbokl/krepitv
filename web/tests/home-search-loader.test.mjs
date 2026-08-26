import assert from "node:assert/strict";
import test from "node:test";

test("главная загружает только компактный поисковый индекс", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  const payload = [
    {
      id: "tcl-55p6k",
      title: "TCL 55P6K",
      search: "tcl 55p6k",
      href: "/modeli/tcl-55p6k/",
    },
  ];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return {
      ok: true,
      async json() {
        return structuredClone(payload);
      },
    };
  };

  try {
    const { loadHomeSearch } = await import(`../src/lib/modelSearch.mjs?home-search=${Date.now()}`);
    assert.deepEqual(await loadHomeSearch(), payload);
    assert.deepEqual(requested, ["/data/model-search.json"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("главная оставляет SSR при повреждённом поисковом индексе", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { records: [] };
    },
  });

  try {
    const { loadHomeSearch } = await import(`../src/lib/modelSearch.mjs?invalid-search=${Date.now()}`);
    await assert.rejects(loadHomeSearch(), /Поисковый индекс моделей повреждён/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
