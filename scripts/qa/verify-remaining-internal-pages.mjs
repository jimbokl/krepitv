import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const output = (path) => {
  const file = resolve(root, "docs", path.replace(/^\//, ""), "index.html");
  assert.ok(existsSync(file), `Нет HTML: ${path}`);
  return readFileSync(file, "utf8");
};

const pages = read("data/seo_pages.json");
const oldThemes = read("data/internal_visual_pages.json");
const newThemes = read("data/internal_visual_remaining.json");
const models = read("data/tv_models.json");
const mounts = read("data/mounts.json");
const marketModels = read("data/market_tv_models.json").records;
const oldIds = new Set(Object.values(oldThemes).flatMap((theme) => theme.ids));
const newIds = new Set();

for (const [name, theme] of Object.entries(newThemes)) {
  assert.ok(theme.src.startsWith("/assets/images/"), `${name}: путь иллюстрации`);
  assert.ok(theme.alt.length >= 20 && theme.caption.length >= 40, `${name}: подпись и alt`);
  const asset = resolve(root, "web/public", theme.src.slice(1));
  assert.ok(existsSync(asset) && statSync(asset).size < 150_000, `${name}: отсутствует или тяжёлый кадр`);
  for (const id of theme.ids) {
    assert.ok(!oldIds.has(id) && !newIds.has(id), `${id}: повтор визуальной темы`);
    newIds.add(id);
    const page = pages.find((item) => item.id === id);
    assert.ok(page, `${id}: нет материала`);
    const html = output(page.path);
    assert.ok(html.includes(`data-internal-visual-page="${id}"`), `${id}: нет редакционного первого экрана`);
    assert.ok(html.includes(`data-editorial-photo="${name}"`), `${id}: неверная тема`);
    assert.ok(html.includes(`src="${theme.src}"`), `${id}: нет иллюстрации`);
    assert.ok(html.includes("seo-editorial-hero__caption"), `${id}: нет границы применимости фото`);
    assert.ok(html.includes('loading="eager"') && html.includes('fetchpriority="high"'), `${id}: первый кадр отложен`);
    const anchor = page.guide ? "мастер" : "действие";
    assert.ok(html.includes(`href="#${anchor}"`), `${id}: нет перехода к действию`);
    assert.ok(html.includes(`id="${anchor}"`), `${id}: сломан якорь действия`);
  }
}
assert.equal(oldIds.size, 100);
assert.equal(newIds.size, 55);
assert.deepEqual(new Set([...oldIds, ...newIds]), new Set(pages.map((page) => page.id)), "Не все SEO-страницы покрыты");

for (const model of models) {
  const html = output(`/modeli/${model.id}/`);
  const path = `/images/modeli/${model.id}-vesa.svg`;
  assert.ok(html.includes(`src="${path}"`), `${model.id}: нет индивидуальной схемы`);
  assert.equal(html.match(/data-technical-image="true"/g)?.length, 1, `${model.id}: схема дублируется`);
  assert.ok(html.includes("technical-editorial-hero__media"), `${model.id}: нет первого визуального экрана`);
  if (model.wall_mount_screws?.vesa_conflict) {
    assert.ok(html.includes("Источники расходятся") && html.includes("проверьте VESA своей модели"), `${model.id}: нет предупреждения о конфликте VESA`);
    assert.ok(html.includes("Ни один вариант ниже пока не подтверждён"), `${model.id}: вводящий в заблуждение вводный текст`);
    assert.ok(html.includes("Кронштейны для проверки"), `${model.id}: кандидаты названы подходящими`);
    assert.ok(!html.includes('data-affiliate-placement-id="model-') && !html.includes('id="predlozheniya"'), `${model.id}: покупки нельзя показывать до сверки VESA`);
    const svg = readFileSync(resolve(root, "docs", path.slice(1)), "utf8");
    assert.ok(svg.includes("VESA нужно проверить") && !svg.includes("Пропорциональная схема расположения"), `${model.id}: конфликт показан как подтверждённая схема`);
  } else {
    assert.ok(html.includes("геометрия корпуса условная"), `${model.id}: потеряно ограничение схемы`);
  }
}
for (const mount of mounts) {
  const html = output(`/kronshteyny/${mount.id}/`);
  const path = `/images/kronshteyny/${mount.id}-skhema.svg`;
  assert.ok(html.includes(`src="${path}"`), `${mount.id}: нет индивидуальной схемы`);
  assert.equal(html.match(/data-technical-image="true"/g)?.length, 1, `${mount.id}: схема дублируется`);
  assert.ok(html.includes("technical-editorial-hero__media"), `${mount.id}: нет первого визуального экрана`);
  assert.ok(html.includes("не являются монтажным чертежом"), `${mount.id}: потеряно ограничение схемы`);
}

const unverified = marketModels.filter((model) => model.page_kind === "observed" || model.page_kind === "alias");
assert.equal(unverified.length, 60);
for (const model of unverified) {
  const html = output(model.route_path);
  assert.ok(html.includes('name="robots" content="noindex'), `${model.route_path}: потерян noindex`);
  assert.ok(html.includes('data-editorial-scene="true"'), `${model.route_path}: нет поясняющего фото`);
  assert.ok(!html.includes('data-market-mount-section="true"'), `${model.route_path}: ложная товарная рекомендация`);
}
for (const path of ["/modeli/", "/kronshteyny/", "/spravochnik/"]) {
  const html = output(path);
  assert.ok(html.includes('data-editorial-scene="true"'), `${path}: нет первого визуального экрана`);
  assert.ok(html.includes("technical-editorial-hero__caption"), `${path}: нет поясняющей подписи`);
}

console.log(`PASS: ${newIds.size} дополнительных SEO-страниц, ${models.length} моделей, ${mounts.length} кронштейнов, ${unverified.length} noindex-наблюдений и 3 каталога`);
console.log("STATIC_HERO_STATES_NOT_APPLICABLE: статические первые экраны не имеют загрузки, ошибки или disabled");
