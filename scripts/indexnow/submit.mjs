#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ORIGIN = "https://krepitv.ru";
export const INDEXNOW_ENDPOINT = "https://yandex.com/indexnow";
export const INDEXNOW_KEY = "8abbd2655e1e1a01b1159790395c7b6e";
export const INDEXNOW_KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "../..");
const defaultManifest = path.join(root, "data/indexnow/changed-urls.txt");
const sitemapFile = path.join(root, "docs/sitemap.xml");

export function normalizeUrlList(values) {
  const urls = [];
  const seen = new Set();

  for (const rawValue of values) {
    const value = String(rawValue ?? "").trim();
    if (!value || value.startsWith("#")) continue;

    const url = new URL(value, `${SITE_ORIGIN}/`);
    if (url.origin !== SITE_ORIGIN || url.protocol !== "https:") {
      throw new Error(`IndexNow принимает только URL ${SITE_ORIGIN}: ${value}`);
    }
    if (url.search || url.hash || url.username || url.password) {
      throw new Error(`IndexNow URL не должен содержать параметры, hash или credentials: ${value}`);
    }
    const pathname = url.pathname === "/" ? "/" : `${url.pathname.replace(/\/+$/, "")}/`;
    const normalized = `${SITE_ORIGIN}${pathname}`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  }

  if (!urls.length) throw new Error("Нет URL для отправки в IndexNow.");
  if (urls.length > 10_000) throw new Error("IndexNow принимает не более 10 000 URL за запрос.");
  return urls;
}

export function buildPayload(urlList) {
  return {
    host: "krepitv.ru",
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: normalizeUrlList(urlList),
  };
}

export function expandManifestLines(lines, { models = [], mounts = [] } = {}) {
  return lines.flatMap((rawValue) => {
    const value = String(rawValue ?? "").trim();
    if (!value || value.startsWith("#")) return [];
    if (value === "@models") return models.map((model) => `/modeli/${model.id}/`);
    if (value === "@mounts") return mounts.map((mount) => `/kronshteyny/${mount.id}/`);
    if (value.startsWith("@")) throw new Error(`Неизвестная директива IndexNow: ${value}`);
    return [value];
  });
}

export function assertUrlsInSitemap(urlList, sitemap) {
  const listed = new Set(
    [...String(sitemap).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
  );
  for (const url of normalizeUrlList(urlList)) {
    if (!listed.has(url)) {
      throw new Error(`IndexNow URL отсутствует в production sitemap: ${url}`);
    }
  }
}

async function readManifest(file) {
  const [content, models, mounts] = await Promise.all([
    readFile(file, "utf8"),
    readFile(path.join(root, "data/tv_models.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/mounts.json"), "utf8").then(JSON.parse),
  ]);
  return expandManifestLines(content.split(/\r?\n/), { models, mounts });
}

async function verifyPublishedKey(fetchImpl) {
  const response = await fetchImpl(INDEXNOW_KEY_LOCATION, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Публичный IndexNow key-файл недоступен: HTTP ${response.status}`);
  }
  const value = (await response.text()).trim();
  if (value !== INDEXNOW_KEY) {
    throw new Error("Публичный IndexNow key-файл не совпадает с ключом клиента.");
  }
}

export async function submitIndexNow(urlList, {
  dryRun = false,
  fetchImpl = fetch,
} = {}) {
  const payload = buildPayload(urlList);
  if (dryRun) return { status: "dry-run", payload };

  await verifyPublishedKey(fetchImpl);
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow отклонил пакет: HTTP ${response.status}`);
  }
  return { status: "accepted", httpStatus: response.status, payload };
}

async function main(args) {
  const dryRun = args.includes("--dry-run");
  const manifestFlag = args.indexOf("--manifest");
  const manifest = manifestFlag === -1 ? defaultManifest : path.resolve(args[manifestFlag + 1] ?? "");
  const positional = args.filter((value, index) => (
    value !== "--dry-run" &&
    value !== "--manifest" &&
    index !== manifestFlag + 1
  ));
  const values = positional.length ? positional : await readManifest(manifest);
  const normalized = normalizeUrlList(values);
  assertUrlsInSitemap(normalized, await readFile(sitemapFile, "utf8"));
  const result = await submitIndexNow(normalized, { dryRun });
  const verb = result.status === "dry-run" ? "Подготовлено" : "Принято IndexNow";
  console.log(`${verb}: ${result.payload.urlList.length} URL${result.httpStatus ? `, HTTP ${result.httpStatus}` : ""}.`);
  console.log("Это уведомление об изменениях, а не подтверждение индексации.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main(process.argv.slice(2));
}
