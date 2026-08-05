import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function modelOffer(entityId, rank) {
  const modelId = "tcl-55c7k";
  const placementId = `model-${modelId}-r0${rank}-${entityId}`;
  const vid = `krepitvmodel${modelId.replaceAll("-", "")}r0${rank}${entityId.replaceAll("-", "")}`;
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const clid = "12345678";
  const destination = new URL(`https://market.yandex.ru${pathname}`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    id: placementId,
    placement_id: placementId,
    model_id: modelId,
    model_path: `/modeli/${modelId}/`,
    rank,
    market_source_url: `https://market.yandex.ru${pathname}`,
    page_path: `/kronshteyny/${entityId}/`,
    entity_kind: "mount",
    entity_id: entityId,
    compliance_mode: "non_ad_storefront",
    clid,
    vid,
    affiliate_href: destination.toString(),
    page_name: "POKUPKI_PRODUCT",
    title: `Кронштейн ${entityId}`,
    product_photo: "https://avatars.mds.yandex.net/get-mpic/1/example.jpeg/optimize",
    checked_at: new Date().toISOString(),
    eligibility: "publishable",
    publishable: true,
    creative: null,
  };
}

function mount(id, brand, mechanism) {
  return {
    id,
    brand,
    title: `${brand} ${id}`,
    mechanism,
    vesa: ["300x300"],
    max_load_kg: 50,
    min_diagonal_in: 43,
    max_diagonal_in: 75,
    wall_distance_min_mm: 45,
    wall_distance_max_mm: mechanism === "full-motion" ? 420 : 45,
    source_url: `https://example.com/${id}`,
    checked_at: "2026-07-30",
  };
}

