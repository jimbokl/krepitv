import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  assertUrlsInSitemap,
  buildPayload,
  expandManifestLines,
  normalizeUrlList,
  submitIndexNow,
} from "../../scripts/indexnow/submit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("publishes the exact verification key in source and release artifacts", async () => {
  const [sourceKey, releaseKey] = await Promise.all([
    readFile(path.join(root, "web/public", `${INDEXNOW_KEY}.txt`), "utf8"),
    readFile(path.join(root, "docs", `${INDEXNOW_KEY}.txt`), "utf8"),
  ]);
  assert.equal(sourceKey.trim(), INDEXNOW_KEY);
  assert.equal(releaseKey.trim(), INDEXNOW_KEY);
});

test("normalizes local paths and removes duplicates", () => {
  assert.deepEqual(normalizeUrlList(["/", "/vesa/200x200", "/vesa/200x200/"]), [
    "https://krepitv.ru/",
    "https://krepitv.ru/vesa/200x200/",
  ]);
});

test("rejects query strings and off-site URLs", () => {
  assert.throws(() => normalizeUrlList(["/modeli/?page=2"]), /не должен содержать/);
  assert.throws(() => normalizeUrlList(["https://example.com/page/"]), /только URL/);
});

test("builds a Yandex-compatible batch without secrets", () => {
  assert.deepEqual(buildPayload(["/kronshteyn-dlya-televizora-lg/"]), {
    host: "krepitv.ru",
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: ["https://krepitv.ru/kronshteyn-dlya-televizora-lg/"],
  });
});

test("expands audited catalog groups and rejects unknown directives", () => {
  assert.deepEqual(
    expandManifestLines(["# wave", "@models", "@mounts", "/"], {
      models: [{ id: "lg-test" }],
      mounts: [{ id: "mount-test" }],
    }),
    ["/modeli/lg-test/", "/kronshteyny/mount-test/", "/"],
  );
  assert.throws(() => expandManifestLines(["@everything"]), /Неизвестная директива/);
});

test("refuses to notify a URL missing from the sitemap", () => {
  const sitemap = "<urlset><url><loc>https://krepitv.ru/</loc></url></urlset>";
  assert.doesNotThrow(() => assertUrlsInSitemap(["/"], sitemap));
  assert.throws(
    () => assertUrlsInSitemap(["/noindex/"] , sitemap),
    /отсутствует в production sitemap/,
  );
});

test("verifies the public key before posting and accepts HTTP 202", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url === INDEXNOW_KEY_LOCATION) {
      return new Response(`${INDEXNOW_KEY}\n`, { status: 200 });
    }
    assert.equal(url, INDEXNOW_ENDPOINT);
    return new Response("", { status: 202 });
  };

  const result = await submitIndexNow(["/vesa/300x200/"], { fetchImpl });
  assert.equal(result.status, "accepted");
  assert.equal(result.httpStatus, 202);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.method, "POST");
});

test("fails closed when the published key does not match", async () => {
  const fetchImpl = async () => new Response("wrong-key", { status: 200 });
  await assert.rejects(
    submitIndexNow(["/vesa/300x200/"], { fetchImpl }),
    /не совпадает/,
  );
});
