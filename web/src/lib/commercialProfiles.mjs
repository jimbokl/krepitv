const ENTITY_PATH_PREFIX = Object.freeze({
  model: "/modeli/",
  mount: "/kronshteyny/",
});

const PROFILE_KEYS = Object.freeze([
  "answer",
  "description",
  "entity_id",
  "entity_kind",
  "faq",
  "heading",
  "kicker",
  "path",
  "title",
]);

const FAQ_KEYS = Object.freeze(["answer", "question"]);
const ENTITY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONEY_PATTERN = /(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|лей|ля)?|р\.)|(?:₽|руб(?:\.|лей|ля)?|р\.)\s*\d)/iu;

function fail(location, message) {
  throw new Error(`Некорректный коммерческий профиль (${location}): ${message}`);
}

function assertExactKeys(value, keys, location) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(location, "неожиданный набор полей");
  }
}

function cleanText(value, location, maximumLength) {
  if (typeof value !== "string") fail(location, "ожидался текст");
  const cleaned = value.trim();
  if (!cleaned) fail(location, "текст не может быть пустым");
  if (cleaned.length > maximumLength) fail(location, `текст длиннее ${maximumLength} символов`);
  if (MONEY_PATTERN.test(cleaned)) fail(location, "денежные значения на странице запрещены");
  return cleaned;
}

function expectedPath(entityKind, entityId) {
  return `${ENTITY_PATH_PREFIX[entityKind]}${entityId}/`;
}

function parseFaq(items, location) {
  if (!Array.isArray(items) || items.length !== 3) {
    fail(location, "нужно ровно три вопроса и ответа");
  }

  const questions = new Set();
  return items.map((item, index) => {
    const itemLocation = `${location}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(itemLocation, "ожидался объект");
    }
    assertExactKeys(item, FAQ_KEYS, itemLocation);
    const question = cleanText(item.question, `${itemLocation}.question`, 180);
    const answer = cleanText(item.answer, `${itemLocation}.answer`, 600);
    const questionKey = question.toLocaleLowerCase("ru-RU");
    if (questions.has(questionKey)) fail(itemLocation, "вопросы не должны повторяться");
    questions.add(questionKey);
    return { question, answer };
  });
}

function parseProfile(profile, index) {
  const location = `profiles[${index}]`;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    fail(location, "ожидался объект");
  }
  assertExactKeys(profile, PROFILE_KEYS, location);

  const entityKind = profile.entity_kind;
  if (!Object.hasOwn(ENTITY_PATH_PREFIX, entityKind)) {
    fail(`${location}.entity_kind`, "допустимы только model и mount");
  }
  const entityId = cleanText(profile.entity_id, `${location}.entity_id`, 120);
  if (!ENTITY_ID_PATTERN.test(entityId)) {
    fail(`${location}.entity_id`, "идентификатор должен быть безопасным slug");
  }
  const path = cleanText(profile.path, `${location}.path`, 180);
  if (path !== expectedPath(entityKind, entityId)) {
    fail(`${location}.path`, "путь не соответствует типу и идентификатору сущности");
  }

  return {
    entity_kind: entityKind,
    entity_id: entityId,
    path,
    title: cleanText(profile.title, `${location}.title`, 65),
    description: cleanText(profile.description, `${location}.description`, 160),
    kicker: cleanText(profile.kicker, `${location}.kicker`, 80),
    heading: cleanText(profile.heading, `${location}.heading`, 160),
    answer: cleanText(profile.answer, `${location}.answer`, 1_200),
    faq: parseFaq(profile.faq, `${location}.faq`),
  };
}

export function parseCommercialProfiles(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail("root", "ожидался объект");
  }
  assertExactKeys(payload, ["profiles", "schema_version", "updated_at"], "root");
  if (payload.schema_version !== 1) fail("schema_version", "поддерживается только версия 1");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(payload.updated_at ?? "")) {
    fail("updated_at", "ожидалась дата YYYY-MM-DD");
  }
  if (!Array.isArray(payload.profiles)) fail("profiles", "ожидался массив");

  const profiles = payload.profiles.map(parseProfile);
  const identities = new Set();
  const paths = new Set();
  for (const profile of profiles) {
    const identity = `${profile.entity_kind}:${profile.entity_id}`;
    if (identities.has(identity)) fail(identity, "профиль сущности повторяется");
    if (paths.has(profile.path)) fail(profile.path, "путь профиля повторяется");
    identities.add(identity);
    paths.add(profile.path);
  }
  return profiles;
}

export function selectCommercialProfile(profiles, identity) {
  if (!Array.isArray(profiles)) return null;
  const entityKind = identity?.entityKind;
  const entityId = identity?.entityId;
  if (!Object.hasOwn(ENTITY_PATH_PREFIX, entityKind) || !ENTITY_ID_PATTERN.test(entityId ?? "")) {
    return null;
  }
  const pagePath = identity?.pagePath ?? expectedPath(entityKind, entityId);
  if (pagePath !== expectedPath(entityKind, entityId)) return null;

  return profiles.find((profile) =>
    profile?.entity_kind === entityKind &&
    profile?.entity_id === entityId &&
    profile?.path === pagePath
  ) ?? null;
}
