import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { chmod, mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildServiceAccountJwt,
  fetchGoogleSearchConsoleReport,
  googleSearchConsoleConstants,
  parseSitemapUrls,
  submitGoogleSitemap,
} from "../../scripts/analytics/google-search-console.mjs";
import { writePrivateReport } from "../../scripts/analytics/report-google-search-console.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const credentials = {
  type: "service_account",
  client_email: "fixture@example.invalid",
  project_id: "private-project-id",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  token_uri: googleSearchConsoleConstants.tokenEndpoint,
};
const token = "access-token-" + "x".repeat(32);
const sitemap = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://krepitv.ru/</loc></url><url><loc>https://krepitv.ru/vesa/</loc></url></urlset>`;

function response(payload, status = 200, raw = false, headerValues = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) { return headerValues[String(name).toLowerCase()] ?? null; },
    },
    async text() { return raw ? String(payload) : JSON.stringify(payload); },
  };
}

function createFixtureFetch(override = async () => undefined) {
  const counts = new Map();
  const fetchImpl = async (urlValue, options = {}) => {
    const url = String(urlValue);
    const count = (counts.get(url) ?? 0) + 1;
    counts.set(url, count);
    const overridden = await override({ count, options, url });
    if (overridden !== undefined) return overridden;
    if (url === googleSearchConsoleConstants.tokenEndpoint) {
      return response({ access_token: token, expires_in: 3600, token_type: "Bearer" });
    }
    if (url.endsWith("/webmasters/v3/sites")) {
      return response({ siteEntry: [{ siteUrl: "https://krepitv.ru/", permissionLevel: "siteOwner" }] });
    }
    if (url === "https://krepitv.ru/sitemap.xml") return response(sitemap, 200, true);
    if (url.endsWith("/sitemaps")) {
      return response({ sitemap: [{
        path: "https://krepitv.ru/sitemap.xml",
        isPending: false,
        errors: "0",
        warnings: "0",
        contents: [{ type: "web", submitted: "2" }],
      }] });
    }
    if (url.includes("searchAnalytics/query")) return response({ rows: [] });
    if (url === googleSearchConsoleConstants.inspectionEndpoint) {
      const body = JSON.parse(options.body);
      return response({ inspectionResult: { indexStatusResult: {
        verdict: "PASS",
        coverageState: "Indexed",
        robotsTxtState: "ALLOWED",
        indexingState: "INDEXING_ALLOWED",
        pageFetchState: "SUCCESSFUL",
        userCanonical: body.inspectionUrl,
        googleCanonical: body.inspectionUrl,
      } } });
    }
    throw new Error(`unexpected mock URL: ${url}`);
  };
  return { counts, fetchImpl };
}

