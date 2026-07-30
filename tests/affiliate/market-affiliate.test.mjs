import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AffiliateValidationError,
  buildSnapshot,
  readJson,
  validateBatch,
  validateSnapshot,
  validateSource,
  writeJson,
} from "../../scripts/affiliate/lib.mjs";
import {
  AFFILIATE_LINK_REL,
  getAffiliatePresentation,
} from "../../web/src/lib/affiliateOffer.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtures = path.join(root, "tests/fixtures/affiliate");
const fixtureOptions = { allowExampleHosts: true };

test("validates example.invalid source, batch and snapshot fixtures", async () => {
  const [source, batch, snapshot] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);

  assert.equal(validateSource(source, fixtureOptions), source);
  assert.equal(validateBatch(batch, fixtureOptions), batch);
  assert.equal(validateSnapshot(snapshot, fixtureOptions), snapshot);
});

test("builds the expected snapshot and strips an unmarked href", async () => {
  const [source, batch, expected] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);

  const actual = buildSnapshot(source, batch, fixtureOptions);
  assert.deepEqual(actual, expected);
  assert.equal(actual.offers[1].publishable, false);
  assert.equal(actual.offers[1].affiliate_href, null);
});

test("rejects sensitive keys before a snapshot can be written", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  source.cards[0].token = "redacted-test-value";

  assert.throws(
    () => validateSource(source, fixtureOptions),
    (error) =>
      error instanceof AffiliateValidationError &&
      error.issues.some((issue) => issue.includes("sensitive key is forbidden")),
  );
});

test("rejects a publishable href whose ERID does not match", async () => {
  const snapshot = await readJson(path.join(fixtures, "snapshot.valid.json"));
  snapshot.offers[0].affiliate_href =
    "https://affiliate.example.invalid/offer/mount-fixed-01?erid=wrongFixture999";

  assert.throws(
    () => validateSnapshot(snapshot, fixtureOptions),
    /ERID query must match creative\.erid/,
  );
});

test("requires the explicit Yandex Market advertising disclosure", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  source.cards[0].creative.disclosure.advertiser_inn = "0000000000";

  assert.throws(
    () => validateSource(source, fixtureOptions),
    /must equal 9704254424/,
  );
});

test("publishes a direct sponsored link with the visible disclosure data", () => {
  const offer = {
    publishable: true,
    eligibility: "publishable",
    affiliate_href:
      "https://market.yandex.ru/card/kronshteyn/123?erid=eridFixture123",
    creative: {
      erid: "eridFixture123",
      disclosure: {
        label: "Реклама",
        advertiser_name: "ООО «Яндекс Маркет»",
        advertiser_inn: "9704254424",
      },
    },
  };

  const presentation = getAffiliatePresentation(offer);
  assert.equal(
    presentation.href,
    "https://market.yandex.ru/card/kronshteyn/123?erid=eridFixture123",
  );
  assert.equal(presentation.rel, AFFILIATE_LINK_REL);
  assert.equal(presentation.label, "Реклама");
  assert.equal(presentation.advertiserInn, "9704254424");
});

test("refuses same-site, redirect and unmarked affiliate destinations", () => {
  const base = {
    publishable: true,
    eligibility: "publishable",
    creative: {
      erid: "eridFixture123",
      disclosure: {
        label: "Реклама",
        advertiser_name: "ООО «Яндекс Маркет»",
        advertiser_inn: "9704254424",
      },
    },
  };

  for (const affiliate_href of [
    "https://krepitv.ru/go/mount-fixed-01/?erid=eridFixture123",
    "https://redirect.example/offer?erid=eridFixture123",
    "https://market.yandex.ru/card/kronshteyn/123",
  ]) {
    assert.equal(getAffiliatePresentation({ ...base, affiliate_href }), null);
  }
});

test("requires one sanitized check for every source card", async () => {
  const [source, batch] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
  ]);
  batch.checks.pop();

  assert.throws(
    () => buildSnapshot(source, batch, fixtureOptions),
    /missing check result/,
  );
});

test("writes generated snapshots with owner-only permissions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "krepitv-affiliate-"));
  const file = path.join(directory, "snapshot.json");
  const snapshot = await readJson(path.join(fixtures, "snapshot.valid.json"));

  await writeFile(file, "{}\n", { mode: 0o644 });
  await writeJson(file, snapshot);
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), snapshot);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
});

test("CLI refuses to write a snapshot outside .private", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "krepitv-affiliate-cli-"));
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts/affiliate/build-snapshot.mjs"),
      "--source",
      path.join(fixtures, "source.valid.json"),
      "--batch",
      path.join(fixtures, "batch.valid.json"),
      "--out",
      path.join(directory, "must-not-write.json"),
      "--allow-example-hosts",
    ],
    { encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only under \.private/);
});
