import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(root, "data/tv_models.json");
const outputDir = path.join(root, "datasets/ru-tv-vesa-sizes/v1");
const jsonPath = path.join(outputDir, "tv-vesa-sizes.json");
const csvPath = path.join(outputDir, "tv-vesa-sizes.csv");
const checkOnly = process.argv.includes("--check");

const models = JSON.parse(await readFile(sourcePath, "utf8"));
const records = models
  .map(buildRecord)
  .sort((left, right) => (
    left.brand.localeCompare(right.brand, "ru")
    || left.model.localeCompare(right.model, "ru")
  ));

validateRecords(records);

const dataset = {
  schema_version: 1,
  dataset_version: "1.0.0",
  language: "ru",
  market: "RU",
  generated_from: "data/tv_models.json",
  live_lookup_url: "https://krepitv.ru/vesa/",
  record_unit: "Одна строка на точную модель телевизора",
  models_count: records.length,
  brands_count: new Set(records.map((record) => record.brand)).size,
  vesa_pairs_count: new Set(
    records.map((record) => `${record.vesa_width_mm}x${record.vesa_height_mm}`),
  ).size,
  last_verified_at: records.map((record) => record.checked_at).sort().at(-1),
  records,
};

const json = `${JSON.stringify(dataset, null, 2)}\n`;
const columns = Object.keys(records[0]);
const csv = `${columns.join(",")}\n${records
  .map((record) => columns.map((column) => escapeCsv(record[column])).join(","))
  .join("\n")}\n`;

if (checkOnly) {
  await assertCurrent(jsonPath, json);
  await assertCurrent(csvPath, csv);
  console.log(`Таблица VESA актуальна: ${records.length} моделей`);
} else {
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, json),
    writeFile(csvPath, csv),
  ]);
  console.log(`Таблица VESA обновлена: ${records.length} моделей`);
}

function buildRecord(model) {
  const conflict = model.wall_mount_screws?.vesa_conflict ?? null;
  return {
    model_id: model.id,
    brand: model.brand,
    model: model.model,
    title: model.title,
    series: model.series,
    model_year: model.model_year,
    diagonal_inches: model.diagonal_inches,
    passport_mass_kg: model.weight_kg,
    vesa_width_mm: model.vesa_width_mm,
    vesa_height_mm: model.vesa_height_mm,
    vesa_source_conflict: Boolean(conflict),
    conflicting_catalog_value: conflict?.catalog_value ?? null,
    conflicting_manual_value: conflict?.manual_value ?? null,
    conflict_note: conflict?.note ?? null,
    checked_at: model.checked_at,
    source_label: model.source_label,
    source_url: model.source_url,
    krepitv_model_url: `https://krepitv.ru/modeli/${model.id}/`,
  };
}

function validateRecords(rows) {
  if (rows.length !== 132) {
    throw new Error(`Ожидалось 132 точные модели, получено ${rows.length}`);
  }
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (!ids.add(row.model_id)) {
      throw new Error(`Строка ${index + 1}: повтор модели ${row.model_id}`);
    }
    if (!/^https:\/\//.test(row.source_url)) {
      throw new Error(`Строка ${index + 1}: официальный источник должен быть HTTPS`);
    }
    if (!/^https:\/\/krepitv\.ru\/modeli\/[a-z0-9-]+\/$/.test(row.krepitv_model_url)) {
      throw new Error(`Строка ${index + 1}: некорректная ссылка на карточку модели`);
    }
    if (
      !Number.isInteger(row.vesa_width_mm)
      || !Number.isInteger(row.vesa_height_mm)
      || row.vesa_width_mm <= 0
      || row.vesa_height_mm <= 0
    ) {
      throw new Error(`Строка ${index + 1}: некорректная схема VESA`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.checked_at)) {
      throw new Error(`Строка ${index + 1}: checked_at должен быть ISO-датой`);
    }
    if (
      row.vesa_source_conflict
      && (!row.conflicting_catalog_value || !row.conflicting_manual_value || !row.conflict_note)
    ) {
      throw new Error(`Строка ${index + 1}: конфликт VESA описан не полностью`);
    }
  }
}

function escapeCsv(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function assertCurrent(filePath, expected) {
  let actual;
  try {
    actual = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`Нет публичного файла ${path.relative(root, filePath)}; запустите npm run dataset:generate`);
  }
  if (actual !== expected) {
    throw new Error(`Устарел ${path.relative(root, filePath)}; запустите npm run dataset:generate`);
  }
}
