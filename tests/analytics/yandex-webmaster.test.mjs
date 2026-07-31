import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  fetchYandexWebmasterReport,
  parseYandexSitemapUrls,
  yandexWebmasterConstants,
} from "../../scripts/analytics/yandex-webmaster.mjs";
import {
  defaultYandexWebmasterWindow,
  loadYandexWebmasterCredentials,
  parseYandexWebmasterArguments,
  runYandexWebmasterCli,
  writePrivateYandexWebmasterReport,
  yandexWebmasterStdoutSummary,
} from "../../scripts/analytics/report-yandex-webmaster.mjs";

const fixtureAuthorization = `fixture-${"x".repeat(32)}`;
const credentials = { access_token: fixtureAuthorization };
const userId = 87654321;
const hostId = "private-host-id-87654321";
const siteUrl = "https://krepitv.ru/";
const sitemapUrl = "https://krepitv.ru/sitemap.xml";
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://krepitv.ru/</loc></url>
  <url><loc>https://krepitv.ru/vesa/</loc></url>
</urlset>`;

function response(payload, status = 200, { raw = false, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return headers[name.toLowerCase()] ?? null; } },
    async text() { return raw ? String(payload) : JSON.stringify(payload); },
  };
}

function defaultQueryRows() {
  return [];
}

function createFixtureFetch(override, { hostDataStatus = "OK", queryRows = defaultQueryRows() } = {}) {
  const calls = [];
  const counts = new Map();
  const base = `${yandexWebmasterConstants.apiRoot}/user/${userId}/hosts/${encodeURIComponent(hostId)}`;
  const fetchImpl = async (input, options = {}) => {
    const url = String(input);
    calls.push({ options, url });
    counts.set(url, (counts.get(url) ?? 0) + 1);
    const replacement = await override?.({
      count: counts.get(url),
      options,
      url,
    });
    if (replacement !== undefined) return replacement;

    if (url === sitemapUrl) return response(sitemap, 200, { raw: true });
    if (url === `${yandexWebmasterConstants.apiRoot}/user`) {
      return response({ user_id: userId, error_message: `${fixtureAuthorization} must stay private` });
    }
    if (url === `${yandexWebmasterConstants.apiRoot}/user/${userId}/hosts`) {
      return response({ hosts: [{
        ascii_host_url: siteUrl,
        host_id: hostId,
        main_mirror: { host_id: hostId },
        title: "Private account title",
        unicode_host_url: siteUrl,
        verified: true,
      }] });
    }
    if (url === base) return response({ host_data_status: hostDataStatus });
    if (url === `${base}/summary`) {
      if (hostDataStatus !== "OK") {
        return response({
          error_code: hostDataStatus === "NOT_INDEXED" ? "HOST_NOT_INDEXED" : "HOST_NOT_LOADED",
          error_message: `${fixtureAuthorization} must stay private`,
        }, 404);
      }
      return response({ excluded_pages_count: 0, searchable_pages_count: 6, sqi: 10 });
    }
    if (new URL(url).pathname === new URL(`${base}/sitemaps`).pathname) {
      assert.equal(new URL(url).searchParams.get("limit"), "100");
      return response({ count: 1, sitemaps: [{
        children_count: 0,
        errors_count: 0,
        last_access_date: "2026-07-30T12:00:00Z",
        sitemap_type: "SITEMAP",
        sitemap_url: sitemapUrl,
        sources: ["ROBOTS_TXT"],
        urls_count: 2,
      }] });
    }
    if (new URL(url).pathname === new URL(`${base}/user-added-sitemaps`).pathname) {
      assert.equal(new URL(url).searchParams.get("limit"), "100");
      return response({ count: 1, sitemaps: [{
        added_date: "2026-07-30T11:00:00Z",
        sitemap_id: "private-sitemap-id",
        sitemap_url: sitemapUrl,
      }] });
    }
    if (url.startsWith(`${base}/search-queries/all/history`)) {
      const indicator = new URL(url).searchParams.get("query_indicator");
      return response({ indicators: {
        [indicator]: Array.from({ length: 14 }, (_, index) => {
          const date = new Date("2026-07-17T00:00:00Z");
          date.setUTCDate(date.getUTCDate() + index);
          return { date: date.toISOString().slice(0, 10), value: 0 };
        }),
      } });
    }
    if (url === `${base}/query-analytics/list`) {
      return response({ count: queryRows.length, text_indicator_to_statistics: queryRows });
    }
    if (url === `${base}/search-urls/in-search/samples?offset=0&limit=100`) {
      return response({ count: 1, samples: [{
        last_access: "2026-07-30T10:00:00Z",
        title: "Private page title",
        url: siteUrl,
      }] });
    }
    if (url === `${base}/search-urls/events/samples?offset=0&limit=100`) {
      return response({ count: 1, samples: [{
        event: "APPEARED_IN_SEARCH",
        event_date: "2026-07-30T10:00:00Z",
        last_access: "2026-07-30T10:00:00Z",
        target_url: "https://external.invalid/private?token=secret",
        url: "https://krepitv.ru/vesa/",
      }] });
    }
    throw new Error(`Unexpected fixture request: ${url}`);
  };
  return { base, calls, counts, fetchImpl };
}

function queryRow(query, page, impressions) {
  return {
    popular_complementary_indicator: { type: "URL", value: page },
    statistics: [
      { date: "2026-07-30", field: "IMPRESSIONS", value: impressions },
      { date: "2026-07-30", field: "CLICKS", value: impressions >= 10 ? 1 : 0 },
      { date: "2026-07-30", field: "POSITION", value: 8 },
    ],
    text_indicator: { type: "QUERY", value: query },
  };
}

test("CLI defaults to 14 complete UTC days and accepts only an external credential path", () => {
  const now = new Date("2026-07-31T23:59:59.000Z");
  assert.deepEqual(defaultYandexWebmasterWindow(now), {
    date1: "2026-07-17",
    date2: "2026-07-30",
  });
  const parsed = parseYandexWebmasterArguments([
    "--credentials", "/outside/yandex.json",
  ], now);
  assert.equal(parsed.date1, "2026-07-17");
  assert.equal(parsed.date2, "2026-07-30");
  assert.equal(parsed.output, ".private/search/yandex-webmaster-daily.json");
  assert.equal(
    parseYandexWebmasterArguments([], now, "/outside/from-environment.json").credentials,
    "/outside/from-environment.json",
  );
  assert.throws(() => parseYandexWebmasterArguments([], now), /YANDEX_WEBMASTER_CREDENTIALS/);
  assert.throws(() => parseYandexWebmasterArguments([
    "--credentials", "/one.json", "--credentials", "/two.json",
  ], now), /Duplicate argument/);
});

test("sitemap and available zero remain authoritative without exposing Yandex identifiers", async () => {
  assert.deepEqual(parseYandexSitemapUrls(sitemap, siteUrl), [
    "https://krepitv.ru/",
    "https://krepitv.ru/vesa/",
  ]);
  assert.throws(
    () => parseYandexSitemapUrls(sitemap.replace("/vesa/", "/vesa/?private=1"), siteUrl),
    /off-origin|canonical/,
  );
  const fixture = createFixtureFetch();
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    now: new Date("2026-07-31T12:00:00Z"),
    sleepImpl: async () => {},
  });

  assert.equal(report.search_analytics.state, "available");
  assert.deepEqual(report.search_analytics.totals, {
    clicks: 0,
    clicks_observed_days: 14,
    expected_days: 14,
    impressions: 0,
    impressions_observed_days: 14,
  });
  assert.equal(report.sitemap.exact_match, true);
  assert.equal(report.sitemap.robot_discovered.target.state, "discovered");
  assert.equal(report.sitemap.robot_discovered.target.urls_count, 2);
  assert.equal(report.sitemap.user_added.target.state, "present");
  assert.equal(report.indexation.in_search_samples.rows[0].path, "/");
  assert.equal(report.indexation.search_events.rows[0].target.relation, "external");
  assert.equal(fixture.calls.every((call) => (
    call.url === sitemapUrl
      ? !call.options.headers?.Authorization
      : call.options.headers?.Authorization === `OAuth ${fixtureAuthorization}`
  )), true);

  const serialized = JSON.stringify(report);
  for (const forbidden of [fixtureAuthorization, String(userId), hostId, "Private account title", "private-sitemap-id", "external.invalid"] ) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  for (const forbiddenKey of ["user_id", "host_id", "sitemap_id", "access_token", "query_id"]) {
    assert.equal(serialized.includes(`\"${forbiddenKey}\"`), false, forbiddenKey);
  }
});

