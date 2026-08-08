import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildHeightPlanDiagram } from "../src/lib/heightPlanDiagram.mjs";
import { buildHeightReferenceRows } from "../src/lib/heightReference.mjs";

test("схема высоты доступно показывает три отметки и помещается в responsive viewBox", async () => {
  const result = buildHeightPlanDiagram({
    bottom_height_cm: 79.9,
    center_height_cm: 114.2,
    top_height_cm: 148.4,
  });
  assert.ok(result);
  assert.equal(result.viewBox, "0 0 760 520");
  assert.deepEqual(
    result.levels.map(({ key, label, value }) => ({ key, label, value })),
    [
      { key: "top", label: "Верхний край", value: 148.4 },
      { key: "center", label: "Центр экрана", value: 114.2 },
      { key: "bottom", label: "Нижний край", value: 79.9 },
    ],
  );

  const compact = buildHeightPlanDiagram({
    bottom_height_cm: 349,
    center_height_cm: 349.5,
    top_height_cm: 350,
  });
  assert.ok(compact);
  assert.ok(compact.screen.y >= 0);
  assert.ok(compact.screen.y + compact.screen.height <= 446);
  assert.ok(compact.levels.every((level) => level.labelY >= 82 && level.labelY <= 382));

  const source = await readFile(
    new URL("../src/components/HeightPlanDiagram.jsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /data-height-plan-diagram="true"/u);
  assert.match(source, /role="img"/u);
  assert.match(source, /preserveAspectRatio="xMidYMid meet"/u);
  assert.match(source, /block h-auto w-full max-w-full/u);
  assert.match(source, /Чистый пол/u);
  assert.doesNotMatch(source, /market\.yandex\.ru|href=/u);
});

test("схема не строится по неполным или противоречивым высотам", () => {
  assert.equal(buildHeightPlanDiagram(null), null);
  assert.equal(buildHeightPlanDiagram({
    bottom_height_cm: 120,
    center_height_cm: 100,
    top_height_cm: 80,
  }), null);
  assert.equal(buildHeightPlanDiagram({
    bottom_height_cm: -1,
    center_height_cm: 40,
    top_height_cm: 80,
  }), null);
});

test("результат высоты ведёт к монтажной карте и точной модели без ссылки на Маркет", async () => {
  const [calculatorSource, guideSource, pages] = await Promise.all([
    readFile(
      new URL("../src/components/HeightCalculator.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/HeightPlanningGuide.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../data/seo_pages.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);
  const page = pages.find((item) => item.id === "mounting-height");

  assert.ok(page);
  assert.equal(page.path, "/na-kakoy-vysote-veshat-televizor/");
  assert.match(page.description, /высоту телевизора от пола/u);
  assert.ok(page.faq.some(([question]) => question.includes("в спальне")));
  assert.ok(page.faq.some(([question]) => question.includes("на кухне")));

  assert.match(calculatorSource, /data-height-plan-result="true"/u);
  assert.match(calculatorSource, /data-height-next-job="true"/u);
  assert.match(calculatorSource, /data-print-map="true"/u);
  assert.match(calculatorSource, /window\.print\(\)/u);
  assert.match(calculatorSource, /href="\/kak-povesit-televizor-na-stenu\/"/u);
  assert.match(calculatorSource, /href=\{mountSelectionHref\}/u);
  assert.match(calculatorSource, /`\/podbor\/\?model=\$\{encodeURIComponent\(model\.id\)\}`/u);
  assert.match(calculatorSource, /: "\/podbor\/"/u);
  assert.doesNotMatch(calculatorSource, /market\.yandex\.ru/u);
  assert.match(guideSource, /data-height-room-scenarios="true"/u);
  assert.match(guideSource, /data-height-reference-table="true"/u);
  assert.match(guideSource, /data-height-table-scroll-hint="true"/u);
  assert.match(guideSource, /Таблица прокручивается вправо/u);
  assert.match(guideSource, /Гостиная/u);
  assert.match(guideSource, /Спальня/u);
  assert.match(guideSource, /Кухня/u);
  assert.doesNotMatch(guideSource, /market\.yandex\.ru/u);
});

test("справочная таблица высоты использует только геометрию 16:9 и явный условный центр", () => {
  assert.deepEqual(buildHeightReferenceRows(), [
    { diagonal: 32, screenHeightCm: 39.8, bottomHeightCm: 90.1, centerHeightCm: 110, topHeightCm: 129.9 },
    { diagonal: 43, screenHeightCm: 53.5, bottomHeightCm: 83.2, centerHeightCm: 110, topHeightCm: 136.8 },
    { diagonal: 50, screenHeightCm: 62.3, bottomHeightCm: 78.9, centerHeightCm: 110, topHeightCm: 141.1 },
    { diagonal: 55, screenHeightCm: 68.5, bottomHeightCm: 75.8, centerHeightCm: 110, topHeightCm: 144.2 },
    { diagonal: 65, screenHeightCm: 80.9, bottomHeightCm: 69.5, centerHeightCm: 110, topHeightCm: 150.5 },
    { diagonal: 75, screenHeightCm: 93.4, bottomHeightCm: 63.3, centerHeightCm: 110, topHeightCm: 156.7 },
  ]);
  assert.deepEqual(buildHeightReferenceRows(0), []);
  assert.deepEqual(buildHeightReferenceRows(Number.NaN), []);
});
