#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
const [models, mounts, profilesFile, publishedGraph] = await Promise.all([
  readJson("data/tv_models.json"),
  readJson("data/mounts.json"),
  readJson("data/commercial_profiles.json"),
  readJson("docs/data/compatibility-graph.json"),
]);

const modelById = new Map(models.map((model) => [model.id, model]));
const mountById = new Map(mounts.map((mount) => [mount.id, mount]));
const fits = (model, mount) => (
  mount.vesa.includes(`${model.vesa_width_mm}x${model.vesa_height_mm}`)
  && mount.max_load_kg + Number.EPSILON >= model.weight_kg * 1.25
  && model.diagonal_inches >= mount.min_diagonal_in
  && model.diagonal_inches <= mount.max_diagonal_in
);
const countCurrent = (profile) => {
  if (profile.entity_kind === "model") {
    const model = modelById.get(profile.entity_id);
    if (!model) throw new Error(`Нет модели ${profile.entity_id}`);
    return mounts.filter((mount) => fits(model, mount)).length;
  }
  if (profile.entity_kind === "mount") {
    const mount = mountById.get(profile.entity_id);
    if (!mount) throw new Error(`Нет кронштейна ${profile.entity_id}`);
    return models.filter((model) => fits(model, mount)).length;
  }
  throw new Error(`Неизвестный тип профиля ${profile.entity_kind}`);
};
const countPublished = (profile) => publishedGraph.filter((edge) => (
  edge.fit_status === "verified-fit"
  && (profile.entity_kind === "model"
    ? edge.tv_id === profile.entity_id
    : edge.mount_id === profile.entity_id)
)).length;
const containsToken = (text, number) => new RegExp(`(^|\\D)${number}(?!\\d)`, "u").test(text);
const replaceToken = (text, from, to, label) => {
  if (from === to || containsToken(text, to)) return text;
  const pattern = new RegExp(`(^|\\D)${from}(?!\\d)`, "gu");
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${label}: ожидалось одно вхождение старого счётчика ${from}, найдено ${matches.length}`);
  }
  return text.replace(pattern, (match, prefix) => `${prefix}${to}`);
};

let changed = 0;
const profiles = profilesFile.profiles.map((profile) => {
  const current = countCurrent(profile);
  const published = countPublished(profile);
  const label = `${profile.entity_kind}:${profile.entity_id}`;
  const description = replaceToken(profile.description, published, current, `${label}.description`);
  const answer = replaceToken(profile.answer, published, current, `${label}.answer`);
  if (!containsToken(description, current) || !containsToken(answer, current)) {
    throw new Error(`${label}: новый счётчик ${current} не попал в SEO-профиль`);
  }
  if (description !== profile.description || answer !== profile.answer) changed += 1;
  return { ...profile, description, answer };
});

await writeFile(
  path.join(ROOT, "data/commercial_profiles.json"),
  `${JSON.stringify({ ...profilesFile, updated_at: "2026-08-05", profiles }, null, 2)}\n`,
);
process.stdout.write(`Синхронизировано SEO-профилей: ${changed}.\n`);
