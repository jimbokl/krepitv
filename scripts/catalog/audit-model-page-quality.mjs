import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCS = path.join(ROOT, "docs");

const [models, mounts, market, graph, publicModelOffers, publicOffers, sitemap] = await Promise.all([
  readJson("data/tv_models.json"),
  readJson("data/mounts.json"),
  readJson("data/market_tv_models.json"),
  readJson("docs/data/compatibility-graph.json"),
  readJson("data/affiliate/public-model-offers.json"),
  readJson("data/affiliate/public-offers.json"),
  readFile(path.join(DOCS, "sitemap.xml"), "utf8"),
]);

const mountsById = new Map(mounts.map((mount) => [mount.id, mount]));
const mountHtmlById = new Map(await Promise.all(
  mounts.map(async (mount) => [
    mount.id,
    await readFile(path.join(DOCS, "kronshteyny", mount.id, "index.html"), "utf8"),
  ]),
));
const sitemapPaths = new Set(
  [...sitemap.matchAll(/<loc>(https:\/\/krepitv\.ru[^<]+)<\/loc>/gu)]
    .map((match) => new URL(match[1]).pathname),
);
const failures = [];
const compatibleMountsByModel = new Map();
const publicOffersByModel = new Map();
const currentOfferMountIds = new Set(
  publicOffers.offers
    .filter((offer) => offer.entity_kind === "mount" && offer.publishable === true)
    .map((offer) => offer.entity_id),
);

for (const edge of graph) {
  if (!edge.compatible || edge.fit_status !== "verified-fit") continue;
  const group = compatibleMountsByModel.get(edge.tv_id) ?? [];
  group.push(edge.mount_id);
  compatibleMountsByModel.set(edge.tv_id, group);
}

for (const placement of publicModelOffers.placements) {
  const group = publicOffersByModel.get(placement.model_id) ?? [];
  group.push(placement);
  publicOffersByModel.set(placement.model_id, group);
}

for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const matches = compatibleMountsByModel.get(model.id) ?? [];
  const publicOffers = publicOffersByModel.get(model.id) ?? [];
  requireValue(model.source_url?.startsWith("https://"), model.id, "нет HTTPS-источника характеристик");
  requireValue(/^\d{4}-\d{2}-\d{2}$/u.test(model.checked_at), model.id, "нет даты проверки источника");
  requireValue(model.vesa_width_mm > 0 && model.vesa_height_mm > 0, model.id, "нет подтверждённого VESA");
  requireValue(model.weight_kg > 0, model.id, "нет паспортной массы для расчёта");
  requireValue(matches.length > 0, model.id, "нет ни одного проверенного кронштейна");
  requireValue(publicOffers.length > 0, model.id, "нет ни одного актуального предложения крепежа Маркета");
  requireValue(sitemapPaths.has(route), model.id, "полная модель отсутствует в sitemap");

  for (const placement of publicOffers) {
    requireValue(
      matches.includes(placement.offer.entity_id),
      model.id,
      `предложение Маркета ведёт на неподтверждённый кронштейн ${placement.offer.entity_id}`,
    );
    requireValue(
      placement.offer.publishable === true,
      model.id,
      `предложение ${placement.placement_id} не прошло проверку доступности`,
    );
  }

  for (const mountId of matches) {
    const mount = mountsById.get(mountId);
    requireValue(Boolean(mount), model.id, `граф ссылается на неизвестный кронштейн ${mountId}`);
    if (!mount) continue;
    const vesa = `${model.vesa_width_mm}x${model.vesa_height_mm}`;
    requireValue(mount.vesa.includes(vesa), model.id, `${mount.title} не заявляет VESA ${vesa}`);
    requireValue(mount.max_load_kg >= model.weight_kg * 1.25, model.id, `${mount.title} не даёт запас нагрузки 25%`);
    requireValue(
      model.diagonal_inches >= mount.min_diagonal_in && model.diagonal_inches <= mount.max_diagonal_in,
      model.id,
      `${mount.title} не покрывает диагональ ${model.diagonal_inches}″`,
    );
  }

  const html = await pageHtml(model.id);
  auditDocument(html, model.id, 350);
  requireValue(!hasNoindex(html), model.id, "полная модель ошибочно закрыта от индекса");
  requireValue(canonicalPath(html) === route, model.id, "canonical не совпадает с маршрутом");
  requireValue(html.includes(`VESA ${model.vesa_width_mm}×${model.vesa_height_mm}`), model.id, "на странице нет паспортного VESA");
  requireValue(html.includes(`${model.weight_kg} кг`), model.id, "на странице нет паспортной массы");
  requireValue(html.includes(escapeHtml(model.source_url)), model.id, "на странице нет ссылки на источник модели");
  requireValue(
    matches.every((mountId) => html.includes(`/kronshteyny/${mountId}/`)),
    model.id,
    "на странице показаны не все проверенные кронштейны",
  );
  requireValue(
    matches.some((mountId) => (
      currentOfferMountIds.has(mountId)
        && html.includes('data-entity-kind="mount"')
        && html.includes(`data-entity-id="${escapeHtml(mountId)}"`)
    )),
    model.id,
    "на странице нет слота для актуального предложения крепежа Яндекс Маркета",
  );
  requireValue(html.includes("Точная пара VESA"), model.id, "нет объяснения проверки точной VESA");
  requireValue(html.includes("запас 25%"), model.id, "нет объяснения запаса нагрузки 25%");
  requireValue(/диапазон[а-яё]*\s+диагонал/iu.test(html), model.id, "нет объяснения проверки диагонали");

  for (const mountId of matches) {
    const mountHtml = mountHtmlById.get(mountId);
    requireValue(Boolean(mountHtml), model.id, `нет полноценной страницы кронштейна ${mountId}`);
    requireValue(
      mountHtml?.includes(route),
      model.id,
      `страница кронштейна ${mountId} не ссылается обратно на модель`,
    );
  }
}

