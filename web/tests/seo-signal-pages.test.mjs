import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const pages = JSON.parse(await readFile(new URL("data/seo_pages.json", root), "utf8"));
const source = await readFile(new URL("../src/components/MountFunnelNextStep.jsx", import.meta.url), "utf8");

const targetIds = new Set([
  "tv-energy-consumption",
  "tv-disable-subtitles",
  "tv-disable-voice",
  "vesa-size",
]);

function page(id) {
  return pages.find((candidate) => candidate.id === id);
}

test("measured SEO winners expose a truthful material-update date", () => {
  const updated = pages.filter((candidate) => candidate.updated_at === "2026-09-02");
  assert.deepEqual(new Set(updated.map((candidate) => candidate.id)), targetIds);
  assert.equal(page("tv-disable-subtitles").guide.updated_at, "2026-08-07");
  assert.equal(page("tv-disable-voice").guide.updated_at, "2026-08-07");
  assert.equal(page("vesa-size").guide.updated_at, "2026-08-08");
});

test("energy page answers the measured query before the calculator", () => {
  const candidate = page("tv-energy-consumption");
  assert.match(candidate.title, /Сколько потребляет телевизор/u);
  assert.match(candidate.description, /за час, день, месяц и год/u);
  assert.match(candidate.lead, /100 Вт/u);
  assert.match(candidate.lead, /12 кВт·ч за 30 дней/u);
  assert.match(candidate.lead, /146 кВт·ч в год/u);
});

test("subtitle and voice pages use the users' exact problem language", () => {
  const subtitles = page("tv-disable-subtitles");
  assert.match(subtitles.title, /отключить или убрать субтитры/u);
  assert.match(subtitles.lead, /Чтобы убрать субтитры/u);
  assert.ok(subtitles.faq.some(([question]) => /убрать титры/u.test(question)));

  const voice = page("tv-disable-voice");
  assert.match(voice.title, /голосовое сопровождение/u);
  assert.match(voice.description, /экранный диктор/u);
  assert.match(voice.description, /аудиодескрипц/u);
  assert.match(voice.description, /ассистент/u);
});

test("VESA table promises exact model lookup and source-backed download", () => {
  const candidate = page("vesa-size");
  assert.match(candidate.title, /по моделям и размерам/u);
  assert.match(candidate.description, /точной модели/u);
  assert.match(candidate.description, /скач/u);
  assert.match(candidate.lead, /официальн/u);
});

test("post-result CTA names the model-first selection job", () => {
  assert.match(source, /Проверьте точную модель и получите совместимые кронштейны/u);
  assert.match(source, /Начать подбор по модели/u);
});