test("query-to-URL rows enforce threshold, PII suppression and same-origin paths", async () => {
  const safeQuery = "кронштейн для телевизора";
  const rows = [
    queryRow(safeQuery, "https://krepitv.ru/vesa/", 10),
    queryRow("редкий запрос", "https://krepitv.ru/", 9),
    queryRow("user@example.com", "https://krepitv.ru/", 12),
    queryRow("чужая страница", "https://external.invalid/private?q=1", 12),
  ];
  const fixture = createFixtureFetch(undefined, { queryRows: rows });
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  const analytics = report.search_analytics.query_url_rows;
  assert.equal(analytics.state, "available");
  assert.deepEqual(analytics.rows.map((row) => ({
    impressions: row.impressions,
    path: row.path,
    query: row.query,
  })), [{ impressions: 10, path: "/vesa/", query: safeQuery }]);
  assert.deepEqual(analytics.suppressed, {
    below_threshold: 1,
    invalid_page: 1,
    invalid_schema: 0,
    unsafe_query: 1,
  });
  assert.equal(JSON.stringify(report).includes("external.invalid"), false);
});

test("NOT_LOADED and NOT_INDEXED remain not_matured rather than becoming observed zero", async () => {
  for (const hostDataStatus of ["NOT_LOADED", "NOT_INDEXED"]) {
    const fixture = createFixtureFetch(undefined, { hostDataStatus });
    const report = await fetchYandexWebmasterReport({
      credentials,
      date1: "2026-07-17",
      date2: "2026-07-30",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    });
    assert.equal(report.indexation.state, "not_matured");
    assert.equal(report.indexation.summary.state, "not_matured");
    assert.equal(report.search_analytics.state, "not_matured");
    assert.equal(report.search_analytics.totals.impressions, null);
    assert.equal(report.search_analytics.totals.clicks, null);
    assert.equal(report.search_analytics.query_url_rows.state, "not_matured");
    assert.equal(fixture.calls.some((call) => call.url.includes("query-analytics")), false);
  }
});

