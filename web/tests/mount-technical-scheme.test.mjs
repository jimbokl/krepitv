import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("React-схема честно показывает три типа механизма и не изображает фото товара", async () => {
  const source = await readFile(
    new URL("../src/components/MountTechnicalScheme.jsx", import.meta.url),
    "utf8",
  );

  for (const token of [
    'data-mechanism-part="fixed-rails"',
    'data-mechanism-part="tilt-joint"',
    'data-mechanism-part="articulated-arm"',
    "Техническая схема, не фотография",
    'role="img"',
    'viewBox="0 0 640 340"',
    "block h-auto w-full max-w-full",
    "mount.min_diagonal_in",
    "mount.max_diagonal_in",
    "mount.max_load_kg",
    "mount.vesa.length",
    "mount.wall_distance_min_mm",
    "mount.wall_distance_max_mm",
    "Габариты деталей, длина рычагов и углы условные",
  ]) {
    assert.equal(source.includes(token), true, `Нет обязательного контракта: ${token}`);
  }

  assert.doesNotMatch(source, /<img/u);
  assert.doesNotMatch(source, /market\.yandex/u);
  assert.doesNotMatch(source, /href=/u);
});

test("страница кронштейна ставит техническую схему перед предложением", async () => {
  const source = await readFile(
    new URL("../src/pages/MountPage.jsx", import.meta.url),
    "utf8",
  );

  assert.equal((source.match(/<MountTechnicalScheme/gu) ?? []).length, 1);
  assert.ok(source.indexOf("<MountTechnicalScheme") < source.indexOf("{affiliateOffer ?"));
});
