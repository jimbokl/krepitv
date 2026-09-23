import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pages = JSON.parse(readFileSync(resolve(root, "data/seo_pages.json"), "utf8"));
const themes = JSON.parse(readFileSync(resolve(root, "data/internal_visual_pages.json"), "utf8"));
const indexed = new Map(pages.map((page) => [page.id, page]));
const selected = [];

for (const [themeName, theme] of Object.entries(themes)) {
  assert.ok(theme.src.startsWith("/assets/images/"), `${themeName}: путь изображения`);
  assert.ok(theme.alt.length >= 20 && theme.caption.length >= 40, `${themeName}: alt и подпись`);
  const asset = resolve(root, "web/public", theme.src.slice(1));
  assert.ok(existsSync(asset), `${themeName}: нет ${asset}`);
  assert.ok(statSync(asset).size < 150_000, `${themeName}: изображение тяжелее 150 КБ`);
  for (const id of theme.ids) {
    assert.ok(!selected.includes(id), `Повтор страницы: ${id}`);
    const page = indexed.get(id);
    assert.ok(page?.indexable, `Нет индексируемой страницы: ${id}`);
    selected.push(id);
    const output = resolve(root, "docs", page.path.slice(1), "index.html");
    assert.ok(existsSync(output), `Нет статического HTML: ${page.path}`);
    const html = readFileSync(output, "utf8");
    assert.ok(html.includes(`data-internal-visual-page="${id}"`), `${id}: нет редакционного первого экрана`);
    assert.ok(html.includes(`data-editorial-photo="${themeName}"`), `${id}: неверная тема`);
    assert.ok(html.includes(`src="${theme.src}"`), `${id}: нет фото`);
    assert.ok(html.includes("seo-editorial-hero__caption"), `${id}: нет подписи`);
    assert.ok(html.includes("seo-editorial-hero__image"), `${id}: нет адаптивного изображения`);
    assert.ok(html.includes('fetchpriority="high"'), `${id}: нет приоритета кадра первого экрана`);
    assert.ok(html.includes('loading="eager"'), `${id}: кадр первого экрана отложен`);
    const editorialHero = html.match(/<header class="seo-editorial-hero[\s\S]*?<\/header>/)?.[0];
    assert.ok(editorialHero, `${id}: не найден статический редакционный блок`);
    assert.ok(!/<(?:button|form|input)\b|aria-busy=|role="(?:status|alert)"/.test(editorialHero), `${id}: редакционный блок не должен иметь асинхронного состояния`);
    const actionId = {
      "phone-to-tv": "мастер-подключения",
      "tv-no-signal": "мастер-проверки-сигнала",
      "mounting-map": "монтажная-карта",
      "mounting-height": "калькулятор-высоты",
    }[id];
    if (actionId) {
      assert.ok(html.includes(`href="#${actionId}"`), `${id}: нет ссылки на действие`);
      assert.equal(html.split(`id="${actionId}"`).length - 1, 1, `${id}: нужен один статический якорь`);
    }
    if (page.guide) {
      assert.ok(html.includes(`data-visual-steps="${id}"`), `${id}: нет визуальной развилки`);
      assert.equal(
        html.match(/class="seo-visual-route__item"/g)?.length,
        3,
        `${id}: три шага должны происходить из руководства`,
      );
      assert.ok(html.includes("data-evidence-guide-stop=\"true\""), `${id}: потеряно стоп-условие`);
      assert.ok(html.includes("href=\"#мастер\""), `${id}: нет перехода к мастеру`);
    }
  }
}

assert.equal(selected.length, 100, "В когорте должно быть ровно 100 страниц");
assert.equal(selected.filter((id) => indexed.get(id).guide).length, 96, "Нужно 96 руководств");
assert.deepEqual(
  selected.filter((id) => !indexed.get(id).guide).sort(),
  ["mounting-height", "mounting-map", "phone-to-tv", "tv-no-signal"],
  "Четыре инструмента вне руководств изменились",
);
assert.deepEqual(
  pages.filter((page) => page.guide).map((page) => page.id).filter((id) => !selected.includes(id)),
  [],
  "Часть руководств не вошла в пул",
);
assert.equal(Object.keys(themes).length, 11, "Нужно 11 визуальных тем");
console.log(`PASS: ${selected.length} внутренних страниц, 11 визуальных тем, 96 руководств и 4 инструмента`);
console.log("STATIC_EDITORIAL_HERO: loading/empty/error/success/disabled not applicable");