test("malformed successful sections remain unknown and a 14-day window is enforced", async () => {
  const fixture = createFixtureFetch(({ url }) => {
    if (url.endsWith("/summary")) return response({});
    if (url.includes("/search-queries/all/history")) {
      const indicator = new URL(url).searchParams.get("query_indicator");
      return response({ indicators: indicator === "TOTAL_SHOWS" ? { [indicator]: [] } : {} });
    }
    return undefined;
  });
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  assert.equal(report.indexation.summary.state, "unknown");
  assert.equal(report.indexation.state, "unknown");
  assert.equal(report.indexation.summary.searchable_pages_count, undefined);
  assert.equal(report.search_analytics.state, "unknown");
  assert.equal(report.search_analytics.totals.impressions, null);
  assert.equal(report.search_analytics.totals.clicks, null);
  assert.equal(report.search_analytics.errors.impressions.code, "INCOMPLETE_HISTORY");
  await assert.rejects(
    fetchYandexWebmasterReport({
      credentials,
      date1: "2026-07-16",
      date2: "2026-07-30",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
    }),
    /must not exceed 14 days/,
  );
});

test("unknown query analytics stays null in the CLI summary", async () => {
  const fixture = createFixtureFetch(({ url }) => (
    url.endsWith("/query-analytics/list")
      ? response({ error_code: "TEMPORARY_ERROR", error_message: fixtureAuthorization }, 503)
      : undefined
  ));
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  assert.equal(report.search_analytics.state, "available");
  assert.equal(report.search_analytics.query_url_rows.state, "unknown");
  assert.equal(fixture.calls.filter((call) => call.url.endsWith("/query-analytics/list")).length, 3);
  assert.deepEqual(
    {
      state: yandexWebmasterStdoutSummary(report).query_url_state,
      opportunities: yandexWebmasterStdoutSummary(report).query_url_opportunities,
    },
    { state: "unknown", opportunities: null },
  );
});

test("a truncated sitemap list cannot prove the target is absent", async () => {
  const otherSitemaps = Array.from({ length: 100 }, (_, index) => ({
    sitemap_url: `https://krepitv.ru/other-${index}.xml`,
  }));
  const fixture = createFixtureFetch(({ url }) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/sitemaps")) return response({ sitemaps: otherSitemaps });
    if (pathname.endsWith("/user-added-sitemaps")) {
      return response({ count: 101, sitemaps: otherSitemaps });
    }
    return undefined;
  });
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  assert.equal(report.sitemap.robot_discovered.state, "unknown");
  assert.equal(report.sitemap.robot_discovered.target.state, "unknown");
  assert.equal(report.sitemap.user_added.state, "unknown");
  assert.equal(report.sitemap.user_added.target.state, "unknown");
});

