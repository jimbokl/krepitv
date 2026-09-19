import fs from "node:fs/promises";

// Offline classification; no additional API requests or paid traffic.
const root = new URL("../../", import.meta.url);
const read = async (file) => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
const pages = await read("data/seo_pages.json");
const broad = await read("product-docs/research/raw/semantic-expansion-20260919-broad/raw.json");
const exact = await read("product-docs/research/raw/semantic-expansion-20260919-exact/raw.json");
const rules = [
  ["Раздача с телефона", "phone-hotspot", /разда|точк.{0,4}доступ|режим.{0,4}модем/],
  ["Без интернета", "offline-tv", /без интернет/],
  ["Универсальный пульт", "universal-remote", /универсальн.{0,8}пульт|пульт.{0,12}универсальн/],
  ["Пульт с телефона", "phone-tv-remote", /пульт.{0,25}телефон|телефон.{0,25}пульт/],
  ["Пульт: неисправность", "tv-remote-not-working", /пульт.*(?:не работа|не реагир)|не реагир.*пульт/],
  ["Размеры экрана", "tv-dimensions", /размер|ширин|высот.{0,6}(?:экран|телевизор)/],
  ["Винты и болты", "tv-mount-screws", /болт|винт/],
  ["Подбор кронштейна", "buy-tv-mount", /креплен|кронштейн/],
  ["Файловая система USB", "tv-usb-file-system", /формат.*флеш|флеш.*формат|fat32|exfat|ntfs/],
  ["USB: не видит файл", "tv-usb-not-seen", /не видит.*флеш|флеш.*не видит|не читает.*флеш/],
  ["Субтитры USB", "tv-usb-video-subtitles", /флеш.*субтитр|субтитр.*флеш/],
  ["HDMI: обрезанные края", "tv-hdmi-overscan", /overscan|обрез.*(?:hdmi|экран)/],
  ["HDMI: кабель", "hdmi-cable-checker", /hdmi.*(?:кабел|120|2\.1|2\.0)|кабел.*hdmi/],
  ["Звук через HDMI", "tv-no-sound", /hdmi.*звук|звук.*hdmi/],
  ["Звук: отсутствует", "tv-no-sound", /нет звук|пропал звук|звук.*не работа/],
  ["Саундбар", "soundbar-to-tv", /саундбар/],
  ["Задержка звука", "tv-audio-video-sync", /рассинхрон|звук.*(?:отста|задерж)|(?:отста|задерж).*звук/],
  ["Наушники", "tv-headphones", /наушник/],
  ["Сеть: диагностика", "tv-no-internet", /не.*(?:подключ|работа).*интернет|нет интернет/],
  ["Подключение интернета", "tv-internet-setup", /подключ.*интернет|скорость.*интернет|интернет.*скорость/],
];
for (const [, id] of rules) if (!pages.some((p) => p.id === id)) throw new Error(`Missing canonical: ${id}`);
const rows = new Map();
for (const [scope, batches] of [["broad", broad], ["ordered_phrase", exact]]) {
  for (const batch of batches) {
    for (const [kind, suggestions] of [["popular", batch.response.popular ?? []], ["association", batch.response.associations ?? []]]) {
      for (const item of suggestions) {
        const query = item.text.trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
        const key = `${scope}:${query}`;
        const frequency = Number(item.value);
        if (!Number.isFinite(frequency)) throw new Error("Invalid Wordstat frequency");
        const record = rows.get(key) ?? { query, scope, frequencies: [], seeds: [], origins: [], operator_queries: [] };
        for (const [field, value] of [["frequencies", frequency], ["seeds", batch.seed.query], ["origins", kind], ["operator_queries", batch.operator_query]]) {
          if (!record[field].includes(value)) record[field].push(value);
        }
        rows.set(key, record);
      }
    }
  }
}
const classified = [...rows.values()].map((r) => {
  const excluded = /торрент|взлом|скачать.*бесплатно|онлайн бесплатно|ремонт.*цена/.test(r.query);
  const rule = !excluded && r.origins.includes("popular") ? rules.find(([, , re]) => re.test(r.query)) : null;
  const page = rule && pages.find((p) => p.id === rule[1]);
  return { ...r, frequency: r.frequencies.length === 1 ? r.frequencies[0] : null,
    frequency_conflict: r.frequencies.length > 1,
    cluster: rule?.[0] ?? "Требует ручной оценки", canonical: page?.path ?? null,
    decision: excluded ? "exclude" : page ? "candidate_mapping_review_required" : "review" };
}).sort((a, b) => (b.frequency ?? -1) - (a.frequency ?? -1) || a.query.localeCompare(b.query, "ru"));
const summary = { observed_at: "2026-09-19", region: "Россия", devices: "все устройства",
  period: "последний месяц в Wordstat Top queries на дату сбора",
  unique_queries: new Set(classified.map((r) => r.query)).size, rows: classified.length,
  broad_seeds: broad.length, phrase_probes: exact.length,
  mapped_candidates: classified.filter((r) => r.canonical).length,
  clusters: new Set(classified.filter((r) => r.canonical).map((r) => r.cluster)).size,
  frequency_conflicts: classified.filter((r) => r.frequency_conflict).length,
  limitations: ["Частоты пересекаются, не складывать. Это спрос, не прогноз посещений.",
    "Широкие подсказки и фразовые проверки сохранены отдельно. Кавычки и скобки не фиксируют словоформы без !.",
    "Кластеризация по правилам — кандидаты для ручной проверки, не подтверждение релевантности каждой фразы.",
    "Широкие выгрузки ограничены 2000 строками на seed: это расширение, не вся семантика рынка.",
    "CPC не получен; платные кампании не запускались."], rows_data: classified };
const dir = new URL("product-docs/research/semantic-expansion-2026-09-19/", root);
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(new URL("keywords.json", dir), JSON.stringify(summary, null, 2) + "\n");
const columns = ["query", "scope", "frequency", "frequency_conflict", "cluster", "canonical", "decision", "seeds", "operator_queries"];
const quote = (x) => `"${String(Array.isArray(x) ? x.join(" | ") : x ?? "").replaceAll('"', '""')}"`;
await fs.writeFile(new URL("keywords.csv", dir), "\uFEFF" + [columns.join(","), ...classified.map((r) => columns.map((k) => quote(r[k])).join(","))].join("\n") + "\n");
console.log(JSON.stringify({ ...summary, rows_data: undefined }, null, 2));
