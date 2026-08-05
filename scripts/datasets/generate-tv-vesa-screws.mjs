import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(root, "data/tv_models.json");
const outputDir = path.join(root, "datasets/ru-tv-vesa-screws/v1");
const jsonPath = path.join(outputDir, "tv-vesa-screws.json");
const csvPath = path.join(outputDir, "tv-vesa-screws.csv");
const checkOnly = process.argv.includes("--check");

const models = JSON.parse(await readFile(sourcePath, "utf8"));
const records = models
  .filter((model) => model.wall_mount_screws?.groups?.length)
  .flatMap((model) => model.wall_mount_screws.groups.map((group) => (
    buildRecord(model, model.wall_mount_screws, group)
  )))
  .sort((left, right) => (
    left.brand.localeCompare(right.brand, "ru")
    || left.model.localeCompare(right.model, "ru")
    || left.screw_group.localeCompare(right.screw_group, "ru")
  ));

validateRecords(records);

const uniqueModels = new Set(records.map((record) => record.model_id));
const uniqueBrands = new Set(records.map((record) => record.brand));
const dataset = {
  schema_version: 1,
  dataset_version: "1.1.0",
  language: "ru",
  market: "RU",
  generated_from: "data/tv_models.json",
  live_lookup_url: "https://krepitv.ru/vinty-dlya-krepleniya-televizora/",
  record_unit: "Одна строка на группу винтов одной модели телевизора",
  models_count: uniqueModels.size,
  brands_count: uniqueBrands.size,
  records_count: records.length,
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
  console.log(`Датасет актуален: ${uniqueModels.size} моделей, ${records.length} строк`);
} else {
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, json),
    writeFile(csvPath, csv),
  ]);
  console.log(`Датасет обновлён: ${uniqueModels.size} моделей, ${records.length} строк`);
}

function buildRecord(model, hardware, group) {
  const measurementKind = Number.isFinite(group.length_mm)
    ? "exact_length"
    : group.length_unknown === true
      ? "length_unknown"
      : Number.isFinite(group.engagement_min_mm) && Number.isFinite(group.engagement_max_mm)
        ? "engagement_range"
        : "thread_only";

  return {
    model_id: model.id,
    brand: model.brand,
    model: model.model,
    title: model.title,
    model_year: model.model_year,
    diagonal_inches: model.diagonal_inches,
    vesa_width_mm: model.vesa_width_mm,
    vesa_height_mm: model.vesa_height_mm,
    screw_group: group.location,
    thread: group.thread,
    measurement_kind: measurementKind,
    length_mm: group.length_mm ?? null,
    engagement_min_mm: group.engagement_min_mm ?? null,
    engagement_max_mm: group.engagement_max_mm ?? null,
    range_label: group.range_label ?? null,
    quantity: group.quantity,
    adapters_status: hardware.requires_adapters === true
      ? "required"
      : hardware.requires_adapters === false
        ? "not_required"
        : "unknown",
    required_parts_note: hardware.required_parts_note ?? null,
    vesa_source_conflict: Boolean(hardware.vesa_conflict),
    conflict_note: hardware.vesa_conflict?.note ?? null,
    source_region: hardware.source_region,
    checked_at: hardware.checked_at,
    source_label: hardware.source_label,
    source_url: hardware.source_url,
    secondary_source_label: hardware.secondary_source_label ?? null,
    secondary_source_url: hardware.secondary_source_url ?? null,
  };
}

function validateRecords(rows) {
  if (!rows.length) throw new Error("Нет подтверждённых паспортов винтов");
  const modelIds = new Set();
  for (const [index, row] of rows.entries()) {
    modelIds.add(row.model_id);
    if (!/^https:\/\//.test(row.source_url)) {
      throw new Error(`Строка ${index + 1}: официальный источник должен быть HTTPS`);
    }
    if (typeof row.source_region !== "string" || row.source_region.trim().length < 2) {
      throw new Error(`Строка ${index + 1}: не указан регион официального источника`);
    }
    if (!/^M\d+$/i.test(row.thread) || !Number.isInteger(row.quantity) || row.quantity < 1) {
      throw new Error(`Строка ${index + 1}: некорректная резьба или количество`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.checked_at)) {
      throw new Error(`Строка ${index + 1}: checked_at должен быть ISO-датой`);
    }
  }
  if (modelIds.size !== 27) {
    throw new Error(`Ожидалось 27 моделей с проверенным паспортом, получено ${modelIds.size}`);
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
