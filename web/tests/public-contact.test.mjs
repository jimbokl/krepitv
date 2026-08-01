import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const trustPages = JSON.parse(
  fs.readFileSync(path.join(root, "data/trust_pages.json"), "utf8"),
);

function issueField(source, id) {
  const marker = `\n    id: ${id}\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Не найдено поле ${id}`);
  const next = source.indexOf("\n  - type:", start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test("контакты ведут в публичный канал и заранее запрещают персональные данные", () => {
  const contacts = trustPages.find((page) => page.id === "contacts");
  const privacy = trustPages.find((page) => page.id === "privacy");
  const issueHref = "https://github.com/jimbokl/krepitv/issues/new/choose";

  assert.ok(contacts);
  assert.ok(privacy);
  assert.equal(
    contacts.related_links.filter((link) => link.href === issueHref).length,
    1,
  );
  assert.match(JSON.stringify(contacts.sections), /персональные данные/);
  assert.match(JSON.stringify(contacts.sections), /GitHub может потребовать вход/);
  assert.match(JSON.stringify(contacts.sections), /повторный спам блокируется/);
  assert.match(
    JSON.stringify(privacy.sections),
    /владелец KREPI TV получает доступ/,
  );
  assert.match(JSON.stringify(privacy.sections), /имя или псевдоним профиля/);
});

for (const [file, sourceId] of [
  ["data-error.yml", "source"],
  ["model-request.yml", "official_source"],
]) {
  test(`${file} предупреждает о публичности и требует отказа от персональных данных`, () => {
    const source = fs.readFileSync(
      path.join(root, ".github/ISSUE_TEMPLATE", file),
      "utf8",
    );
    assert.match(source, /видно публично|опубликован открыто/);
    assert.match(source, /персональные данные/);
    assert.match(source, /партнёрские, реферальные и рекламные ссылки удаляются/);
    assert.match(source, /Я не добавляю персональные данные/);
    assert.match(issueField(source, sourceId), /validations:\n      required: true/);
    assert.match(
      issueField(source, "public_notice"),
      /Я не добавляю персональные данные или серийный номер устройства\.\n          required: true/,
    );
  });
}