for (const record of market.records) {
  if (record.page_kind === "verified") {
    requireValue(
      compatibleMountsByModel.has(record.verified_model_id),
      record.record_id,
      "карточка Маркета привязана к модели без проверенного кронштейна",
    );
    continue;
  }

  const html = await pageHtml(record.id);
  auditDocument(html, record.id, 280);
  requireValue(record.indexable === false, record.id, "непроверенная модель помечена indexable");
  requireValue(hasNoindex(html), record.id, "непроверенная модель не имеет noindex");
  requireValue(!sitemapPaths.has(record.route_path), record.id, "непроверенная модель попала в sitemap");
  requireValue(canonicalPath(html) === record.canonical_path, record.id, "canonical не ведёт на основной маршрут");
  requireValue(html.includes('data-compatibility-status="unverified"'), record.id, "нет явного статуса непроверенной совместимости");
  requireValue(html.includes("Точный крепёж пока не подтверждён"), record.id, "нет честного ответа о крепеже");
  requireValue(html.includes("Как подобрать кронштейн без ошибки"), record.id, "нет самостоятельной инструкции");
  requireValue(html.includes(escapeHtml(record.market_url)), record.id, "нет ссылки на источник идентичности");
  requireValue(!/\bdata-affiliate-offer-id=/iu.test(html), record.id, "до проверки появился партнёрский CTA");
  requireValue(!/"@type"\s*:\s*"Product"/u.test(html), record.id, "до проверки появился Product JSON-LD");
  requireValue(!/VESA\s+\d{2,4}\s*[×x]\s*\d{2,4}/iu.test(html), record.id, "показан неподтверждённый VESA");
}

if (failures.length) {
  throw new Error(`Аудит модельных страниц не пройден (${failures.length}):\n- ${failures.join("\n- ")}`);
}

process.stdout.write(
  `Аудит пройден: ${models.length}/${models.length} паспортных моделей имеют проверенный крепёж; `
    + `${publicOffersByModel.size}/${models.length} имеют актуальное предложение Яндекс Маркета `
    + `(${publicModelOffers.placements.length} проверенных размещений); `
    + `${market.summary.verified_routes} наблюдений Маркета ведут на проверенные модели; `
    + `${market.summary.alias_routes} дублей закрыты от индекса и канонизированы; `
    + `${market.summary.observed_canonicals} неподтверждённых карточек безопасно закрыты от индекса без рекомендации крепежа.\n`,
);

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
}

async function pageHtml(id) {
  return readFile(path.join(DOCS, "modeli", id, "index.html"), "utf8");
}

function auditDocument(html, id, minimumWords) {
  const h1Count = (html.match(/<h1\b/giu) ?? []).length;
  const h2Count = (html.match(/<h2\b/giu) ?? []).length;
  const internalLinks = new Set(
    [...html.matchAll(/href="(\/[^"]*)"/gu)].map((match) => match[1]),
  );
  const words = html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&[^;]+;/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  requireValue(h1Count === 1, id, `ожидался один H1, получено ${h1Count}`);
  requireValue(h2Count >= 3, id, `слишком мало самостоятельных разделов: ${h2Count}`);
  requireValue(internalLinks.size >= 3, id, `слишком мало внутренних переходов: ${internalLinks.size}`);
  requireValue(words >= minimumWords, id, `страница похожа на заглушку: ${words} слов из ${minimumWords}`);
  requireValue(!/(?:lorem ipsum|TODO|контент скоро появится|страница в разработке)/iu.test(html), id, "найден текст заглушки");
}

function hasNoindex(html) {
  return /<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/iu.test(html);
}

function canonicalPath(html) {
  const match = html.match(/<link\s+rel="canonical"\s+href="(https:\/\/krepitv\.ru[^"]+)"/iu);
  return match ? new URL(match[1]).pathname : null;
}

function requireValue(condition, id, message) {
  if (!condition) failures.push(`${id}: ${message}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
