import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function match(id, brand, fitStatus, score, warning = "") {
  return {
    compatible: true,
    fit_status: fitStatus,
    score,
    mount: { id, brand, title: `${brand} ${id}` },
    reasons: ["VESA совпадает", "Запас нагрузки достаточен", "Механизм подходит"],
    warnings: warning ? [warning] : [],
  };
}

test("результат подбора сначала показывает три проверенных варианта, остальные — по брендам под катом", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const {
      CompatibilityResult,
      rankCompatibilityMatches,
      verifiedCompatibilityMatches,
    } = await vite.ssrLoadModule(
      "/src/pages/GuidedSelectionPage.jsx",
    );
    const model = { id: "tcl-55c7k", title: "TCL 55C7K" };
    const matches = [
      match("conditional-a", "ONKRON", "conditional-fit", 200, "Сверьте диагональ"),
      match("verified-a", "KROMAX", "verified-fit", 120),
      match("verified-b", "ONKRON", "verified-fit", 118),
      match("conditional-b", "KROMAX", "conditional-fit", 90, "Диапазон пограничный"),
      match("verified-c", "ITECH", "verified-fit", 110),
      match("verified-d", "ONKRON", "verified-fit", 100),
      match("verified-e", "KROMAX", "verified-fit", 118),
    ];
    const availableOfferMountIds = new Set(["verified-e", "conditional-a"]);
    assert.deepEqual(
      verifiedCompatibilityMatches(matches).map((item) => item.mount.id),
      ["verified-a", "verified-b", "verified-c", "verified-d", "verified-e"],
    );
    const ranked = rankCompatibilityMatches(matches, availableOfferMountIds);
    assert.deepEqual(ranked.map((item) => item.mount.id), [
      "verified-a",
      "verified-e",
      "verified-b",
      "verified-c",
      "verified-d",
      "conditional-a",
      "conditional-b",
    ]);
    assert.deepEqual(
      rankCompatibilityMatches(matches, new Set()).map((item) => item.mount.id),
      [
        "verified-a",
        "verified-b",
        "verified-e",
        "verified-c",
        "verified-d",
        "conditional-a",
        "conditional-b",
      ],
    );
    assert.deepEqual(
      rankCompatibilityMatches([
        match("tie-a", "KROMAX", "verified-fit", 100),
        match("tie-b", "ONKRON", "verified-fit", 100),
      ]).map((item) => item.mount.id),
      ["tie-a", "tie-b"],
    );

    const html = renderToStaticMarkup(React.createElement(CompatibilityResult, {
      availableOfferMountIds,
      compatibility: { status: "ready" },
      matches,
      model,
    }));

    assert.equal((html.match(/data-result-tier="featured_result"/g) ?? []).length, 3);
    assert.equal((html.match(/data-result-tier="compatibility_result"/g) ?? []).length, 2);
    assert.equal(html.includes("data-result-catalog=\"collapsed\""), true);
    assert.equal(html.includes("Показать ещё 2 варианта по брендам"), true);
    assert.equal(html.includes("Подтверждённых вариантов: 5"), true);
    assert.equal(html.includes("Полностью проверены: 2"), true);
    assert.equal(html.includes("При одинаковой технической оценке"), true);
    assert.equal((html.match(/data-market-card-available="true"/g) ?? []).length, 1);
    assert.equal((html.match(/На момент проверки есть точная карточка на Маркете/g) ?? []).length, 1);
    assert.equal(html.includes("Кронштейнов: 1"), true);
    assert.equal(html.includes("Сверьте диагональ"), false);
    assert.equal(html.includes("Диапазон пограничный"), false);
    assert.equal((html.match(/href="\/kronshteyny\//g) ?? []).length, 5 * 2);
    assert.ok(html.indexOf("verified-a") < html.indexOf("verified-e"));
    assert.ok(html.indexOf("verified-e") < html.indexOf("verified-b"));
    assert.equal(html.includes("conditional-a"), false);
    assert.equal(html.includes("conditional-b"), false);
    assert.equal(html.includes("Найдено совместимых вариантов"), false);
    assert.equal(html.includes("Открыть карточку модели"), false);
    assert.equal(html.includes("https://market.yandex.ru"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);

    const errorHtml = renderToStaticMarkup(React.createElement(CompatibilityResult, {
      compatibility: { status: "error", error: "Локальный модуль недоступен" },
      matches: [],
      model,
      onRetry: () => {},
    }));
    assert.equal(errorHtml.includes('data-guided-compatibility-state="error"'), true);
    assert.equal(errorHtml.includes('role="alert"'), true);
    assert.equal(errorHtml.includes("Повторить проверку"), true);
  } finally {
    await vite.close();
  }
});

test("монтажный комплект показывает семь секций и не продаёт заблокированный результат", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { InstallationKitResult } = await vite.ssrLoadModule(
      "/src/components/installation-kit/InstallationKitResult.jsx",
    );
    const plan = {
      overall_status: "blocked",
      market_eligible: false,
      compatibility: { status: "blocked", reasons: [], warnings: ["Несовместимо"] },
      screws: { status: "needs-check", groups: [], warnings: ["Сверьте паспорт"] },
      wall_fixing: { status: "blocked", exact_fastener: null, warnings: ["Нет закладной"] },
      placement: {
        status: "verified",
        height: { bottom_height_cm: 80, center_height_cm: 121.6, top_height_cm: 163.2 },
        mounting_map: {
          bottom_height_cm: 80,
          center_height_cm: 121.6,
          vesa_center_height_cm: 119.6,
          wall_plate_reference_height_cm: 123.1,
        },
        drill_map: null,
        warnings: ["Точки сверления не подтверждены"],
      },
      cables: {
        status: "needs-check",
        routing: "open",
        connections: ["hdmi"],
        warnings: ["Нужно измерить штекер"],
        clearance: {
          verdict: "needs-measurement",
          reason_code: "rear-port-envelope-missing",
          available_clearance_mm: 22,
          required_clearance_mm: null,
          margin_mm: null,
        },
      },
      tools: { status: "needs-check", items: ["Уровень"], warnings: [] },
      checklist: { status: "blocked", items: ["Проверить основание"] },
    };
    const html = renderToStaticMarkup(React.createElement(InstallationKitResult, {
      model: { id: "tcl-65c7k", title: "TCL 65C7K" },
      mount: { id: "kromax-atlantis-65", title: "KROMAX ATLANTIS-65" },
      plan,
      offer: { affiliate_href: "https://market.yandex.ru/product/1" },
    }));

    assert.equal((html.match(/data-kit-section=/g) ?? []).length, 7);
    assert.equal(html.includes("data-installation-kit-build-summary=\"true\""), true);
    assert.equal(html.includes("Сборка ТВ-зоны"), true);
    assert.equal(html.includes("Необходимо"), true);
    assert.equal(html.includes("Проверить перед покупкой"), true);
    assert.equal((html.match(/data-kit-summary-check-visible="true"/g) ?? []).length, 3);
    assert.equal(html.includes("data-kit-summary-checks-collapsed=\"true\""), true);
    assert.equal(html.includes("Необязательное"), false);
    assert.equal(html.includes("Измерьте штекер с изгибом"), true);
    assert.equal(html.includes("Доступный зазор"), true);
    assert.equal(html.includes("Персональная карта высот"), true);
    assert.equal(html.includes("Контрольная линия настенной пластины"), true);
    assert.equal(html.includes("Точки сверления не подтверждены"), true);
    assert.equal(html.includes("data-print-installation-kit=\"true\""), true);
    assert.equal(html.includes("data-installation-passport=\"true\""), true);
    assert.equal(html.includes("data-kit-status-nav=\"true\""), true);
    assert.equal(html.includes("Ваш монтажный паспорт"), true);
    assert.equal(html.includes("Нужно проверить"), true);
    assert.equal(html.includes("Остановиться"), true);
    assert.equal(html.includes("Открыть на Яндекс Маркете"), false);
    assert.equal(html.includes("href=\"https://market.yandex.ru"), false);
  } finally {
    await vite.close();
  }
});

