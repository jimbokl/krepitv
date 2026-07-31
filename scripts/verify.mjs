import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCoverageManifest } from "./catalog/coverage-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const origin = "https://krepitv.ru";
const maximumAffiliateAgeMs = 48 * 60 * 60 * 1000;
const affiliateFutureToleranceMs = 5 * 60 * 1000;
const corePagesUpdatedAt = "2026-07-31";
const removedAffiliateDisclaimerFragments = [
  "Партнёрская ссылка на Яндекс Маркет",
  "Если вы оформите заказ",
  "Крепи ТВ может получить вознаграждение",
  "Цена для вас не меняется",
];
const numericCurrencyPattern = /(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu;
const expectedCommercialProfiles = new Set([
  "mount:onkron-tm6:/kronshteyny/onkron-tm6/",
  "mount:onkron-tm5-bw:/kronshteyny/onkron-tm5-bw/",
  "mount:itech-plb440nt:/kronshteyny/itech-plb440nt/",
  "mount:itech-ptrb440ln:/kronshteyny/itech-ptrb440ln/",
  "mount:itech-slt-460:/kronshteyny/itech-slt-460/",
  "model:tcl-55c6k:/modeli/tcl-55c6k/",
  "model:tcl-55c7l:/modeli/tcl-55c7l/",
  "model:hisense-55u7s:/modeli/hisense-55u7s/",
  "model:hisense-65u7s:/modeli/hisense-65u7s/",
  "model:hisense-55u7s-pro:/modeli/hisense-55u7s-pro/",
  "model:hisense-55e77sl:/modeli/hisense-55e77sl/",
  "model:hisense-50u77sl:/modeli/hisense-50u77sl/",
  "model:hisense-65u77sl:/modeli/hisense-65u77sl/",
  "model:hisense-50e7s:/modeli/hisense-50e7s/",
  "model:hisense-55e7s:/modeli/hisense-55e7s/",
  "model:samsung-ue43u8000fuxru:/modeli/samsung-ue43u8000fuxru/",
  "model:samsung-ue50u8000fuxru:/modeli/samsung-ue50u8000fuxru/",
  "model:samsung-ue55u8000fuxru:/modeli/samsung-ue55u8000fuxru/",
  "model:tcl-55c7k:/modeli/tcl-55c7k/",
  "model:tcl-65c7k:/modeli/tcl-65c7k/",
  "model:tcl-75c6k:/modeli/tcl-75c6k/",
]);
const seoHubAffiliatePaths = new Set([
  "/kronshteyny-onkron/",
  "/kupit-kronshteyn-dlya-televizora/",
  "/kronshteyny-kromax/",
  "/tipy-kronshteynov/vydvizhnoy/",
  "/kronshteyny-holder/",
  "/kronshteyny-itechmount/",
]);

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    if ((await stat(absolute)).isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function assertMinimum(items, minimum, label) {
  if (items.length < minimum) {
    throw new Error(`${label}: ожидалось не менее ${minimum}, найдено ${items.length}`);
  }
}

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item || seen.has(item)) {
      throw new Error(`${label}: пустое или повторяющееся значение «${item ?? ""}»`);
    }
    seen.add(item);
  }
}

function routeFromHtmlFile(file) {
  const relative = path.relative(docs, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/index\.html$/, "")}`;
}

function dataPageRoute(page) {
  return page.path;
}

function matchAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeHtmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function metaContent(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => matchAttribute(candidate, "name").toLowerCase() === name);
  return tag ? matchAttribute(tag, "content") : "";
}

function canonicalFromHtml(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => matchAttribute(candidate, "rel").toLowerCase() === "canonical");
  return tag ? matchAttribute(tag, "href") : "";
}

function titleFromHtml(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1].trim() ?? "";
}

function jsonLdFromHtml(html, route) {
  const blocks = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((match) => match[1].trim());
  if (blocks.length === 0) {
    throw new Error(`Нет JSON-LD: ${route}`);
  }
  return blocks.map((raw) => {
    if (/[<>&]/.test(raw)) {
      throw new Error(`JSON-LD содержит небезопасный HTML-символ: ${route}`);
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Некорректный JSON-LD на ${route}: ${error.message}`);
    }
  });
}