test("malformed sitemap and indexation rows keep their sections unknown", async () => {
  const fixture = createFixtureFetch(({ url }) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/sitemaps")) return response({ sitemaps: [{}] });
    if (pathname.endsWith("/user-added-sitemaps")) {
      return response({ count: 0, sitemaps: [{ sitemap_url: sitemapUrl }] });
    }
    if (pathname.endsWith("/search-urls/in-search/samples")) {
      return response({ count: 0, samples: [{
        last_access: "2026-07-30T10:00:00Z",
        url: siteUrl,
      }] });
    }
    if (pathname.endsWith("/search-urls/events/samples")) {
      return response({ count: 1, samples: [{}] });
    }
    return undefined;
  });
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async () => {},
  });
  assert.equal(report.sitemap.robot_discovered.state, "unknown");
  assert.equal(report.sitemap.user_added.state, "unknown");
  assert.equal(report.indexation.in_search_samples.state, "unknown");
  assert.equal(report.indexation.search_events.state, "unknown");
  assert.equal(report.indexation.state, "unknown");
});

test("bounded retry covers network, transient HTTP and response-body timeout", async () => {
  const sleeps = [];
  const fixture = createFixtureFetch(({ count, url }) => {
    if (url === `${yandexWebmasterConstants.apiRoot}/user` && count === 1) {
      throw new Error(`${fixtureAuthorization} private network detail`);
    }
    if (url === `${yandexWebmasterConstants.apiRoot}/user` && count === 2) {
      return response({ error_code: "TEMPORARY_ERROR" }, 503, { headers: { "retry-after": "60" } });
    }
    return undefined;
  });
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: "2026-07-17",
    date2: "2026-07-30",
    fetchImpl: fixture.fetchImpl,
    localSitemapXml: sitemap,
    sleepImpl: async (milliseconds) => { sleeps.push(milliseconds); },
  });
  assert.equal(report.access.state, "verified");
  assert.deepEqual(sleeps.slice(0, 2), [500, 30_000]);

  const timeoutFixture = createFixtureFetch(({ url }) => (
    url === `${yandexWebmasterConstants.apiRoot}/user`
      ? {
        ok: true,
        status: 200,
        headers: { get() { return null; } },
        text() { return new Promise(() => {}); },
      }
      : undefined
  ));
  await assert.rejects(
    fetchYandexWebmasterReport({
      credentials,
      date1: "2026-07-17",
      date2: "2026-07-30",
      fetchImpl: timeoutFixture.fetchImpl,
      localSitemapXml: sitemap,
      requestTimeoutMs: 5,
      sleepImpl: async () => {},
    }),
    (error) => String(error).includes("bounded retries") && !String(error).includes(fixtureAuthorization),
  );
});