test("проверенный комплект показывает ровно одну прямую ссылку точного кронштейна", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({ root, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  try {
    const { InstallationKitResult } = await vite.ssrLoadModule(
      "/src/components/installation-kit/InstallationKitResult.jsx",
    );
    const checkedAt = new Date().toISOString();
    const marketPath = "/card/kromax-atlantis-65/123";
    const offer = {
      publishable: true,
      eligibility: "publishable",
      checked_at: checkedAt,
      affiliate_href: `https://market.yandex.ru${marketPath}?clid=15238076&vid=kitverified1&distr_type=7&utm_source=partner_network&utm_campaign=15238076`,
      market_source_url: `https://market.yandex.ru${marketPath}`,
      product_photo: "https://avatars.mds.yandex.net/get-mpic/1/orig",
      entity_kind: "mount",
      entity_id: "kromax-atlantis-65",
      page_path: "/kronshteyny/kromax-atlantis-65/",
      page_name: "POKUPKI_PRODUCT",
      title: "KROMAX ATLANTIS-65",
      clid: "15238076",
      vid: "kitverified1",
      compliance_mode: "non_ad_storefront",
      creative: null,
    };
    const verified = { status: "verified", warnings: [] };
    const plan = {
      overall_status: "verified",
      market_eligible: true,
      compatibility: { ...verified, fit_status: "verified-fit", reasons: [] },
      screws: { ...verified, groups: [] },
      wall_fixing: { ...verified, exact_fastener: null },
      placement: { ...verified, height: null, mounting_map: null, drill_map: null },
      cables: {
        ...verified,
        routing: "open",
        connections: ["hdmi"],
        port_sides: ["rear"],
        clearance: {
          verdict: "verified",
          reason_code: "rear-port-clearance-ok",
          available_clearance_mm: 60,
          required_clearance_mm: 35,
          margin_mm: 25,
        },
      },
      tools: { ...verified, items: [] },
      checklist: { ...verified, items: [] },
    };
    const html = renderToStaticMarkup(React.createElement(InstallationKitResult, {
      model: { id: "tcl-65c7k", title: "TCL 65C7K" },
      mount: { id: "kromax-atlantis-65", title: "KROMAX ATLANTIS-65" },
      offer,
      plan,
    }));
    assert.equal((html.match(/href="https:\/\/market\.yandex\.ru/g) ?? []).length, 1);
    assert.equal(html.includes("data-installation-passport=\"true\""), true);
    assert.equal(html.includes("data-kit-status-nav=\"true\""), true);
    assert.equal(html.includes("Ваш монтажный паспорт"), true);
    assert.equal(html.includes("Совместимость подтверждена"), true);
    assert.equal(html.includes("clid=15238076"), true);
    assert.equal(html.includes("Открыть на Яндекс Маркете"), true);
    assert.equal(html.includes("data-affiliate-mode=\"non_ad_storefront\""), true);
    assert.equal(html.includes("Помещается по введённому замеру"), true);
    assert.equal(html.includes("Запас"), true);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});

test("монтажные поля называют единицы измерения ровно один раз", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({ root, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  try {
    const { PlacementCableStep } = await vite.ssrLoadModule(
      "/src/components/installation-kit/PlacementCableStep.jsx",
    );
    const html = renderToStaticMarkup(React.createElement(PlacementCableStep, {
      onSubmit: () => {},
    }));
    assert.equal(html.includes("Желаемый поворот, °, °"), false);
    assert.equal(html.includes("Желаемый поворот, °"), true);
  } finally {
    await vite.close();
  }
});

test("шестой шаг раскрывает безопасную проверку самого тесного штекера", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({ root, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  try {
    const { PlacementCableStep } = await vite.ssrLoadModule(
      "/src/components/installation-kit/PlacementCableStep.jsx",
    );
    const html = renderToStaticMarkup(React.createElement(PlacementCableStep, {
      modelPortPassport: {
        model_id: "tcl-65c7k",
        ports: [{ kind: "hdmi", position: "rear", direction: "rearward" }],
        evidence: {
          source_url: "https://example.com/manual",
          source_title: "Официальное руководство",
          checked_at: "2026-08-25",
        },
      },
      onSubmit: () => {},
    }));

    assert.match(html, /Проверка самого тесного штекера/u);
    assert.match(html, /Куда направлен разъём/u);
    assert.match(html, /Не знаю/u);
    assert.match(html, /Габарит штекера с изгибом, мм/u);
    assert.match(html, /Направление взято из паспорта модели/u);
    assert.match(html, /aria-describedby="connector-clearance-help connector-clearance-error"/u);
    assert.match(html, /min="1"/u);
    assert.match(html, /max="200"/u);
    assert.doesNotMatch(html, /купить|лучший|идеальный|HDMI 2\.1/iu);
  } finally {
    await vite.close();
  }
});
