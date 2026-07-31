import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseCommercialProfiles,
  selectCommercialProfile,
} from "../src/lib/commercialProfiles.mjs";

function profile(overrides = {}) {
  return {
    entity_kind: "model",
    entity_id: "tcl-55c6k",
    path: "/modeli/tcl-55c6k/",
    title: "Кронштейн для TCL 55C6K: проверка VESA",
    description: "Проверенная совместимость TCL 55C6K с кронштейнами из каталога.",
    kicker: "Ответ по модели",
    heading: "Какой кронштейн подходит для TCL 55C6K",
    answer: "Сначала совпадают размеры VESA, затем проверяются нагрузка и диапазон диагонали.",
    faq: [
      { question: "Как проверить VESA?", answer: "Сверьте расстояние между крепёжными отверстиями." },
      { question: "Нужен ли запас нагрузки?", answer: "Да, каталог проверяет нагрузку с запасом." },
      { question: "Подойдёт любой механизм?", answer: "Механизм выбирают с учётом стены и сценария просмотра." },
    ],
    ...overrides,
  };
}

function payload(profiles = [profile()]) {
  return { schema_version: 1, updated_at: "2026-07-31", profiles };
}

test("строгая схема очищает текст и сохраняет безопасный профиль", () => {
  const parsed = parseCommercialProfiles(payload([
    profile({ kicker: "  Ответ по модели  " }),
  ]));

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].kicker, "Ответ по модели");
  assert.equal(parsed[0].faq.length, 3);
});

test("публичный набор коммерческих профилей проходит клиентскую схему", async () => {
  const source = JSON.parse(
    await readFile(new URL("../../data/commercial_profiles.json", import.meta.url), "utf8"),
  );
  const profiles = parseCommercialProfiles(source);

  assert.equal(profiles.length, 11);
  assert.equal(new Set(profiles.map((item) => item.path)).size, profiles.length);
});

test("валидатор отклоняет массив вместо версионированного объекта", () => {
  assert.throws(
    () => parseCommercialProfiles([profile()]),
    /ожидался объект/,
  );
});

test("валидатор отклоняет несовпадающий путь и повтор сущности", () => {
  assert.throws(
    () => parseCommercialProfiles(payload([profile({ path: "/kronshteyny/tcl-55c6k/" })])),
    /путь не соответствует/,
  );
  assert.throws(
    () => parseCommercialProfiles(payload([profile(), profile()])),
    /профиль сущности повторяется/,
  );
});

test("валидатор не пропускает денежные значения и неполный FAQ", () => {
  assert.throws(
    () => parseCommercialProfiles(payload([profile({ answer: "Предложение стоит 1000 рублей." })])),
    /денежные значения/,
  );
  assert.throws(
    () => parseCommercialProfiles(payload([profile({ faq: profile().faq.slice(0, 2) })])),
    /ровно три вопроса/,
  );
});

test("селектор требует точного типа, id и канонического пути", () => {
  const profiles = parseCommercialProfiles(payload());
  assert.equal(
    selectCommercialProfile(profiles, {
      entityKind: "model",
      entityId: "tcl-55c6k",
      pagePath: "/modeli/tcl-55c6k/",
    })?.heading,
    "Какой кронштейн подходит для TCL 55C6K",
  );
  assert.equal(
    selectCommercialProfile(profiles, {
      entityKind: "mount",
      entityId: "tcl-55c6k",
      pagePath: "/modeli/tcl-55c6k/",
    }),
    null,
  );
});

test("catalog loader прокидывает проверенные профили в состояние", async () => {
  const originalFetch = globalThis.fetch;
  const responses = new Map([
    ["/data/tv-models.json", []],
    ["/data/mounts.json", []],
    ["/data/model-search.json", []],
    ["/data/seo-pages.json", []],
    ["/data/compatibility-graph.json", []],
    ["/data/commercial-profiles.json", payload()],
  ]);
  globalThis.fetch = async (url) => ({
    ok: responses.has(String(url)),
    async json() {
      return structuredClone(responses.get(String(url)));
    },
  });

  try {
    const { loadCatalog } = await import(`../src/lib/catalog.js?profiles=${Date.now()}`);
    const catalog = await loadCatalog();
    assert.equal(catalog.commercialProfiles.length, 1);
    assert.equal(catalog.commercialProfiles[0].entity_id, "tcl-55c6k");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("компонент имеет стабильный marker, FAQ под катом и стоит перед предложением", async () => {
  const [component, modelPage, mountPage, hook] = await Promise.all([
    readFile(new URL("../src/components/CommercialProfile.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ModelPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/MountPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useCatalog.js", import.meta.url), "utf8"),
  ]);

  assert.match(component, /data-commercial-profile=\{marker\}/);
  assert.match(component, /<details/);
  assert.ok(modelPage.indexOf("<CommercialProfile profile={commercialProfile} />") < modelPage.indexOf("<MountMatches"));
  assert.ok(mountPage.indexOf("<CommercialProfile profile={commercialProfile} />") < mountPage.indexOf("{affiliateOffer ?"));
  assert.match(hook, /commercialProfiles: \[\]/);
});