function normalizeInternalHref(href, sourceRoute) {
  if (!href || /^(?:#|mailto:|tel:|javascript:)/i.test(href)) return null;
  let url;
  try {
    url = new URL(href, `${origin}${sourceRoute}`);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
}

function assertHttpsSource(item, label) {
  let url;
  try {
    url = new URL(item.source_url);
  } catch {
    throw new Error(`${label}: некорректный URL источника ${item.source_url ?? ""}`);
  }
  if (url.protocol !== "https:" || !url.hostname) {
    throw new Error(`${label}: источник должен быть доступен по HTTPS`);
  }
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: ожидался объект`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(
      `${label}: неверный набор полей (${actual.join(", ") || "пусто"})`,
    );
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(`${label}: ожидалась непустая строка без внешних пробелов`);
  }
}

function assertNoNumericPrice(profile) {
  const text = [
    profile.title,
    profile.description,
    profile.kicker,
    profile.heading,
    profile.answer,
    ...profile.faq.flatMap((item) => [item.question, item.answer]),
  ].join("\n");
  const currency = /(?:₽|\bруб(?:\.|ль|ля|лей)?\b)/iu;
  const numericPrice = /\b(?:цена|стоимость)\s*(?::|—|–|-)?\s*(?:от\s+|до\s+)?\d/iu;
  if (currency.test(text) || numericPrice.test(text)) {
    throw new Error(
      `Коммерческий профиль ${profile.entity_kind}:${profile.entity_id} содержит числовую цену или обозначение рублей`,
    );
  }
}

function containsNumberToken(value, number) {
  const escaped = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\D)${escaped}(?:\\D|$)`, "u").test(value);
}

const files = await walk(docs);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const yandexVerificationFiles = htmlFiles.filter((file) =>
  /^yandex_[a-f0-9]+\.html$/i.test(path.basename(file)),
);
const pageHtmlFiles = htmlFiles.filter((file) => !yandexVerificationFiles.includes(file));
assertMinimum(pageHtmlFiles, 25, "HTML-страницы");

const runtimeTextFiles = files.filter((file) => /\.(?:html|js|json)$/u.test(file));
for (const file of runtimeTextFiles) {
  const contents = await readFile(file, "utf8");
  const removedFragment = removedAffiliateDisclaimerFragments.find((fragment) =>
    contents.toLocaleLowerCase("ru-RU").includes(fragment.toLocaleLowerCase("ru-RU")),
  );
  if (removedFragment) {
    throw new Error(
      `Удалённый партнёрский дисклеймер вернулся в runtime-артефакт: ${path.relative(root, file)}`,
    );
  }
  if (numericCurrencyPattern.test(contents)) {
    throw new Error(`Числовая цена попала в runtime-артефакт: ${path.relative(root, file)}`);
  }
}

for (const file of yandexVerificationFiles) {
  const relative = path.relative(docs, file).split(path.sep).join("/");
  if (relative !== path.basename(file)) {
    throw new Error(`Файл подтверждения Яндекса должен лежать в корне: ${relative}`);
  }
  const token = path.basename(file).match(/^yandex_([a-f0-9]+)\.html$/i)?.[1];
  const html = await readFile(file, "utf8");
  if (!token || !html.includes(`Verification: ${token}`)) {
    throw new Error(`Неверное содержимое файла подтверждения Яндекса: ${relative}`);
  }
  if (/<(?:script|iframe|form)\b|\b(?:src|href)=["']https?:/i.test(html)) {
    throw new Error(`Файл подтверждения Яндекса содержит лишний исполняемый код: ${relative}`);
  }
}

const required = [
  "index.html",
  "podbor/index.html",
  "modeli/index.html",
  "kronshteyny/index.html",
  "o-proekte/index.html",
  "metodika/index.html",
  "kontakty/index.html",
  "politika-konfidencialnosti/index.html",
  "rozetki-pod-televizor-na-stene/index.html",
  "krepitv-engine-loader.js",
  "pkg/krepitv_engine_bg.wasm",
  "pkg/krepitv_engine.js",
  "data/compatibility-graph.json",
  "data/catalog-coverage.json",
  "data/affiliate-offers.json",
  "data/affiliate-hub-offers.json",
  "data/commercial-profiles.json",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "CNAME",
  ".nojekyll",
];
for (const relative of required) {
  if (!files.includes(path.join(docs, relative))) {
    throw new Error(`В релизе отсутствует ${relative}`);
  }
}

if (files.includes(path.join(docs, "pkg/.gitignore"))) {
  throw new Error("Публикуемый WASM-пакет не должен быть скрыт локальным .gitignore");
}

const models = JSON.parse(await readFile(path.join(docs, "data/tv-models.json"), "utf8"));
const mounts = JSON.parse(await readFile(path.join(docs, "data/mounts.json"), "utf8"));
const compatibilityEdges = JSON.parse(
  await readFile(path.join(docs, "data/compatibility-graph.json"), "utf8"),
);
const coverageManifest = JSON.parse(
  await readFile(path.join(docs, "data/catalog-coverage.json"), "utf8"),
);
const seoPages = JSON.parse(await readFile(path.join(docs, "data/seo-pages.json"), "utf8"));
const trustPages = JSON.parse(await readFile(path.join(docs, "data/trust-pages.json"), "utf8"));
const sourceCommercialProfilesRaw = await readFile(
  path.join(root, "data/commercial_profiles.json"),
  "utf8",
);
const publicCommercialProfilesRaw = await readFile(
  path.join(docs, "data/commercial-profiles.json"),
  "utf8",
);
const commercialProfilesManifest = JSON.parse(publicCommercialProfilesRaw);
const affiliateSnapshot = JSON.parse(
  await readFile(path.join(docs, "data/affiliate-offers.json"), "utf8"),
);
const sourceHubAffiliateRaw = await readFile(
  path.join(root, "data/affiliate/public-hub-offers.json"),
  "utf8",
);
const publicHubAffiliateRaw = await readFile(
  path.join(docs, "data/affiliate-hub-offers.json"),
  "utf8",
);
const hubAffiliateSnapshot = JSON.parse(publicHubAffiliateRaw);

if (sourceCommercialProfilesRaw !== publicCommercialProfilesRaw) {
  throw new Error("Публичная копия commercial-profiles.json отличается от исходного файла");
}
if (sourceHubAffiliateRaw !== publicHubAffiliateRaw) {
  throw new Error("Публичная копия affiliate-hub-offers.json отличается от исходного файла");
}
assertExactKeys(
  hubAffiliateSnapshot,
  ["schema_version", "generated_at", "placements"],
  "Публичный снимок размещений SEO-хабов",
);
if (
  hubAffiliateSnapshot.schema_version !== 1 ||
  !Number.isFinite(Date.parse(hubAffiliateSnapshot.generated_at ?? "")) ||
  !Array.isArray(hubAffiliateSnapshot.placements)
) {
  throw new Error("Некорректный публичный снимок размещений SEO-хабов");
}
assertExactKeys(
  commercialProfilesManifest,
  ["schema_version", "updated_at", "profiles"],
  "Манифест коммерческих профилей",
);
if (
  commercialProfilesManifest.schema_version !== 1 ||
  !/^\d{4}-\d{2}-\d{2}$/u.test(commercialProfilesManifest.updated_at ?? "") ||
  !Array.isArray(commercialProfilesManifest.profiles)
) {
  throw new Error(
    "Манифест коммерческих профилей: ожидаются schema_version=1, updated_at и массив profiles",
  );
}
const commercialProfiles = commercialProfilesManifest.profiles;
if (commercialProfiles.length !== expectedCommercialProfiles.size) {
  throw new Error(
    `Коммерческие профили: ожидалось ровно ${expectedCommercialProfiles.size}, найдено ${commercialProfiles.length}`,
  );
}

for (const profile of commercialProfiles) {
  const identity = `${profile?.entity_kind}:${profile?.entity_id}:${profile?.path}`;
  assertExactKeys(
    profile,
    [
      "entity_kind",
      "entity_id",
      "path",
      "title",
      "description",
      "kicker",
      "heading",
      "answer",
      "faq",
    ],
    `Коммерческий профиль ${identity}`,
  );
  for (const field of [
    "entity_kind",
    "entity_id",
    "path",
    "title",
    "description",
    "kicker",
    "heading",
    "answer",
  ]) {
    assertNonEmptyString(profile[field], `Коммерческий профиль ${identity}, поле ${field}`);
  }
  if (!expectedCommercialProfiles.has(identity)) {
    throw new Error(`Коммерческий профиль вне разрешённого набора: ${identity}`);
  }
  const entityExists =
    profile.entity_kind === "model"
      ? models.some((model) => model.id === profile.entity_id)
      : mounts.some((mount) => mount.id === profile.entity_id);
  if (!entityExists) {
    throw new Error(`Коммерческий профиль ссылается на неизвестную сущность: ${identity}`);
  }
  if (profile.title.length > 65) {
    throw new Error(`Коммерческий профиль ${identity}: title длиннее 65 символов`);
  }
  if (profile.description.length > 160) {
    throw new Error(`Коммерческий профиль ${identity}: description длиннее 160 символов`);
  }
  for (const [field, maximumLength] of [
    ["kicker", 80],
    ["heading", 160],
    ["answer", 1_200],
  ]) {
    if (profile[field].length > maximumLength) {
      throw new Error(
        `Коммерческий профиль ${identity}: ${field} длиннее ${maximumLength} символов`,
      );
    }
  }
  if (!Array.isArray(profile.faq) || profile.faq.length !== 3) {
    throw new Error(`Коммерческий профиль ${identity}: FAQ должен содержать ровно 3 пары`);
  }
  profile.faq.forEach((item, index) => {
    assertExactKeys(
      item,
      ["question", "answer"],
      `Коммерческий профиль ${identity}, FAQ ${index + 1}`,
    );
    assertNonEmptyString(
      item.question,
      `Коммерческий профиль ${identity}, вопрос FAQ ${index + 1}`,
    );
    assertNonEmptyString(
      item.answer,
      `Коммерческий профиль ${identity}, ответ FAQ ${index + 1}`,
    );
    if (item.question.length > 180 || item.answer.length > 600) {
      throw new Error(
        `Коммерческий профиль ${identity}, FAQ ${index + 1}: превышен клиентский лимит текста`,
      );
    }
  });
  const verifiedCount = compatibilityEdges.filter(
    (edge) =>
      edge.fit_status === "verified-fit" &&
      (profile.entity_kind === "model"
        ? edge.tv_id === profile.entity_id
        : edge.mount_id === profile.entity_id),
  ).length;
  if (
    verifiedCount < 1 ||
    !containsNumberToken(profile.answer, verifiedCount) ||
    !containsNumberToken(profile.description, verifiedCount)
  ) {
    throw new Error(
      `Коммерческий профиль ${identity}: заявленное число совместимых позиций не совпадает с графом (${verifiedCount})`,
    );
  }
  assertNoNumericPrice(profile);
}
assertUnique(
  commercialProfiles.map((profile) => `${profile.entity_kind}:${profile.entity_id}`),
  "Коммерческие профили, kind:id",
);
assertUnique(
  commercialProfiles.map((profile) => profile.path),
  "Коммерческие профили, пути",
);
assertUnique(
  commercialProfiles.map((profile) => `${profile.entity_kind}:${profile.entity_id}:${profile.path}`),
  "Коммерческие профили, полная идентичность",
);
const publishableAffiliateOffers = (affiliateSnapshot.offers ?? []).filter(
  (offer) => offer.publishable && offer.eligibility === "publishable",
);
const publishableHubAffiliateOffers = (hubAffiliateSnapshot.placements ?? [])
  .map((placement) => placement.offer)
  .filter((offer) => offer?.publishable && offer.eligibility === "publishable");
const publishableMarketOffers = [
  ...publishableAffiliateOffers,
  ...publishableHubAffiliateOffers,
];
const publishableAffiliateHrefs = new Set(
  publishableMarketOffers.map((offer) => offer.affiliate_href),
);

assertMinimum(models, 2, "Проверенные модели телевизоров");
assertMinimum(mounts, 3, "Проверенные кронштейны");
assertMinimum(seoPages, 12, "SEO-материалы");
assertMinimum(trustPages, 4, "Доверительные страницы");
assertMinimum(publishableAffiliateOffers, 1, "Публикуемые affiliate offers");
const coverageSummary = validateCoverageManifest(coverageManifest, models);

for (const [items, label] of [
  [models, "Модели телевизоров"],
  [mounts, "Кронштейны"],
  [seoPages, "SEO-материалы"],
  [trustPages, "Доверительные страницы"],
]) {
  assertUnique(items.map((item) => item.id), `${label}, идентификаторы`);
}
assertUnique(seoPages.map((page) => page.path), "SEO-материалы, пути");
assertUnique(seoPages.map((page) => page.title), "SEO-материалы, title");
assertUnique(trustPages.map((page) => page.path), "Доверительные страницы, пути");
assertUnique(trustPages.map((page) => page.title), "Доверительные страницы, title");
assertUnique(models.map((item) => item.source_url), "Модели телевизоров, источники");
assertUnique(mounts.map((item) => item.source_url), "Кронштейны, источники");
assertUnique(
  publishableAffiliateOffers.map((offer) => offer.id),
  "Affiliate offers, идентификаторы",
);
assertUnique(
  publishableAffiliateOffers.map((offer) => offer.page_path),
  "Affiliate offers, страницы кронштейнов",
);

const affiliateNow = Date.now();
for (const offer of publishableMarketOffers) {
  const checkedAt = Date.parse(offer.checked_at ?? "");
  const age = affiliateNow - checkedAt;
  if (
    !Number.isFinite(checkedAt) ||
    age < -affiliateFutureToleranceMs ||
    age > maximumAffiliateAgeMs
  ) {
    throw new Error(`Publishable affiliate offer устарел или имеет неверную дату: ${offer.id}`);
  }
  if (
    offer.entity_kind !== "mount" ||
    offer.page_path !== `/kronshteyny/${offer.entity_id}/` ||
    !mounts.some((mount) => mount.id === offer.entity_id)
  ) {
    throw new Error(`Affiliate offer ссылается на неизвестную страницу кронштейна: ${offer.id}`);
  }
}

for (const model of models) {
  assertHttpsSource(model, `Модель ${model.id}`);
  if (!model.source_label?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(model.checked_at ?? "")) {
    throw new Error(`Модель ${model.id}: нет подписи источника или даты проверки`);
  }
  const hardware = model.wall_mount_screws;
  if (hardware) {
    const groups = hardware.groups;
    const locations = new Set(groups?.map((group) => group.location?.trim().toLocaleLowerCase("ru-RU")));
    if (
      !Array.isArray(groups) ||
      groups.length < 1 ||
      groups.length > 4 ||
      groups.reduce((total, group) => total + group.quantity, 0) !== 4 ||
      locations.size !== groups.length ||
      groups.some((group) => {
        const hasExactLength = Number.isInteger(group.length_mm);
        const hasEngagementRange =
          Number.isFinite(group.engagement_min_mm)
          && Number.isFinite(group.engagement_max_mm);
        return (
          !group.location?.trim()
          || !/^M\d{1,2}$/.test(group.thread ?? "")
          || hasExactLength === hasEngagementRange
          || (hasExactLength && (group.length_mm < 4 || group.length_mm > 100))
          || (hasEngagementRange && (
            group.engagement_min_mm < 1
            || group.engagement_max_mm > 100
            || group.engagement_min_mm >= group.engagement_max_mm
          ))
          || (!hasEngagementRange && (
            group.engagement_min_mm !== undefined
            || group.engagement_max_mm !== undefined
          ))
          || (group.range_label !== undefined && (
            !hasEngagementRange
            || !["L", "C"].includes(group.range_label)
          ))
          || !Number.isInteger(group.quantity)
          || group.quantity < 1
          || group.quantity > 4
        );
      }) ||
      (hardware.requires_adapters !== undefined
        && typeof hardware.requires_adapters !== "boolean") ||
      (hardware.required_parts_note !== undefined && !hardware.required_parts_note?.trim()) ||
      (hardware.vesa_conflict !== undefined && (
        !hardware.vesa_conflict?.catalog_value?.trim()
        || !hardware.vesa_conflict?.manual_value?.trim()
        || hardware.vesa_conflict.catalog_value === hardware.vesa_conflict.manual_value
        || !hardware.vesa_conflict?.note?.trim()
      )) ||
      !hardware.source_region?.trim() ||
      !hardware.source_url?.startsWith("https://") ||
      !hardware.source_label?.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(hardware.checked_at ?? "") ||
      !hardware.note?.trim()
    ) {
      throw new Error(`Модель ${model.id}: некорректный паспорт настенного монтажа`);
    }
  }
}
for (const mount of mounts) {
  assertHttpsSource(mount, `Кронштейн ${mount.id}`);
  if (
    !mount.brand?.trim() ||
    !mount.model?.trim() ||
    !mount.source_label?.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(mount.checked_at ?? "") ||
    !Array.isArray(mount.vesa) ||
    mount.vesa.length === 0
  ) {
    throw new Error(`Кронштейн ${mount.id}: неполная идентичность, VESA или источник`);
  }
}

assertMinimum(
  compatibilityEdges,
  Math.max(models.length, mounts.length),
  "Полезные рёбра совместимости",
);
assertUnique(
  compatibilityEdges.map((edge) => `${edge.tv_id}:${edge.mount_id}`),
  "Граф совместимости, пары",
);
for (const edge of compatibilityEdges) {
  if (!models.some((model) => model.id === edge.tv_id)) {
    throw new Error(`Граф ссылается на неизвестный телевизор ${edge.tv_id}`);
  }
  if (!mounts.some((mount) => mount.id === edge.mount_id)) {
    throw new Error(`Граф ссылается на неизвестный кронштейн ${edge.mount_id}`);
  }
  if (!edge.compatible || !["verified-fit", "conditional-fit"].includes(edge.fit_status)) {
    throw new Error(`Граф содержит неизвестный статус ${edge.fit_status}`);
  }
}
for (const page of seoPages) {
  if (typeof page.indexable !== "boolean") {
    throw new Error(`SEO-материал ${page.id}: поле indexable должно быть boolean`);
  }
  const filter = (() => {
    if (page.kind === "mount-brand") {
      const brand = page.id.replace(/^mount-brand-/i, "").toLocaleLowerCase("ru-RU");
      return {
        minimum: 4,
        entityIds: mounts
          .filter((mount) => mount.brand.toLocaleLowerCase("ru-RU") === brand)
          .map((mount) => mount.id),
        edgeKey: "mount_id",
      };
    }
    if (page.kind === "brand") {
      const brand = page.id.replace(/^brand-/i, "").toLocaleLowerCase("ru-RU");
      return {
        minimum: 5,
        entityIds: models
          .filter((model) => model.brand.toLocaleLowerCase("ru-RU") === brand)
          .map((model) => model.id),
        edgeKey: "tv_id",
      };
    }
    if (page.kind === "diagonal") {
      const diagonal = Number(page.id.replace(/^diagonal-/i, ""));
      return {
        minimum: 4,
        entityIds: models
          .filter((model) => Math.abs(model.diagonal_inches - diagonal) < 0.05)
          .map((model) => model.id),
        edgeKey: "tv_id",
      };
    }
    if (page.kind === "vesa") {
      const [width, height] = page.id.replace(/^vesa-/i, "").split("x").map(Number);
      return {
        minimum: 5,
        entityIds: models
          .filter((model) => model.vesa_width_mm === width && model.vesa_height_mm === height)
          .map((model) => model.id),
        edgeKey: "tv_id",
      };
    }
    return null;
  })();
  if (page.indexable && filter) {
    if (filter.entityIds.length < filter.minimum) {
      throw new Error(
        `SEO-материал ${page.id}: индексируемый фильтр слишком тонкий (${filter.entityIds.length} < ${filter.minimum})`,
      );
    }
    const entityIds = new Set(filter.entityIds);
    const verifiedPairs = compatibilityEdges.filter(
      (edge) => edge.fit_status === "verified-fit" && entityIds.has(edge[filter.edgeKey]),
    ).length;
    if (verifiedPairs < 25) {
      throw new Error(`SEO-материал ${page.id}: недостаточно подтверждённых пар (${verifiedPairs} < 25)`);
    }
  }
}

const sourceFiles = (await walk(path.join(root, "web/src"))).filter((file) =>
  /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/.test(file),
);
const affiliateComponent = path.join(root, "web/src/components/AffiliateOffer.jsx");
const affiliateConsumers = new Set([
  path.join(root, "web/src/pages/ModelPage.jsx"),
  path.join(root, "web/src/pages/MountPage.jsx"),
  path.join(root, "web/src/pages/SeoPage.jsx"),
]);
for (const file of sourceFiles) {
  if (file === affiliateComponent || affiliateConsumers.has(file)) continue;
  const source = await readFile(file, "utf8");
  if (/\bAffiliateOffer\b/.test(source)) {
    throw new Error(
      `AffiliateOffer нельзя подключать без интеграционного теста финального DOM: ${path.relative(root, file)}`,
    );
  }
}

const htmlByRoute = new Map();
for (const file of pageHtmlFiles) {
  const route = routeFromHtmlFile(file);
  const html = await readFile(file, "utf8");
  htmlByRoute.set(route, html);

  if (!/<html\s+lang=["']ru["']/.test(html)) {
    throw new Error(`Не указан русский язык: ${path.relative(root, file)}`);
  }
  if (/\blang=["']en["']|\bPrototype\b|lorem ipsum/i.test(html)) {
    throw new Error(`Найдена служебная английская строка: ${path.relative(root, file)}`);
  }
  const description = metaContent(html, "description");
  if (!description) {
    throw new Error(`Нет описания страницы: ${path.relative(root, file)}`);
  }
  if (/data-page-kind=["']mount["']/.test(html) && description.length > 160) {
    throw new Error(`Слишком длинное описание кронштейна: ${path.relative(root, file)}`);
  }
  if (!/<h1(?:\s|>)/.test(html)) {
    throw new Error(`В HTML нет самостоятельного H1: ${path.relative(root, file)}`);
  }
  if (/href=["']\/go\//i.test(html)) {
    throw new Error(`Запрещён скрывающий назначение редирект: ${path.relative(root, file)}`);
  }
  if (
    !coverageSummary.full_catalog_claim &&
    /(?:все\s+популярные\s+(?:модели|телевизоры)|полный\s+каталог\s+(?:моделей|телевизоров))/i.test(
      html,
    )
  ) {
    throw new Error(
      `Пилотный каталог нельзя публично называть полным: ${path.relative(root, file)}`,
    );
  }

  const marketLinks = html.match(
    /<a\b[^>]*href=["']https:\/\/market\.yandex\.ru\/[^"']*["'][^>]*>/gi,
  ) ?? [];
  if (/\bdata-affiliate-offer-id=/i.test(html)) {
    throw new Error(`Действующий affiliate CTA попал в статический HTML: ${path.relative(root, file)}`);
  }
  for (const link of marketLinks) {
    if (publishableAffiliateHrefs.has(decodeHtmlAttribute(matchAttribute(link, "href")))) {
      throw new Error(`Партнёрский URL попал в статический HTML: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bsponsored\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=sponsored: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnofollow\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=nofollow: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=noopener: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnoreferrer\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=noreferrer: ${path.relative(root, file)}`);
    }
    const mode = link.match(/\bdata-affiliate-mode=["']([^"']+)["']/i)?.[1];
    if (mode === "advertising") {
      if (!/\bdata-erid=["'][^"']+["']/i.test(link)) {
        throw new Error(`Рекламная ссылка без ERID: ${path.relative(root, file)}`);
      }
      if (!html.includes("Реклама") || !html.includes("erid:")) {
        throw new Error(`Рекламная ссылка без видимой маркировки: ${path.relative(root, file)}`);
      }
    } else if (mode === "non_ad_storefront") {
      if (/\bdata-erid=/i.test(link) || !/\bdata-clid=["']\d{5,20}["']/i.test(link)) {
        throw new Error(`Нерекламная витринная ссылка с неверной атрибуцией: ${path.relative(root, file)}`);
      }
    } else {
      throw new Error(`Партнёрская ссылка без режима размещения: ${path.relative(root, file)}`);
    }
  }
}

const profilesByMarker = new Map(
  commercialProfiles.map((profile) => [
    `${profile.entity_kind}:${profile.entity_id}`,
    profile,
  ]),
);
for (const [route, html] of htmlByRoute) {
  const markerTags = html.match(
    /<[a-z][^>]*\bdata-commercial-profile=["'][^"']+["'][^>]*>/gi,
  ) ?? [];
  for (const tag of markerTags) {
    const marker = matchAttribute(tag, "data-commercial-profile");
    const profile = profilesByMarker.get(marker);
    if (!profile || profile.path !== route) {
      throw new Error(`Неожиданный SSR-маркер коммерческого профиля ${marker} на ${route}`);
    }
  }
}

for (const route of seoHubAffiliatePaths) {
  const html = htmlByRoute.get(route);
  if (!html) {
    throw new Error(`Нет статического SEO-хаба для клиентской витрины: ${route}`);
  }
  if (
    /\bdata-affiliate-(?:hub|slot|offer-id|mode)=/iu.test(html) ||
    [...publishableAffiliateHrefs].some((href) => html.includes(href))
  ) {
    throw new Error(`Действующая клиентская витрина попала в статический HTML: ${route}`);
  }
}

for (const profile of commercialProfiles) {
  const identity = `${profile.entity_kind}:${profile.entity_id}`;
  const html = htmlByRoute.get(profile.path);
  if (!html) {
    throw new Error(`Нет статического URL коммерческого профиля: ${profile.path}`);
  }
  const markerTags = (html.match(
    /<[a-z][^>]*\bdata-commercial-profile=["'][^"']+["'][^>]*>/gi,
  ) ?? []).filter(
    (tag) => matchAttribute(tag, "data-commercial-profile") === identity,
  );
  if (markerTags.length !== 1) {
    throw new Error(
      `Коммерческий профиль ${identity} должен иметь ровно один SSR-маркер на ${profile.path}`,
    );
  }
  if (decodeHtmlAttribute(titleFromHtml(html)) !== profile.title) {
    throw new Error(`Коммерческий профиль ${identity}: HTML title не совпадает с манифестом`);
  }
  if (decodeHtmlAttribute(metaContent(html, "description")) !== profile.description) {
    throw new Error(
      `Коммерческий профиль ${identity}: meta description не совпадает с манифестом`,
    );
  }
  if (decodeHtmlAttribute(canonicalFromHtml(html)) !== `${origin}${profile.path}`) {
    throw new Error(`Коммерческий профиль ${identity}: неверный canonical`);
  }
  const requiredStaticText = [
    profile.kicker,
    profile.heading,
    profile.answer,
    ...profile.faq.flatMap((item) => [item.question, item.answer]),
  ];
  if (!requiredStaticText.every((value) => html.includes(escapeHtmlText(value)))) {
    throw new Error(`Коммерческий профиль ${identity}: SSR содержит не весь материал`);
  }
}

let modelContextLinkCount = 0;
for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const html = htmlByRoute.get(route);
  if (!html) throw new Error(`Нет страницы модели для проверки перелинковки: ${model.id}`);

  const candidateIds = [
    `brand-${String(model.brand).trim().toLocaleLowerCase("ru-RU")}`,
    `diagonal-${Number(model.diagonal_inches)}`,
    `vesa-${model.vesa_width_mm}x${model.vesa_height_mm}`,
  ];
  const expectedPages = candidateIds
    .map((id) => seoPages.find((page) => page.id === id && page.indexable))
    .filter(Boolean);
  const contextNav = html.match(
    /<nav\b[^>]*aria-label=["']Связанные подборы["'][^>]*>([\s\S]*?)<\/nav>/i,
  )?.[1] ?? "";

  for (const page of expectedPages) {
    if (!new RegExp(`href=["']${page.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(contextNav)) {
      throw new Error(`Модель ${model.id} не ссылается на контекстный хаб ${page.id}`);
    }
    modelContextLinkCount += 1;
  }
  const contextHrefs = [...contextNav.matchAll(/href=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const href of contextHrefs) {
    if (!seoPages.some((page) => page.path === href && page.indexable)) {
      throw new Error(`Модель ${model.id} ссылается на noindex или неизвестный хаб ${href}`);
    }
  }
}
assertMinimum(modelContextLinkCount, 100, "Контекстные ссылки модель → SEO-хаб");

for (const offer of publishableAffiliateOffers) {
  const html = htmlByRoute.get(offer.page_path);
  if (!html) {
    throw new Error(`Нет mount page для publishable affiliate offer: ${offer.id}`);
  }
  const matchingSlots = (html.match(/<aside\b[^>]*>/gi) ?? []).filter(
    (tag) => matchAttribute(tag, "data-affiliate-slot") === offer.id,
  );
  if (matchingSlots.length !== 1) {
    throw new Error(
      `Publishable affiliate offer должен иметь ровно один безопасный static slot: ${offer.id}`,
    );
  }
  const slot = matchingSlots[0];
  if (
    matchAttribute(slot, "data-entity-kind") !== "mount" ||
    matchAttribute(slot, "data-entity-id") !== offer.entity_id
  ) {
    throw new Error(`Статический affiliate slot потерял идентичность изделия: ${offer.id}`);
  }
  if (/\bhref\s*=/.test(slot) || html.includes(`data-affiliate-offer-id="${offer.id}"`)) {
    throw new Error(`Статический affiliate slot не должен содержать активную ссылку: ${offer.id}`);
  }
  const slotPosition = html.indexOf(`data-affiliate-slot="${offer.id}"`);
  const modelListPosition = html.indexOf("Подтверждённые популярные телевизоры");
  if (slotPosition < 0 || modelListPosition < 0 || slotPosition > modelListPosition) {
    throw new Error(`Affiliate slot расположен после списка телевизоров: ${offer.id}`);
  }
  const leakedLink = (html.match(/<a\b[^>]*>/gi) ?? []).find(
    (tag) => decodeHtmlAttribute(matchAttribute(tag, "href")) === offer.affiliate_href,
  );
  if (leakedLink) {
    throw new Error(`Партнёрский URL попал в статический HTML: ${offer.id}`);
  }
}

const titles = [...htmlByRoute.entries()].map(([route, html]) => ({
  route,
  value: titleFromHtml(html),
}));
assertUnique(titles.map(({ value }) => value), "HTML-страницы, title");
const canonicals = [...htmlByRoute.entries()].map(([route, html]) => ({
  route,
  value: canonicalFromHtml(html),
}));
assertUnique(canonicals.map(({ value }) => value), "HTML-страницы, canonical");
if (titleFromHtml(htmlByRoute.get("/")) === titleFromHtml(htmlByRoute.get("/podbor/"))) {
  throw new Error("Главная и /podbor/ должны иметь разные title");
}

for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const html = htmlByRoute.get(route);
  if (!html || !html.includes(model.title) || !html.includes(model.source_url)) {
    throw new Error(`Нет статической страницы модели с источником: ${route}`);
  }
  const compatibleMountIds = compatibilityEdges
    .filter((edge) => edge.tv_id === model.id && edge.compatible)
    .map((edge) => edge.mount_id);
  if (!compatibleMountIds.every((id) => html.includes(`/kronshteyny/${id}/`))) {
    throw new Error(`Страница модели не содержит все взаимные ссылки: ${route}`);
  }
}
for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const html = htmlByRoute.get(route);
  if (!html || !html.includes(mount.title) || !html.includes(mount.source_url)) {
    throw new Error(`Нет статической страницы кронштейна с источником: ${route}`);
  }
  const compatibleModelIds = compatibilityEdges
    .filter((edge) => edge.mount_id === mount.id && edge.compatible)
    .map((edge) => edge.tv_id);
  if (!compatibleModelIds.every((id) => html.includes(`/modeli/${id}/`))) {
    throw new Error(`Страница кронштейна не содержит все взаимные ссылки: ${route}`);
  }
}
for (const page of trustPages) {
  const html = htmlByRoute.get(dataPageRoute(page));
  if (!html?.includes(page.h1)) {
    throw new Error(`В HTML нет самостоятельного содержимого: ${page.path}`);
  }
}
for (const page of seoPages) {
  const html = htmlByRoute.get(dataPageRoute(page));
  if (
    !html?.includes(page.h1) ||
    !page.faq.every(([question, answer]) => html.includes(question) && html.includes(answer))
  ) {
    throw new Error(`SEO-страница не содержит полного статического материала: ${page.path}`);
  }
}

function hasVerifiedModel(modelId) {
  return compatibilityEdges.some(
    (edge) => edge.tv_id === modelId && edge.compatible && edge.fit_status === "verified-fit",
  );
}

function hasVerifiedMount(mountId) {
  return compatibilityEdges.some(
    (edge) => edge.mount_id === mountId && edge.compatible && edge.fit_status === "verified-fit",
  );
}

function seoCatalogExpectation(page) {
  if (page.kind === "mechanism") {
    const mechanism = {
      "fixed-mount": "fixed",
      "tilt-mount": "tilt",
      "full-motion-mount": "full-motion",
    }[page.id];
    return mechanism
      ? {
          label: "кронштейнов",
          routes: mounts
            .filter((mount) => mount.mechanism === mechanism && hasVerifiedMount(mount.id))
            .map((mount) => `/kronshteyny/${mount.id}/`),
        }
      : null;
  }

  if (page.kind === "vesa") {
    const match = page.id.match(/^vesa-(\d+)x(\d+)$/);
    if (!match) return null;
    const [, width, height] = match;
    return {
      label: "моделей",
      routes: models
        .filter(
          (model) =>
            model.vesa_width_mm === Number(width) &&
            model.vesa_height_mm === Number(height) &&
            hasVerifiedModel(model.id),
        )
        .map((model) => `/modeli/${model.id}/`),
    };
  }

  if (page.kind === "diagonal") {
    const diagonal = Number(page.id.replace(/^diagonal-/, ""));
    if (!Number.isFinite(diagonal)) return null;
    return {
      label: "моделей",
      routes: models
        .filter(
          (model) =>
            Math.abs(model.diagonal_inches - diagonal) < 0.05 && hasVerifiedModel(model.id),
        )
        .map((model) => `/modeli/${model.id}/`),
    };
  }

  if (page.kind === "brand") {
    const brand = page.id.replace(/^brand-/, "").toLocaleLowerCase("ru-RU");
    return {
      label: "моделей",
      routes: models
        .filter(
          (model) =>
            String(model.brand).trim().toLocaleLowerCase("ru-RU") === brand &&
            hasVerifiedModel(model.id),
        )
        .map((model) => `/modeli/${model.id}/`),
    };
  }

  return null;
}

for (const page of seoPages) {
  const expected = seoCatalogExpectation(page);
  if (!expected) continue;
  const html = htmlByRoute.get(page.path);
  if (!html.includes("Данные проверенного каталога") || !html.includes("<details")) {
    throw new Error(`SEO-страница не содержит статический каталог ${expected.label}: ${page.path}`);
  }
  for (const route of expected.routes) {
    if (!html.includes(`href="${route}"`)) {
      throw new Error(`Статический каталог на ${page.path} не содержит ${route}`);
    }
  }
  const outsideDetails = html.replace(/<details\b[\s\S]*?<\/details>/gi, "");
  if (expected.routes.some((route) => outsideDetails.includes(`href="${route}"`))) {
    throw new Error(`Длинный каталог на ${page.path} выведен вне сворачиваемых групп`);
  }
}

const sitemap = await readFile(path.join(docs, "sitemap.xml"), "utf8");
const sitemapEntries = [...sitemap.matchAll(
  /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g,
)].map((match) => ({ url: match[1], lastmod: match[2] }));
const sitemapUrlElementCount = [...sitemap.matchAll(/<url>/g)].length;
if (sitemapEntries.length !== sitemapUrlElementCount) {
  throw new Error("Каждый URL sitemap должен иметь соседний точный lastmod");
}
const sitemapUrls = sitemapEntries.map((entry) => entry.url);
const sitemapLastmods = new Map(sitemapEntries.map((entry) => [new URL(entry.url).pathname, entry.lastmod]));
assertMinimum(sitemapUrls, 15, "URL в sitemap");
assertUnique(sitemapUrls, "Sitemap URL");
assertUnique(
  sitemapEntries.map((entry) => new URL(entry.url).pathname),
  "Sitemap pathname",
);
const todayIso = new Date().toISOString().slice(0, 10);
const newestCoreDependency = [
  ...models.map((model) => model.checked_at),
  ...mounts.map((mount) => mount.checked_at),
  commercialProfilesManifest.updated_at,
].sort().at(-1);
if (corePagesUpdatedAt < newestCoreDependency) {
  throw new Error("Дата основных страниц старше зависимого каталога");
}
for (const { url: urlValue, lastmod } of sitemapEntries) {
  const url = new URL(urlValue);
  if (url.origin !== origin || !htmlByRoute.has(url.pathname)) {
    throw new Error(`Sitemap содержит внешний или несуществующий URL: ${urlValue}`);
  }
  const canonical = canonicalFromHtml(htmlByRoute.get(url.pathname));
  if (url.username || url.password || url.search || url.hash || url.href !== canonical) {
    throw new Error(`Sitemap URL не совпадает с canonical страницы: ${urlValue}`);
  }
  const parsedLastmod = new Date(`${lastmod}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(lastmod) ||
    Number.isNaN(parsedLastmod.valueOf()) ||
    parsedLastmod.toISOString().slice(0, 10) !== lastmod ||
    lastmod > todayIso
  ) {
    throw new Error(`Sitemap содержит неверный или будущий lastmod: ${urlValue} → ${lastmod}`);
  }
  if (/\bnoindex\b/i.test(metaContent(htmlByRoute.get(url.pathname), "robots"))) {
    throw new Error(`Sitemap содержит noindex URL: ${urlValue}`);
  }
}

for (const route of ["/", "/podbor/", "/modeli/", "/kronshteyny/"]) {
  if (sitemapLastmods.get(route) !== corePagesUpdatedAt) {
    throw new Error(`Основная страница имеет неточный sitemap lastmod: ${route}`);
  }
}
const sitemapPaths = new Set(sitemapUrls.map((value) => new URL(value).pathname));

for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const indexable = compatibilityEdges.some(
    (edge) => edge.tv_id === model.id && edge.fit_status === "verified-fit",
  );
  const robots = metaContent(htmlByRoute.get(route), "robots");
  if (indexable && (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(route))) {
    throw new Error(`Модель с подтверждённым совпадением закрыта от индекса: ${route}`);
  }
  if (!indexable && (!/\bnoindex\b/i.test(robots) || sitemapPaths.has(route))) {
    throw new Error(`Модель без подтверждённого совпадения должна быть noindex: ${route}`);
  }
  if (indexable) {
    const profile = commercialProfiles.find(
      (item) => item.entity_kind === "model" && item.entity_id === model.id,
    );
    const expectedLastmod = [
      model.checked_at,
      model.wall_mount_screws?.checked_at,
      profile ? commercialProfilesManifest.updated_at : undefined,
    ].filter(Boolean).sort().at(-1);
    if (sitemapLastmods.get(route) !== expectedLastmod) {
      throw new Error(`Модель имеет неточный sitemap lastmod: ${route}`);
    }
  }
}

for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const indexable = compatibilityEdges.some(
    (edge) => edge.mount_id === mount.id && edge.fit_status === "verified-fit",
  );
  const robots = metaContent(htmlByRoute.get(route), "robots");
  if (indexable && (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(route))) {
    throw new Error(`Кронштейн с подтверждённым совпадением закрыт от индекса: ${route}`);
  }
  if (!indexable && (!/\bnoindex\b/i.test(robots) || sitemapPaths.has(route))) {
    throw new Error(`Кронштейн без подтверждённого совпадения должен быть noindex: ${route}`);
  }
  if (indexable) {
    const profile = commercialProfiles.find(
      (item) => item.entity_kind === "mount" && item.entity_id === mount.id,
    );
    const expectedLastmod = profile
      ? [mount.checked_at, commercialProfilesManifest.updated_at].sort().at(-1)
      : mount.checked_at;
    if (sitemapLastmods.get(route) !== expectedLastmod) {
      throw new Error(`Кронштейн имеет неточный sitemap lastmod: ${route}`);
    }
  }
}

const indexableSeoPages = seoPages.filter((page) => page.indexable);
const noindexSeoPages = seoPages.filter((page) => !page.indexable);
assertMinimum(indexableSeoPages, 8, "Индексируемые SEO-материалы");
for (const page of indexableSeoPages) {
  const robots = metaContent(htmlByRoute.get(page.path), "robots");
  if (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(page.path)) {
    throw new Error(`Индексируемая SEO-страница отсутствует в sitemap или закрыта: ${page.path}`);
  }
  if (sitemapLastmods.get(page.path) !== corePagesUpdatedAt) {
    throw new Error(`SEO-страница имеет неточный sitemap lastmod: ${page.path}`);
  }
}
for (const page of trustPages) {
  if (sitemapLastmods.get(page.path) !== page.lastmod) {
    throw new Error(`Доверительная страница имеет неточный sitemap lastmod: ${page.path}`);
  }
}
for (const page of noindexSeoPages) {
  const robots = metaContent(htmlByRoute.get(page.path), "robots");
  if (!/\bnoindex\b/i.test(robots) || !/\bfollow\b/i.test(robots)) {
    throw new Error(`Тонкая SEO-страница должна иметь noindex,follow: ${page.path}`);
  }
  if (sitemapPaths.has(page.path)) {
    throw new Error(`Тонкая SEO-страница не должна входить в sitemap: ${page.path}`);
  }
}

const incoming = new Map(indexableSeoPages.map((page) => [page.path, new Set()]));
for (const [sourceRoute, html] of htmlByRoute) {
  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(
    (match) => match[1],
  );
  for (const href of hrefs) {
    const targetRoute = normalizeInternalHref(href, sourceRoute);
    if (targetRoute && !htmlByRoute.has(targetRoute)) {
      throw new Error(`Внутренняя ссылка ведёт на отсутствующую страницу: ${sourceRoute} → ${targetRoute}`);
    }
    if (!sitemapPaths.has(sourceRoute)) continue;
    if (targetRoute && targetRoute !== sourceRoute && incoming.has(targetRoute)) {
      incoming.get(targetRoute).add(sourceRoute);
    }
  }
}
for (const [route, sources] of incoming) {
  if (sources.size === 0) {
    throw new Error(`У индексируемой SEO-страницы нет входящей статической ссылки: ${route}`);
  }
}

for (const [route, html] of htmlByRoute) {
  const jsonLd = jsonLdFromHtml(html, route);
  const canonical = canonicalFromHtml(html);
  if (route === "/") {
    const website = jsonLd.find((item) => item["@type"] === "WebSite");
    if (!website || website.url !== canonical || website.inLanguage !== "ru-RU") {
      throw new Error("На главной нет корректного WebSite JSON-LD");
    }
    continue;
  }

  const breadcrumbs = jsonLd.find((item) => item["@type"] === "BreadcrumbList");
  const elements = breadcrumbs?.itemListElement;
  if (!Array.isArray(elements) || elements.length < 2) {
    throw new Error(`На внутренней странице нет корректного BreadcrumbList: ${route}`);
  }
  elements.forEach((element, index) => {
    if (
      element?.["@type"] !== "ListItem" ||
      element.position !== index + 1 ||
      !element.name ||
      !element.item
    ) {
      throw new Error(`Некорректный элемент BreadcrumbList: ${route}`);
    }
  });
  if (elements.at(-1).item !== canonical) {
    throw new Error(`Последний элемент BreadcrumbList не совпадает с canonical: ${route}`);
  }
}

const robotsTxt = await readFile(path.join(docs, "robots.txt"), "utf8");
if (!robotsTxt.includes("Sitemap: https://krepitv.ru/sitemap.xml")) {
  throw new Error("robots.txt не содержит канонический адрес sitemap");
}

console.log(
  `Проверено: ${pageHtmlFiles.length} HTML-страниц (минимум 25) и ${yandexVerificationFiles.length} файл подтверждения Яндекса, ${models.length} модели ТВ, ${mounts.length} кронштейна, ${compatibilityEdges.length} рёбер графа, ${seoPages.length} SEO-материалов; в sitemap ${sitemapUrls.length} индексируемых URL; полнота каталога: ${coverageSummary.catalog_status}, полный=${coverageSummary.full_catalog_ready}`,
);