test("remote API failures expose only a bounded status/code and never the response message", async () => {
  const privateMessage = `${fixtureAuthorization} ${hostId} remote private message`;
  const fixture = createFixtureFetch(({ url }) => (
    url === `${yandexWebmasterConstants.apiRoot}/user`
      ? response({ error_code: "ACCESS_DENIED", error_message: privateMessage }, 403)
      : undefined
  ));
  await assert.rejects(
    fetchYandexWebmasterReport({
      credentials,
      date1: "2026-07-17",
      date2: "2026-07-30",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    (error) => String(error).includes("HTTP 403")
      && String(error).includes("ACCESS_DENIED")
      && !String(error).includes(fixtureAuthorization)
      && !String(error).includes(hostId)
      && !String(error).includes("remote private message"),
  );
});

test("report requires the exact verified URL-prefix host", async () => {
  const fixture = createFixtureFetch(({ url }) => (
    url === `${yandexWebmasterConstants.apiRoot}/user/${userId}/hosts`
      ? response({ hosts: [{
        ascii_host_url: "https://www.krepitv.ru/",
        host_id: hostId,
        verified: true,
      }] })
      : undefined
  ));
  await assert.rejects(
    fetchYandexWebmasterReport({
      credentials,
      date1: "2026-07-17",
      date2: "2026-07-30",
      fetchImpl: fixture.fetchImpl,
      localSitemapXml: sitemap,
      sleepImpl: async () => {},
    }),
    /exact verified host was not found/,
  );
});

test("CLI reads an owner-only external credential, writes atomically as 0600 and never prints queries or IDs", async (context) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "krepitv-yandex-project-"));
  const credentialsRoot = await mkdtemp(path.join(os.tmpdir(), "krepitv-yandex-credentials-"));
  context.after(() => Promise.all([
    rm(projectRoot, { force: true, recursive: true }),
    rm(credentialsRoot, { force: true, recursive: true }),
  ]));
  await mkdir(path.join(projectRoot, "docs"));
  await writeFile(path.join(projectRoot, "docs/sitemap.xml"), sitemap);
  const credentialsFile = path.join(credentialsRoot, "credentials.json");
  await writeFile(credentialsFile, JSON.stringify(credentials), { mode: 0o600 });
  await chmod(credentialsFile, 0o600);

  const safeQuery = "кронштейн для телевизора";
  const fixture = createFixtureFetch(undefined, {
    queryRows: [queryRow(safeQuery, "https://krepitv.ru/vesa/", 10)],
  });
  let stdout = "";
  const report = await runYandexWebmasterCli({
    argv: ["--credentials", credentialsFile],
    fetchImpl: fixture.fetchImpl,
    now: new Date("2026-07-31T12:00:00Z"),
    projectRoot,
    sleepImpl: async () => {},
    stdout: { write(chunk) { stdout += chunk; } },
  });

  const output = path.join(projectRoot, ".private/search/yandex-webmaster-daily.json");
  const metadata = await stat(output);
  assert.equal(metadata.mode & 0o777, 0o600);
  const saved = await readFile(output, "utf8");
  assert.equal(saved.includes(safeQuery), true);
  assert.equal(saved.includes(fixtureAuthorization), false);
  assert.equal(saved.includes(hostId), false);
  assert.equal(stdout.includes(safeQuery), false);
  assert.equal(stdout.includes(fixtureAuthorization), false);
  assert.equal(stdout.includes(hostId), false);
  assert.equal(stdout.includes(String(userId)), false);
  assert.equal(JSON.parse(stdout).query_url_opportunities, 1);
  assert.equal(report.search_analytics.query_url_rows.rows.length, 1);
  assert.deepEqual(
    (await readdir(path.dirname(output))).filter((name) => name.endsWith(".tmp")),
    [],
  );
});

test("credential and output guards allow only a safe .private alias to an external owner-only file", async (context) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "krepitv-yandex-guards-"));
  const credentialsRoot = await mkdtemp(path.join(os.tmpdir(), "krepitv-yandex-guards-creds-"));
  context.after(() => Promise.all([
    rm(projectRoot, { force: true, recursive: true }),
    rm(credentialsRoot, { force: true, recursive: true }),
  ]));

  const inside = path.join(projectRoot, "credentials.json");
  await writeFile(inside, JSON.stringify(credentials), { mode: 0o600 });
  await assert.rejects(
    loadYandexWebmasterCredentials(inside, { projectRoot }),
    /outside the repository/,
  );

  const broad = path.join(credentialsRoot, "broad.json");
  await writeFile(broad, JSON.stringify(credentials), { mode: 0o644 });
  await chmod(broad, 0o644);
  await assert.rejects(
    loadYandexWebmasterCredentials(broad, { projectRoot }),
    /owner-only/,
  );

  const privateRoot = path.join(projectRoot, ".private");
  const privateSearch = path.join(privateRoot, "search");
  const safeCredentials = path.join(credentialsRoot, "safe.json");
  await writeFile(safeCredentials, JSON.stringify(credentials), { mode: 0o600 });
  await chmod(safeCredentials, 0o600);
  await mkdir(privateRoot, { mode: 0o700 });
  await mkdir(privateSearch, { mode: 0o700 });
  const safeAlias = path.join(privateSearch, "yandex.json");
  await symlink(safeCredentials, safeAlias, "file");
  assert.deepEqual(
    await loadYandexWebmasterCredentials(safeAlias, { projectRoot }),
    credentials,
  );
  const outsideAlias = path.join(credentialsRoot, "outside-alias.json");
  await symlink(safeCredentials, outsideAlias, "file");
  await assert.rejects(
    loadYandexWebmasterCredentials(outsideAlias, { projectRoot }),
    /under \.private/,
  );

  const external = path.join(credentialsRoot, "external-output");
  await mkdir(external, { mode: 0o700 });
  await symlink(external, path.join(privateRoot, "escape"), "dir");
  await assert.rejects(
    writePrivateYandexWebmasterReport(".private/escape/report.json", { safe: true }, { projectRoot }),
    /unsafe directory/,
  );
  await assert.rejects(
    writePrivateYandexWebmasterReport("report.json", { safe: true }, { projectRoot }),
    /under \.private/,
  );
});
