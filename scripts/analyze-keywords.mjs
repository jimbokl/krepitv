import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const sourcePath = new URL(
  "../product-docs/research/semantics/tv_mount_ru_keywords.csv",
  import.meta.url,
);

const csvText = await fs.readFile(sourcePath, "utf8");
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Семантика" });
const sheet = workbook.worksheets.getItem("Семантика");
const values = sheet.getUsedRange(true).values;

const [header, ...body] = values;
if (
  header?.[0] !== "keyword" ||
  header?.[1] !== "wordstat_freq_ru_month"
) {
  throw new Error(`Неожиданные столбцы: ${JSON.stringify(header)}`);
}

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

const rows = body
  .map(([keyword, frequency]) => ({
    keyword: normalize(keyword),
    frequency: Number(frequency),
  }))
  .filter(({ keyword, frequency }) => keyword && Number.isFinite(frequency));

const rules = [
  [
    "Шум",
    /мачт тв|за стеной фильм|тв самсунг|xiaomi tv|креплени[ея] (воздуховод|кабел|к потолку)|кронштейн (для )?(кондиционер|камер|антенн|стабилизатор|крыл)|тв приставк|крепежные пластин|держатель с защелк|монтаж стеновых панел/,
  ],
  ["Конкретная модель ТВ", /\b(qe|oled|k-|ue|55q|65q|xr-|the frame|c4rla|q70d)[a-zа-я0-9-]*\b/i],
  ["VESA", /\bvesa\b|веса\s*(100|200|300|400|600)|\b(75|100|200|300|400|600)\s*[xх×]\s*(75|100|200|300|400)\b/],
  ["Диагональ", /\b(24|27|32|40|42|43|50|55|58|60|65|70|75|77|80|85|86|98)\s*(дюйм|дюймов|дюйма)?\b/],
  ["Механизм", /поворот|наклон|выдвиж|фиксирован|электропривод|угловой/],
  ["Стена и крепёж", /гипсокарт|бетон|кирпич|газобетон|пеноблок|анкер|дюбел|болт|саморез|крепеж к стене|крепеж для телевизора/],
  ["Монтаж и высота", /как повесить|как установить|высот|сколько стоит повесить|монтаж телевизора/],
  ["Бренд ТВ", /телевизор (lg|samsung|самсунг|sony|xiaomi|haier|tcl)|для телевизора (lg|samsung|самсунг|sony|xiaomi|haier|tcl)/],
  ["Стойки и тумбы", /тумб|стойк|подставк|полк под тв/],
  ["Коммерческий", /купить|цена|стоимость|заказать|доставка/],
  ["Базовый кронштейн", /кронштейн для (телевизора|тв)|креплени[ея] для телевизора|настенн(ый|ое) креплени/],
  ["Кабели и аксессуары", /кабел|провод|держатель для пульта|розетк/],
];

const clusters = new Map();
for (const row of rows) {
  const cluster = rules.find(([, pattern]) => pattern.test(row.keyword))?.[0] ?? "Прочее";
  if (!clusters.has(cluster)) clusters.set(cluster, []);
  clusters.get(cluster).push(row);
}

const duplicateCounts = new Map();
for (const row of rows) {
  duplicateCounts.set(row.keyword, (duplicateCounts.get(row.keyword) ?? 0) + 1);
}

const summary = [...clusters.entries()]
  .map(([cluster, clusterRows]) => ({
    cluster,
    phrases: clusterRows.length,
    support_frequency: clusterRows.reduce((sum, row) => sum + row.frequency, 0),
    top: [...clusterRows]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8),
  }))
  .sort((a, b) => b.support_frequency - a.support_frequency);

console.log(
  JSON.stringify(
    {
      source_rows: rows.length,
      unique_keywords: new Set(rows.map((row) => row.keyword)).size,
      duplicates: [...duplicateCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([keyword, count]) => ({ keyword, count })),
      note: "support_frequency — сумма строк внутри взаимоисключающей классификации, не оценка уникального спроса и не TAM",
      clusters: summary,
    },
    null,
    2,
  ),
);
