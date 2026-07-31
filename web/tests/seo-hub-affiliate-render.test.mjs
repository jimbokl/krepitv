import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function offer(entityId, rank) {
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const clid = "12345678";
  const vid = `hub${entityId.replaceAll("-", "")}`;
  const destination = new URL(`https://market.yandex.ru${pathname}`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    id: `market-hub-${entityId}`,
    placement_id: `seo-hub-buy-tv-mount-r0${rank}-${entityId}`,
    hub_id: "buy-tv-mount",
    hub_path: "/kupit-kronshteyn-dlya-televizora/",
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

test("финальный React DOM ставит проверенный каталог раньше трёх безопасных CTA", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { SeoPage } = await vite.ssrLoadModule("/src/pages/SeoPage.jsx");
    const ids = ["itech-plb440nt", "itech-ptrb440ln", "itech-slt-460"];
    const mounts = ids.map((id, index) => ({
      id,
      brand: "iTECHmount",
      title: `iTECHmount ${id}`,
      mechanism: index === 0 ? "tilt" : "full-motion",
      max_load_kg: 40,
      min_diagonal_in: 32,
      max_diagonal_in: 75,
      wall_distance_min_mm: 50,
      wall_distance_max_mm: 400,
      source_url: `https://example.com/${id}`,
    }));
    const page = {
      id: "buy-tv-mount",
      path: "/kupit-kronshteyn-dlya-televizora/",
      kind: "commercial",
      indexable: true,
      title: "Сравнение кронштейнов",
      description: "Проверенное сравнение кронштейнов.",
      h1: "Сравнить кронштейны для телевизора",
      lead: "Сначала проверяем совместимость, затем открываем точную карточку.",
      facts: ["Проверить VESA", "Проверить нагрузку", "Проверить диагональ"],
      faq: [["Как выбрать?", "Сверить три технических параметра."]],
    };
    const catalog = {
      models: [],
      mounts,
      search: [],
      seoPages: [page],
      compatibilityEdges: [],
      commercialProfiles: [],
      affiliateOffers: [offer("foreign-product-offer", 1)],
      hubAffiliateOffers: ids.map((id, index) => offer(id, index + 1)),
    };
    const advertisingOffer = catalog.hubAffiliateOffers[0];
    const advertisingHref = new URL(advertisingOffer.affiliate_href);
    advertisingHref.searchParams.set("erid", "eridHubFixture123");
    catalog.hubAffiliateOffers[0] = {
      ...advertisingOffer,
      affiliate_href: advertisingHref.toString(),
      compliance_mode: "advertising",
      creative: {
        erid: "eridHubFixture123",
        disclosure: {
          label: "Реклама",
          advertiser_name: "ООО «Яндекс Маркет»",
          advertiser_inn: "9704254424",
        },
      },
    };
    const html = renderToStaticMarkup(
      React.createElement(SeoPage, { catalog, page, requestedPath: page.path }),
    );

    assert.ok(html.indexOf("Кронштейны из проверенного каталога") < html.indexOf("data-affiliate-hub"));
    assert.ok(html.indexOf("data-affiliate-hub") < html.indexOf("Частые вопросы"));
    assert.equal((html.match(/data-affiliate-mode="non_ad_storefront"/g) ?? []).length, 4);
    assert.equal((html.match(/data-affiliate-mode="advertising"/g) ?? []).length, 2);
    assert.equal((html.match(/data-erid="eridHubFixture123"/g) ?? []).length, 2);
    assert.equal(html.includes("Реклама · ООО «Яндекс Маркет» · ИНН 9704254424 · erid: eridHubFixture123"), true);
    assert.equal(html.includes("erid=eridHubFixture123"), true);
    assert.equal((html.match(/href="https:\/\/market\.yandex\.ru\/card\//g) ?? []).length, 3);
    assert.equal((html.match(/rel="sponsored nofollow noopener noreferrer"/g) ?? []).length, 3);
    assert.equal((html.match(/target="_blank"/g) ?? []).length >= 3, true);
    assert.equal((html.match(/data-affiliate-compact="true"/g) ?? []).length, 3);
    const hubHtml = html.slice(
      html.indexOf("data-affiliate-hub"),
      html.indexOf("Частые вопросы"),
    );
    assert.equal(hubHtml.includes("<img"), false);
    assert.equal(hubHtml.includes("Карточка получена через API Маркета"), false);
    assert.equal(hubHtml.includes("Изображение Маркета временно недоступно"), false);
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

test("ONKRON hub shows comparison and internal verification before Market exit", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { SeoPage } = await vite.ssrLoadModule("/src/pages/SeoPage.jsx");
    const mounts = [
      ["onkron-tm6", "ONKRON TM6", "tilt"],
      ["onkron-m6l", "ONKRON M6L-B", "full-motion"],
      ["onkron-m4s", "ONKRON M4S-B", "full-motion"],
      ["onkron-tm4", "ONKRON TM4-B", "tilt"],
      ["onkron-tm5-bw", "ONKRON TM5-BW", "tilt"],
    ].map(([id, title, mechanism]) => ({
      id,
      brand: "ONKRON",
      title,
      mechanism,
      max_load_kg: 60,
      min_diagonal_in: 32,
      max_diagonal_in: 75,
      wall_distance_min_mm: 35,
      wall_distance_max_mm: 145,
      vesa: ["100x100", "200x200", "300x300", "400x400"],
      source_url: `https://example.com/${id}`,
    }));
    const page = {
      id: "mount-brand-onkron",
      path: "/kronshteyny-onkron/",
      kind: "mount-brand",
      indexable: true,
      title: "Кронштейны ONKRON для телевизоров",
      description: "Сравнение проверенных кронштейнов ONKRON.",
      h1: "Кронштейны ONKRON для телевизоров",
      lead: "Точные модели и проверенные характеристики.",
      facts: ["Проверить VESA", "Проверить нагрузку", "Проверить диагональ"],
      faq: [["Как выбрать?", "Сверить точную модель телевизора."]],
    };
    const hubOffers = mounts.slice(0, 2).map((mount, index) => ({
      ...offer(mount.id, index + 1),
      placement_id: `seo-hub-mount-brand-onkron-r0${index + 1}-${mount.id}`,
      hub_id: page.id,
      hub_path: page.path,
    }));
    const catalog = {
      models: [],
      mounts,
      search: [],
      seoPages: [page],
      compatibilityEdges: [],
      commercialProfiles: [],
      affiliateOffers: [],
      hubAffiliateOffers: hubOffers,
    };
    const html = renderToStaticMarkup(
      React.createElement(SeoPage, { catalog, page, requestedPath: page.path }),
    );

    assert.ok(html.indexOf("data-mount-comparison=\"true\"") < html.indexOf("data-affiliate-hub"));
    assert.ok(html.indexOf("data-affiliate-hub") < html.indexOf("id=\"seo-model-search\""));
    assert.equal((html.match(/data-mount-comparison-item=/g) ?? []).length, 5);
    assert.equal((html.match(/Проверить VESA и нагрузку/g) ?? []).length, 2);
    assert.equal((html.match(/href=\"\/kronshteyny\/onkron-/g) ?? []).length >= 7, true);
    assert.equal((html.match(/href=\"https:\/\/market\.yandex\.ru\/card\//g) ?? []).length, 2);
    assert.equal(html.includes("100×100 · 200×200 · 300×300 · 400×400"), true);
  } finally {
    await vite.close();
  }
});