test("карточка модели выводит только три model-specific CTA, а полный список остаётся внутренним", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { ModelPage } = await vite.ssrLoadModule("/src/pages/ModelPage.jsx");
    const model = {
      id: "tcl-55c7k",
      brand: "TCL",
      model: "55C7K",
      title: "TCL 55C7K",
      series: "C7K",
      model_year: 2025,
      diagonal_inches: 55,
      weight_kg: 13.3,
      vesa_width_mm: 300,
      vesa_height_mm: 300,
      wall_mount_screws: {
        groups: [{ location: "Стандартная схема VESA", thread: "M6", length_mm: 16, quantity: 4 }],
        requires_adapters: false,
        source_region: "Россия",
        source_url: "https://www.tcl.com/ru/ru/support-tv/model/55c7k",
        source_label: "Российское руководство TCL C7K, стр. 26",
        checked_at: "2026-07-31",
        note: "Альтернативную двухточечную схему нельзя смешивать со стандартной VESA 300×300.",
      },
      width_mm: 1226,
      height_mm: 710,
      depth_mm: 55.9,
      source_url: "https://www.tcl.com/ru/ru/tvs/55c7k",
      checked_at: "2026-07-30",
    };
    const mounts = [
      mount("kromax-atlantis-45", "KROMAX", "full-motion"),
      mount("kromax-dix-18", "KROMAX", "full-motion"),
      mount("kromax-flat-4", "KROMAX", "fixed"),
      mount("onkron-tm6", "ONKRON", "tilt"),
      mount("holder-conditional", "Holder", "fixed"),
    ];
    const compatibilityEdges = mounts.map((item, index) => ({
      tv_id: model.id,
      mount_id: item.id,
      compatible: true,
      fit_status: index === mounts.length - 1 ? "conditional-fit" : "verified-fit",
      reasons: ["VESA совпадает", "Запас нагрузки достаточен"],
      warnings: index === mounts.length - 1 ? ["Нужна проверка диагонали"] : [],
      required_load_kg: 16.7,
    }));
    const catalog = {
      models: [model],
      mounts,
      search: [],
      seoPages: [],
      commercialProfiles: [],
      compatibilityEdges,
      affiliateOffers: [{
        ...modelOffer("onkron-tm6", 1),
        id: "market-onkron-tm6",
        placement_id: undefined,
        model_id: undefined,
        model_path: undefined,
      }],
      hubAffiliateOffers: [],
      modelAffiliateOffers: [
        modelOffer("kromax-dix-18", 2),
        modelOffer("kromax-atlantis-45", 1),
        modelOffer("kromax-flat-4", 3),
      ],
    };
    const html = renderToStaticMarkup(
      React.createElement(ModelPage, { catalog, modelId: model.id }),
    );

    assert.equal((html.match(/href="https:\/\/market\.yandex\.ru\/card\//g) ?? []).length, 3);
    assert.equal((html.match(/data-affiliate-placement-id="model-tcl-55c7k-/g) ?? []).length, 3);
    assert.deepEqual(
      [...html.matchAll(/data-affiliate-rank="(\d)"/g)].map((match) => Number(match[1])),
      [1, 2, 3],
    );
    assert.equal((html.match(/rel="sponsored nofollow noopener noreferrer"/g) ?? []).length, 3);
    assert.equal(html.includes("Подробнее о совместимости"), false);
    for (const item of mounts) {
      assert.equal(html.includes(`Кронштейн ${item.title}`), true);
    }
    assert.equal((html.match(/data-mount-detail-placement="featured_result"/g) ?? []).length, 6);
    assert.equal((html.match(/data-mount-detail-placement="compatibility_result"/g) ?? []).length, mounts.length);
    assert.equal(html.includes("data-affiliate-placement-id=\"market-onkron-tm6\""), false);
    assert.equal(html.includes("data-wall-mount-screws=\"true\""), true);
    assert.equal(html.includes("data-compatibility-proof=\"true\""), true);
    assert.equal(html.includes("Точная пара 300×300 мм"), true);
    assert.equal(html.includes("Подтверждено: 4"), true);
    assert.equal(html.includes("Дополнительно условных вариантов: 1"), true);
    assert.equal(html.includes("Нужна проверка диагонали"), true);
    assert.equal(html.includes("Какие винты нужны для TCL 55C7K"), true);
    assert.equal(html.includes("4 шт. · M6×16 мм"), true);
    assert.equal(html.includes("Это паспортный размер винта, а не глубина резьбового отверстия"), true);
    assert.equal(html.includes("Российское руководство TCL C7K, стр. 26"), true);
    assert.equal(html.includes("href=\"/vinty-dlya-krepleniya-televizora/\""), true);
    for (const fragment of [
      "Партнёрская ссылка на Яндекс Маркет",
      "Если вы оформите заказ",
      "Крепи ТВ может получить вознаграждение",
      "Цена для вас не меняется",
    ]) {
      assert.equal(html.includes(fragment), false);
    }
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});

test("паспорт Hisense отличает диапазон L от полной длины и показывает конфликт VESA", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { WallMountScrews } = await vite.ssrLoadModule("/src/components/WallMountScrews.jsx");
    const { ModelFacts } = await vite.ssrLoadModule("/src/components/ModelFacts.jsx");
    const model = {
      title: "Hisense 55U7S PRO",
      vesa_width_mm: 400,
      vesa_height_mm: 300,
      weight_kg: 14.1,
      diagonal_inches: 55,
      wall_mount_screws: {
        groups: [{
          location: "Четыре точки по руководству",
          thread: "M6",
          engagement_min_mm: 9.5,
          engagement_max_mm: 11.5,
          quantity: 4,
        }],
        requires_adapters: false,
        required_parts_note: "Установите промежуточные вставки.",
        vesa_conflict: {
          catalog_value: "400×300 мм",
          manual_value: "400×400 мм",
          note: "Сверьте отверстия на своём экземпляре.",
        },
        source_region: "Россия",
        source_url: "https://cdn.hisense.ru/manual.pdf",
        source_label: "Российское руководство Hisense",
        checked_at: "2026-07-31",
        note: "Официальные источники расходятся.",
      },
    };

    const passport = renderToStaticMarkup(React.createElement(WallMountScrews, { model }));
    const facts = renderToStaticMarkup(React.createElement(ModelFacts, { model }));
    const detailedFacts = renderToStaticMarkup(React.createElement(ModelFacts, { detailed: true, model }));

    assert.equal(passport.includes("data-vesa-source-conflict=\"true\""), true);
    assert.equal(passport.includes("4 шт. · M6 · диапазон L 9,5–11,5 мм"), true);
    assert.equal(passport.includes("не готовая полная длина винта"), true);
    assert.equal(passport.includes("Установите промежуточные вставки"), true);
    assert.equal(facts.includes("Проверить: 400×300 мм / 400×400 мм"), true);
    assert.equal(detailedFacts.includes("data-model-facts=\"detailed\""), true);
    assert.equal(detailedFacts.includes("sm:grid-cols-[2.5rem_minmax(7rem,1fr)_minmax(0,1fr)]"), true);
    assert.equal(detailedFacts.includes("[overflow-wrap:anywhere]"), true);
    assert.equal(passport.includes("M6×9"), false);
    const samsung = {
      title: "Samsung UE55U8000FUXRU",
      wall_mount_screws: {
        groups: [{
          location: "Четыре точки VESA",
          thread: "M8",
          engagement_min_mm: 23,
          engagement_max_mm: 25,
          range_label: "C",
          quantity: 4,
        }],
        source_region: "Россия",
        source_url: "https://org.downloadcenter.samsung.com/manual.pdf",
        source_label: "Руководство Samsung U8000F",
        checked_at: "2026-07-31",
        note: "Полная длина и наличие проставок не указаны.",
      },
    };
    const samsungPassport = renderToStaticMarkup(
      React.createElement(WallMountScrews, { model: samsung }),
    );

    assert.equal(samsungPassport.includes("4 шт. · M8 · диапазон C 23–25 мм"), true);
    assert.equal(samsungPassport.includes("data-adapter-status=\"unknown\""), true);
    assert.equal(samsungPassport.includes("после монтажной пластины"), true);
    assert.equal(samsungPassport.includes("M8×23"), false);
    assert.equal(samsungPassport.includes("адаптеры VESA.</p>"), false);

    const p6k = {
      title: "TCL 55P6K",
      wall_mount_screws: {
        groups: [
          { location: "Верхний ряд", thread: "M6", length_unknown: true, quantity: 2 },
          { location: "Нижний ряд", thread: "M6", length_unknown: true, quantity: 2 },
        ],
        required_parts_note: "Не используйте M6×12 из раздела защиты от опрокидывания как винты VESA.",
        source_region: "Япония",
        source_url: "https://static-obg.tcl.com/p6k-manual.pdf",
        source_label: "Официальное руководство TCL P6K",
        secondary_source_url: "https://static-obg.tcl.com/p6k-drawing.pdf",
        secondary_source_label: "Официальный размерный чертёж TCL 55P6K",
        checked_at: "2026-07-31",
        note: "Руководство указывает 11–28 мм, а чертёж — максимум 26 мм.",
      },
    };
    const p6kPassport = renderToStaticMarkup(
      React.createElement(WallMountScrews, { model: p6k }),
    );
    assert.equal((p6kPassport.match(/M6 · длина не определена/gu) ?? []).length, 2);
    assert.equal(p6kPassport.includes("не дают единой безопасной длины"), true);
    assert.equal(p6kPassport.includes("дополнительный официальный источник"), true);
    assert.equal(p6kPassport.includes("data-adapter-status=\"unknown\""), true);
    assert.equal(p6kPassport.includes("Не используйте M6×12"), true);

    const p7k = {
      title: "TCL 55P7K",
      wall_mount_screws: {
        groups: [
          { location: "Группа M6×16 — ряд не указан", thread: "M6", length_mm: 16, quantity: 2 },
          { location: "Группа M6×30 — ряд не указан", thread: "M6", length_mm: 30, quantity: 2 },
        ],
        required_parts_note: "Документ не распределяет пары по рядам.",
        source_region: "Новая Зеландия",
        source_url: "https://static-obg.tcl.com/55p7k-specification.pdf",
        source_label: "Официальная спецификация TCL 55P7K",
        checked_at: "2026-07-31",
        note: "Перед установкой нужно сверить руководство российского экземпляра.",
      },
    };
    const p7kPassport = renderToStaticMarkup(
      React.createElement(WallMountScrews, { model: p7k }),
    );
    assert.equal(p7kPassport.includes("2 шт. · M6×16 мм"), true);
    assert.equal(p7kPassport.includes("2 шт. · M6×30 мм"), true);
    assert.equal(p7kPassport.includes("ряд не указан"), true);
    assert.equal(p7kPassport.includes("регион: Новая Зеландия"), true);
  } finally {
    await vite.close();
  }
});
