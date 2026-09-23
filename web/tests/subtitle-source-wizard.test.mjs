import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  subtitleRoute,
  validSubtitleState,
} from "../src/lib/subtitleSourceWizard.mjs";

const route = (source, observation, access = "no") =>
  subtitleRoute({ source, observation, access });

test("телетекст и обычные субтитры канала не смешиваются", () => {
  assert.equal(route("broadcast", "teletext").id, "teletext");
  assert.equal(route("broadcast", "captions").id, "broadcast");
});

test("приложение получает локальный маршрут, а не системный сброс", () => {
  const result = route("app", "one_video");
  assert.equal(result.id, "app");
  assert.match(result.action, /плеере/u);
  assert.doesNotMatch(result.action, /сброс/u);
});

test("HDMI локализуется только при исчезновении текста на другом входе", () => {
  assert.equal(route("hdmi", "only_hdmi").id, "external");
  assert.equal(route("hdmi", "also_elsewhere").id, "unknown");
});

test("несколько источников не доказывают глобальную настройку", () => {
  assert.equal(route("multiple", "home_menu").id, "tv_possible");
  assert.equal(route("multiple", "content_only").id, "unknown");
});

test("смешанный и недоступный сценарий честно возвращают неизвестно", () => {
  assert.equal(route("unknown", "many_sources").id, "unknown");
  assert.equal(route("unknown", "unclear").id, "unknown");
  assert.equal(route("hdmi", "unclear").id, "unknown");
});

test("функция доступности другого зрителя требует согласования", () => {
  const result = route("broadcast", "captions", "yes");
  assert.match(result.accessibility, /сначала согласуйте/u);
  assert.match(result.accessibility, /вернуть/u);
});

test("неполный или противоречивый ввод не создаёт результат", () => {
  assert.equal(route("app", "only_hdmi"), null);
  assert.equal(subtitleRoute({ source: "app", observation: "one_video" }), null);
  assert.equal(route("app", "one_video", "maybe"), null);
});

test("сохранённый маршрут принимает только контролируемые значения", () => {
  assert.deepEqual(validSubtitleState({ source: "hdmi", observation: "only_hdmi", access: "yes", email: "hidden" }), {
    source: "hdmi", observation: "only_hdmi", access: "yes",
  });
  assert.deepEqual(validSubtitleState({ source: "app", observation: "only_hdmi", access: "no" }), {
    source: "app", observation: "", access: "no",
  });
});

test("страница подключает один специализированный мастер и оставляет официальные источники", async () => {
  const page = await readFile(new URL("../src/pages/SeoPage.jsx", import.meta.url), "utf8");
  const component = await readFile(new URL("../src/components/SubtitleSourceWizard.jsx", import.meta.url), "utf8");
  const data = JSON.parse(await readFile(new URL("../../data/seo_pages.json", import.meta.url), "utf8"));
  const subtitles = data.find((item) => item.id === "tv-disable-subtitles");
  assert.match(page, /pageId === "tv-disable-subtitles" \? <SubtitleSourceWizard/u);
  assert.match(component, /emitResultCompleted\(window/u);
  assert.equal(subtitles.guide.sources.length, 3);
  assert.equal(subtitles.guide.steps.length, 3);
  assert.match(subtitles.guide.summary, /без JavaScript/u);
});