test("JWT uses the fixed read-only scope and has a verifiable RS256 signature", () => {
  const jwt = buildServiceAccountJwt(credentials, new Date("2026-07-31T10:00:00Z"));
  const [header, payload, signature] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
  const claims = JSON.parse(Buffer.from(payload, "base64url"));
  assert.equal(claims.scope, googleSearchConsoleConstants.readonlyScope);
  assert.equal(claims.aud, googleSearchConsoleConstants.tokenEndpoint);
  assert.equal(claims.exp - claims.iat, 3600);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${header}.${payload}`);
  verifier.end();
  assert.equal(verifier.verify(publicKey, Buffer.from(signature, "base64url")), true);
  assert.equal(jwt.includes(credentials.private_key), false);
});

test("write JWT is explicit and accepts only the fixed sitemap-management scope", () => {
  const jwt = buildServiceAccountJwt(
    credentials,
    new Date("2026-08-05T00:00:00Z"),
    googleSearchConsoleConstants.writeScope,
  );
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url"));
  assert.equal(claims.scope, googleSearchConsoleConstants.writeScope);
  assert.throws(
    () => buildServiceAccountJwt(credentials, new Date(), "https://example.invalid/scope"),
    /unsupported Google Search Console OAuth scope/,
  );
});

test("sitemap submit is locked to the verified production property and verifies the result", async () => {
  const submitUrl = `${googleSearchConsoleConstants.searchApi}/sites/${encodeURIComponent("https://krepitv.ru/")}/sitemaps/${encodeURIComponent("https://krepitv.ru/sitemap.xml")}`;
  const calls = [];
  const fetchImpl = async (urlValue, options = {}) => {
    const url = String(urlValue);
    calls.push({ method: options.method ?? "GET", url });
    if (url === "https://krepitv.ru/sitemap.xml") return response(sitemap, 200, true);
    if (url === googleSearchConsoleConstants.tokenEndpoint) {
      const assertion = new URLSearchParams(options.body).get("assertion");
      const claims = JSON.parse(Buffer.from(assertion.split(".")[1], "base64url"));
      assert.equal(claims.scope, googleSearchConsoleConstants.writeScope);
      return response({ access_token: token, expires_in: 3600, token_type: "Bearer" });
    }
    if (url.endsWith("/webmasters/v3/sites")) {
      return response({ siteEntry: [{ siteUrl: "https://krepitv.ru/", permissionLevel: "siteOwner" }] });
    }
    if (url === submitUrl && options.method === "PUT") return response("", 204, true);
    if (url.endsWith("/sitemaps")) {
      return response({ sitemap: [{
        path: "https://krepitv.ru/sitemap.xml",
        isPending: false,
        errors: "0",
        warnings: "0",
        lastSubmitted: "2026-08-05T00:00:00Z",
        contents: [{ type: "web", submitted: "2" }],
      }] });
    }
    throw new Error(`unexpected mock URL: ${url}`);
  };
  const report = await submitGoogleSitemap({
    credentials,
    fetchImpl,
    localSitemapXml: sitemap,
    now: new Date("2026-08-05T00:00:00Z"),
    sleepImpl: async () => {},
  });
  assert.equal(report.accepted_http_status, 204);
  assert.equal(report.production_url_count, 2);
  assert.equal(report.console.submitted_web_urls, 2);
  assert.deepEqual(calls.filter((call) => call.method === "PUT"), [{ method: "PUT", url: submitUrl }]);
  assert.equal(JSON.stringify(report).includes(token), false);
  await assert.rejects(
    submitGoogleSitemap({
      credentials,
      fetchImpl,
      localSitemapXml: sitemap,
      siteUrl: "https://other.invalid/",
    }),
    /locked to the production KREPI TV property/,
  );
});

test("sitemap parser rejects duplicates, queries and another origin", () => {
  assert.deepEqual(parseSitemapUrls(sitemap, "https://krepitv.ru/"), [
    "https://krepitv.ru/",
    "https://krepitv.ru/vesa/",
  ]);
  assert.throws(() => parseSitemapUrls(sitemap.replace("/vesa/", "/vesa/?x=1"), "https://krepitv.ru/"), /off-origin|canonical/);
  assert.throws(() => parseSitemapUrls(sitemap.replace("https://krepitv.ru/vesa/", "https://other.invalid/"), "https://krepitv.ru/"), /off-origin/);
  assert.throws(() => parseSitemapUrls(sitemap.replace("/vesa/", "/"), "https://krepitv.ru/"), /duplicate/);
});

test("page-only diagnostics may observe one impression but never accept zero", async () => {
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      localSitemapXml: sitemap,
      minPageImpressions: 0,
    }),
    /minPageImpressions must be at least 1/,
  );
});

test("report keeps authoritative zero, filters query rows and strips credentials", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url) === googleSearchConsoleConstants.tokenEndpoint) {
      assert.match(String(options.body), /grant_type=/);
      return response({ access_token: token, expires_in: 3600, token_type: "Bearer" });
    }
    if (String(url).endsWith("/webmasters/v3/sites")) {
      return response({ siteEntry: [{ siteUrl: "https://krepitv.ru/", permissionLevel: "siteOwner" }] });
    }
    if (String(url) === "https://krepitv.ru/sitemap.xml") return response(sitemap, 200, true);
    if (String(url).endsWith("/sitemaps")) {
      return response({ sitemap: [{
        path: "https://krepitv.ru/sitemap.xml",
        isPending: false,
        errors: "0",
        warnings: "0",
        lastDownloaded: "2026-07-31T10:00:00Z",
        contents: [{ type: "web", submitted: "2", indexed: "999" }],
      }] });
    }
    if (String(url).includes("searchAnalytics/query")) {
      const body = JSON.parse(options.body);
      if (!body.dimensions) return response({ rows: [] });
      if (body.dimensions.length === 1 && body.dimensions[0] === "page") {
        return response({ rows: [
          { keys: ["https://krepitv.ru/vesa/"], clicks: 1, impressions: 10, ctr: 0.1, position: 8 },
          { keys: ["https://krepitv.ru/"], clicks: 0, impressions: 9, ctr: 0, position: 20 },
          { keys: ["https://other.invalid/page/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
        ] });
      }
      return response({ rows: [
        { keys: ["кронштейн для телевизора", "https://krepitv.ru/vesa/"], clicks: 1, impressions: 10, ctr: 0.1, position: 8 },
        { keys: ["редкий запрос", "https://krepitv.ru/"], clicks: 0, impressions: 9, ctr: 0, position: 20 },
        { keys: ["user@example.com", "https://krepitv.ru/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
        { keys: ["проверить 192.168.1.10", "https://krepitv.ru/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
        { keys: ["паспорт 123456", "https://krepitv.ru/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
        { keys: ["адрес улица лесная", "https://krepitv.ru/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
        { keys: ["@ivan помогите", "https://krepitv.ru/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
        { keys: ["ул Ленина 12", "https://krepitv.ru/"], clicks: 0, impressions: 12, ctr: 0, position: 20 },
      ] });
    }
    if (String(url) === googleSearchConsoleConstants.inspectionEndpoint) {
      const body = JSON.parse(options.body);
      const isHome = body.inspectionUrl === "https://krepitv.ru/";
      return response({ inspectionResult: { indexStatusResult: {
        verdict: isHome ? "PASS" : "NEUTRAL",
        coverageState: isHome ? "Indexed" : "Discovered",
        robotsTxtState: "ALLOWED",
        indexingState: "INDEXING_ALLOWED",
        pageFetchState: isHome ? "SUCCESSFUL" : "UNKNOWN",
        lastCrawlTime: isHome ? "2026-07-31T09:00:00Z" : undefined,
        googleCanonical: isHome ? body.inspectionUrl : "https://external.invalid/private?q=1",
        userCanonical: body.inspectionUrl,
        referringUrls: ["https://private.invalid/path"],
      } } });
    }
    throw new Error(`unexpected mock URL: ${url}`);
  };
  const report = await fetchGoogleSearchConsoleReport({
    credentials,
    date1: "2026-07-01",
    date2: "2026-07-29",
    fetchImpl,
    localSitemapXml: sitemap,
    minPageImpressions: 1,
    now: new Date("2026-07-31T10:00:00Z"),
    sleepImpl: async () => {},
  });
  assert.deepEqual(report.search_analytics.totals, { clicks: 0, impressions: 0, ctr: 0, position: 0 });
  assert.equal(report.search_analytics.query_page_rows.rows.length, 1);
  assert.equal(report.search_analytics.query_page_rows.rows[0].query, "кронштейн для телевизора");
  assert.deepEqual(report.search_analytics.query_page_rows.suppressed, {
    below_threshold: 1,
    unsafe_query: 6,
    invalid_page: 0,
  });
  assert.deepEqual(report.search_analytics.page_rows.rows, [
    {
      path: "/vesa/",
      clicks: 1,
      impressions: 10,
      ctr: 0.1,
      position: 8,
    },
    {
      path: "/",
      clicks: 0,
      impressions: 9,
      ctr: 0,
      position: 20,
    },
  ]);
  assert.deepEqual(report.search_analytics.page_rows.suppressed, {
    below_threshold: 0,
    invalid_page: 1,
  });
  assert.equal(report.sitemap.console.submitted_web_urls, 2);
  assert.equal("indexed" in report.sitemap.console, false);
  assert.equal(report.url_inspection.indexed_pass_count, 1);
  assert.equal(report.url_inspection.rows[1].google_canonical.relation, "external");
  const serialized = JSON.stringify(report);
  for (const forbidden of [token, credentials.client_email, credentials.project_id, credentials.private_key, "referringUrls", "private.invalid"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(calls.filter((call) => call.url === googleSearchConsoleConstants.inspectionEndpoint).length, 2);
  assert.equal(calls.filter((call) => call.options.headers?.Authorization === `Bearer ${token}`).length >= 1, true);
});

test("property failure and API errors never echo OAuth or remote messages", async () => {
  const fetchImpl = async (url) => {
    if (String(url) === googleSearchConsoleConstants.tokenEndpoint) {
      return response({ access_token: token });
    }
    return response({ error: { status: "PERMISSION_DENIED", message: `${token} private remote message` } }, 403);
  };
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl,
      localSitemapXml: sitemap,
    }),
    (error) => !String(error).includes(token) && !String(error).includes("private remote message"),
  );
});

test("successful HTML or empty Google responses fail instead of becoming zero", async () => {
  for (const body of ["<html>temporary proxy page</html>", ""]) {
    const oauthFixture = createFixtureFetch(async ({ url }) => (
      url === googleSearchConsoleConstants.tokenEndpoint ? response(body, 200, true) : undefined
    ));
    await assert.rejects(
      fetchGoogleSearchConsoleReport({
        credentials,
        date1: "2026-07-01",
        date2: "2026-07-29",
        fetchImpl: oauthFixture.fetchImpl,
        localSitemapXml: sitemap,
        sleepImpl: async () => {},
      }),
      /OAuth returned invalid JSON/,
    );

    const apiFixture = createFixtureFetch(async ({ url }) => (
      url.endsWith("/webmasters/v3/sites") ? response(body, 200, true) : undefined
    ));
    await assert.rejects(
      fetchGoogleSearchConsoleReport({
        credentials,
        date1: "2026-07-01",
        date2: "2026-07-29",
        fetchImpl: apiFixture.fetchImpl,
        localSitemapXml: sitemap,
        sleepImpl: async () => {},
      }),
      /API returned invalid JSON/,
    );
  }
});

test("invalid URL Inspection payloads remain unknown or partial, never authoritative zero", async () => {
  const unknownFixture = createFixtureFetch(async ({ url }) => (
    url === googleSearchConsoleConstants.inspectionEndpoint ? response({}) : undefined
  ));
  const unknown = await fetchGoogleSearchConsoleReport({
    credentials,
    date1: "2026-07-01",
    date2: "2026-07-29",
    fetchImpl: unknownFixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  assert.equal(unknown.url_inspection.state, "unknown");
  assert.equal(unknown.url_inspection.indexed_pass_count, null);
  assert.equal(unknown.url_inspection.observed_indexed_pass_count, null);
  assert.deepEqual(unknown.url_inspection.failure_counts, { INVALID_RESPONSE: 2 });

  const partialFixture = createFixtureFetch(async ({ options, url }) => {
    if (url !== googleSearchConsoleConstants.inspectionEndpoint) return undefined;
    const body = JSON.parse(options.body);
    return body.inspectionUrl.endsWith("/vesa/") ? response({}) : undefined;
  });
  const partial = await fetchGoogleSearchConsoleReport({
    credentials,
    date1: "2026-07-01",
    date2: "2026-07-29",
    fetchImpl: partialFixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  assert.equal(partial.url_inspection.state, "partial");
  assert.equal(partial.url_inspection.indexed_pass_count, null);
  assert.equal(partial.url_inspection.observed_indexed_pass_count, 1);
  assert.deepEqual(partial.url_inspection.failure_counts, { INVALID_RESPONSE: 1 });
});

test("query and page opportunities can be refreshed without claiming URL Inspection", async () => {
  const fixture = createFixtureFetch();
  const report = await fetchGoogleSearchConsoleReport({
    credentials,
    date1: "2026-07-01",
    date2: "2026-07-29",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    skipUrlInspection: true,
    sleepImpl: async () => {},
  });
  assert.equal(report.url_inspection.state, "skipped");
  assert.equal(report.url_inspection.sitemap_url_count, 2);
  assert.equal(report.url_inspection.indexed_pass_count, null);
  assert.equal(report.url_inspection.observed_indexed_pass_count, null);
  assert.equal(fixture.counts.get(googleSearchConsoleConstants.inspectionEndpoint), undefined);
  assert.equal(report.search_analytics.page_rows.rows.length, 0);
});

test("common bounded retries recover network, 429 and 503 failures", async () => {
  const fixture = createFixtureFetch(async ({ count, url }) => {
    if (url === googleSearchConsoleConstants.tokenEndpoint && count === 1) {
      throw new Error("temporary network failure with private detail");
    }
    if (url === googleSearchConsoleConstants.tokenEndpoint && count === 2) {
      return response({ error: { message: "private rate message" } }, 429, false, { "retry-after": "0" });
    }
    if (url.endsWith("/webmasters/v3/sites") && count === 1) {
      return response({ error: { message: "private service message" } }, 503);
    }
    return undefined;
  });
  const sleeps = [];
  const report = await fetchGoogleSearchConsoleReport({
    credentials,
    date1: "2026-07-01",
    date2: "2026-07-29",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async (milliseconds) => { sleeps.push(milliseconds); },
  });
  assert.equal(report.search_analytics.state, "available");
  assert.equal(fixture.counts.get(googleSearchConsoleConstants.tokenEndpoint), 3);
  assert.equal(fixture.counts.get(`${googleSearchConsoleConstants.searchApi}/sites`), 2);
  assert.deepEqual(sleeps, [500, 0, 500]);
});

test("bounded retries stop after three attempts without leaking remote detail", async () => {
  const fixture = createFixtureFetch(async ({ url }) => (
    url === googleSearchConsoleConstants.tokenEndpoint
      ? response({ error: { status: "UNAVAILABLE", message: `${token} private detail` } }, 503)
      : undefined
  ));
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    (error) => String(error).includes("HTTP 503")
      && !String(error).includes(token)
      && !String(error).includes("private detail"),
  );
  assert.equal(fixture.counts.get(googleSearchConsoleConstants.tokenEndpoint), 3);
});

test("the request timeout also bounds a response body that never finishes", async () => {
  const fixture = createFixtureFetch(async ({ options, url }) => {
    if (url !== googleSearchConsoleConstants.tokenEndpoint) return undefined;
    return {
      ok: true,
      status: 200,
      headers: { get() { return null; } },
      text() {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(new Error("private body timeout")), { once: true });
        });
      },
    };
  });
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
      requestTimeoutMs: 5,
      sleepImpl: async () => {},
    }),
    (error) => String(error).includes("bounded retries") && !String(error).includes("private body timeout"),
  );
  assert.equal(fixture.counts.get(googleSearchConsoleConstants.tokenEndpoint), 3);
});

test("malformed query and sitemap schemas fail instead of becoming empty data", async () => {
  for (const invalidRow of [null, false, 0, {
    clicks: false,
    impressions: false,
    ctr: false,
    position: false,
  }]) {
    const totalsFixture = createFixtureFetch(async ({ options, url }) => {
      if (!url.includes("searchAnalytics/query")) return undefined;
      const body = JSON.parse(options.body);
      return body.dimensions ? undefined : response({ rows: [invalidRow] });
    });
    await assert.rejects(
      fetchGoogleSearchConsoleReport({
        credentials,
        date1: "2026-07-01",
        date2: "2026-07-29",
        fetchImpl: totalsFixture.fetchImpl,
        localSitemapXml: sitemap,
        sleepImpl: async () => {},
      }),
      /totals response has invalid/,
    );
  }

  const queryFixture = createFixtureFetch(async ({ options, url }) => {
    if (!url.includes("searchAnalytics/query")) return undefined;
    const body = JSON.parse(options.body);
    return body.dimensions?.length === 2 ? response({ rows: "broken" }) : undefined;
  });
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: queryFixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    /query-page response has invalid rows/,
  );

  const queryMetricFixture = createFixtureFetch(async ({ options, url }) => {
    if (!url.includes("searchAnalytics/query")) return undefined;
    const body = JSON.parse(options.body);
    return body.dimensions?.length === 2 ? response({ rows: [{
      keys: ["кронштейн", "https://krepitv.ru/"],
      clicks: false,
      impressions: 10,
      ctr: 0,
      position: 1,
    }] }) : undefined;
  });
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: queryMetricFixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    /query-page response has invalid metrics/,
  );

  const pageFixture = createFixtureFetch(async ({ options, url }) => {
    if (!url.includes("searchAnalytics/query")) return undefined;
    const body = JSON.parse(options.body);
    return body.dimensions?.length === 1 && body.dimensions[0] === "page"
      ? response({ rows: "broken" })
      : undefined;
  });
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: pageFixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    /page response has invalid rows/,
  );

  const sitemapFixture = createFixtureFetch(async ({ url }) => (
    url.endsWith("/sitemaps") ? response({ sitemap: "broken" }) : undefined
  ));
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: sitemapFixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    /sitemap response has invalid entries/,
  );

  const sitemapCounterFixture = createFixtureFetch(async ({ url }) => (
    url.endsWith("/sitemaps") ? response({ sitemap: [{
      path: "https://krepitv.ru/sitemap.xml",
      errors: false,
      warnings: "0",
      contents: [{ type: "web", submitted: [] }],
    }] }) : undefined
  ));
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: sitemapCounterFixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    /sitemap response has invalid entry schema/,
  );
});

test("the reporter requires an HTTPS URL-prefix property", async () => {
  const fixture = createFixtureFetch();
  await assert.rejects(
    fetchGoogleSearchConsoleReport({
      credentials,
      date1: "2026-07-01",
      date2: "2026-07-29",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
      siteUrl: "sc-domain:krepitv.ru",
    }),
    /HTTPS URL-prefix origin/,
  );
  assert.equal(fixture.counts.size, 0);
});

test("private report writer rejects a symlinked output parent", async () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const privateRoot = path.join(projectRoot, ".private");
  await mkdir(privateRoot, { recursive: true, mode: 0o700 });
  await chmod(privateRoot, 0o700);
  const external = await mkdtemp(path.join(tmpdir(), "krepitv-gsc-report-"));
  const name = `symlink-test-${process.pid}-${Date.now()}`;
  const link = path.join(privateRoot, name);
  try {
    await symlink(external, link, "dir");
    await assert.rejects(
      writePrivateReport(`.private/${name}/report.json`, { safe: true }),
      /unsafe directory/,
    );
  } finally {
    await rm(link, { force: true });
    await rm(external, { force: true, recursive: true });
  }
});
