import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// A reproducible routing map, not a claim that every suggestion is fully solved.
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const seeds = await read("product-docs/research/tv-universe-seeds-2026-10-06.json");
const snapshot = await read("product-docs/research/raw/tv-universe-20261006/normalized.json");
const pages = [...await read("data/seo_pages.json"), ...await read("data/adjacent_tools.json")];
const byId = new Map(pages.map((page) => [page.id, page]));
const routes = [
  "tv-oled-qled-choice", "tv-oled-qled-choice", "tv-game-mode", "viewing-distance", "mounting-height", "tv-purchase-checklist", "dead-pixel-test", "tv-model-lookup", "tv-pickup-point-check", "tv-transport",
  "mounting-map", "selection-choose", "vesa-200x200", "vesa-300x200", "full-motion-mount", "soundbar-mount", "corner-tv-mount", "tv-without-drilling", "wall-drywall-how", "tv-device-shelf",
  "hide-tv-wires", "adj-podsvetka-za-televizorom-kakuyu-vybrat", "tv-zone-sockets", "adj-udlinitel-dlya-televizora-kak-vybrat", "adj-setevoy-filtr-ili-udlinitel-dlya-tv", "adj-bespereboynik-dlya-televizora-nuzhen-li", "wall-planner",
  "tv-no-internet", "tv-wifi-5ghz", "tv-usb-wifi-adapter", "tv-internet-setup", "tv-wifi-limited", "tv-wifi-drops", "tv-internet-speed",
  "phone-to-tv", "tv-airplay-failure", "phone-to-tv", "tv-hdmi-laptop-not-detected", "hdmi-cable-checker", "tv-arc-no-sound", "adj-earc-ili-arc-kak-proverit", "adj-hdmi-switch-neskolko-ustroystv",
  "soundbar-to-tv", "tv-dual-headphones", "tv-alice-connect", "tv-audio-video-sync", "tv-no-sound", "tv-no-sound",
  "tv-vrr-enable", "tv-allm-enable", "tv-120hz-enable", "tv-hdr-enable", "tv-game-mode", "tv-game-mode", "tv-4k-enable",
  "tv-home-recommendations", "tv-home-recommendations", "tv-start-screen", "tv-app-install", "tv-firmware-update", "tv-storage-cleanup", "tv-factory-reset",
  "tv-disable-subtitles", "tv-disable-voice", "tv-audio-track-language", "tv-remote-not-working", "tv-voice-remote-search", "universal-remote",
  "digital-channels", "tv-ten-digital-channels", "tv-cam-module", "offline-tv", "tv-usb-not-seen", "tv-usb-file-system", "usb-video-codec",
  "tv-wont-turn-on", "tv-sound-no-picture", "tv-boot-loop", "tv-dark-screen", "tv-hdmi-overscan", "tv-aspect-ratio", "tv-screen-uniformity", "screen-cleaning",
];
assert.equal(routes.length, seeds.length);
for (const id of routes) assert.ok(byId.has(id), `Unknown canonical ${id}`);
const broadSeeds = new Set([0, 2, 3, 4, 17, 26, 36, 46, 53]);
const brandPattern = /самсунг|samsung|lg\b|tcl|haier|хаер|hisense|хайсенс|xiaomi|сяоми|sony|сони|philips|филипс|toshiba|dexp|дексп|sber|sbb|kivi|kiwi|thomson|bbk|telefunken|hyundai|vitek|\b\d{2}[a-z]\w+/i;
const outOfScope = /кондиционер|автомобил|для машины|монитор.*компьютер/i;
function cluster(index) {
  if (index < 10) return "Выбор и покупка";
  if (index < 20) return "Монтаж и крепления";
  if (index < 27) return "ТВ-зона, питание и подсветка";
  if (index < 34) return "Интернет и сеть";
  if (index < 42) return "Подключения и HDMI";
  if (index < 48) return "Звук";
  if (index < 55) return "Игры и изображение";
  if (index < 62) return "Smart TV и приложения";
  if (index < 68) return "Язык и пульт";
  if (index < 75) return "Каналы и файлы";
  return "Диагностика и уход";
}
const rows = snapshot.rows.map((row) => {
  const indexes = row.seeds.map((seed) => seeds.indexOf(seed));
  assert.ok(indexes.every((index) => index >= 0));
  const primary = indexes[0];
  const candidateRoutes = [...new Set(indexes.map((index) => byId.get(routes[index]).path))];
  const excluded = outOfScope.test(row.phrase);
  const variant = brandPattern.test(row.phrase);
  const broad = indexes.some((index) => broadSeeds.has(index));
  const state = excluded ? "вне ТВ-сценария" : variant ? "нужна проверка модельного варианта" : broad ? "частичное покрытие: проверить самостоятельный интент" : "есть базовый маршрут: проверить точность ответа";
  return { phrase: row.phrase, cluster: cluster(primary), candidate_canonical: excluded ? null : candidateRoutes[0], alternative_routes: excluded ? [] : candidateRoutes.slice(1), status: state, seeds: row.seeds };
});
const counts = rows.reduce((result, row) => { result[row.status] = (result[row.status] || 0) + 1; return result; }, {});
const output = "product-docs/research/TV_SEMANTIC_UNIVERSE_2026-10-06";
await writeFile(`${output}.json`, `${JSON.stringify({ date: "2026-10-06", seed_count: seeds.length, unique_suggestions: rows.length, contract: "Маршрут — кандидат для редакционной проверки, не доказательство полного покрытия, частотности, конкуренции или трафика. Нужные модельные детали сверяются с официальной инструкцией. Не создавайте URL из каждой подсказки автоматически.", counts, rows }, null, 2)}\n`);
const csv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
await writeFile(`${output}.csv`, "запрос,кластер,кандидат_каноникал,статус,исходные_фразы\n" + rows.map((row) => [row.phrase, row.cluster, row.candidate_canonical, row.status, row.seeds.join(" | ")].map(csv).join(",")).join("\n") + "\n");
console.log(JSON.stringify({ seeds: seeds.length, suggestions: rows.length, counts, clusters: [...new Set(rows.map((row) => row.cluster))].length }));
