import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mergeScript = path.join(root, "scripts/research/merge-tv-model-demand.mjs");
const researchContract = {
  product: "KREPI TV",
  landing_page: "https://krepitv.ru/modeli/",
  intended_conversion: "Переход к подходящему кронштейну",
  relevance_rule: "Точная модель без смешивания региональных суффиксов",
  region_id: 225,
  region: "Россия",
  period: "last30days",
  devices: "all",
  scope: "exact model demand",
  operator: '"[query]"',
  source_url: "https://yandex.ru/support2/wordstat/ru/",
  source_label: "Test fixture",
};

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "krepitv-demand-merge-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function manifest({ observedAt, models, contract = researchContract, batch = "fixture" }) {
  return {
    schema_version: 1,
    research_contract: contract,
    observed_at: observedAt,
    batch_sha256: batch,
    models,
  };
}

async function writeJson(directory, name, value) {
  const file = path.join(directory, name);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

function runMerge(inputs, output) {
  return spawnSync(
    process.execPath,
    [mergeScript, "--inputs", ...inputs, "--output", output],
    { cwd: root, encoding: "utf8" },
  );
}

test("merges, sorts and de-duplicates exact model rows", async (t) => {
  const directory = await temporaryDirectory(t);
  const first = await writeJson(directory, "first.json", manifest({
    observedAt: "2026-07-29T08:00:00.000Z",
    batch: "first-batch",
    models: [
      { brand: "Beta", model: "Z", seo_frequency: 40, revision: "first" },
      { brand: "Alpha", model: "B", seo_frequency: 40 },
      { brand: "Alpha", model: "A", seo_frequency: 10, revision: "first" },
    ],
  }));
  const second = await writeJson(directory, "second.json", manifest({
    observedAt: "2026-07-30T08:00:00.000Z",
    batch: "second-batch",
    models: [
      { brand: "Beta", model: "Z", seo_frequency: 40, revision: "second" },
      { brand: "Alpha", model: "A", seo_frequency: 10, revision: "second" },
      { brand: "Gamma", model: "K", seo_frequency: 100 },
    ],
  }));
  const output = path.join(directory, "merged.json");

  const result = runMerge([first, second], output);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Merged 2 batches into 4 exact-model rows/);
  const merged = JSON.parse(await readFile(output, "utf8"));
  assert.deepEqual(
    merged.models.map(({ brand, model, seo_frequency }) => ({ brand, model, seo_frequency })),
    [
      { brand: "Gamma", model: "K", seo_frequency: 100 },
      { brand: "Alpha", model: "B", seo_frequency: 40 },
      { brand: "Beta", model: "Z", seo_frequency: 40 },
      { brand: "Alpha", model: "A", seo_frequency: 10 },
    ],
  );
  assert.equal(merged.models.find(({ model }) => model === "Z").revision, "second");
  assert.equal(merged.models.find(({ model }) => model === "A").revision, "second");
  assert.equal(merged.observed_at, "2026-07-30T08:00:00.000Z");
  assert.deepEqual(merged.research_contract, researchContract);
  assert.deepEqual(merged.source_batches.map(({ rows }) => rows), [3, 3]);
  assert.match(merged.batch_sha256, /^[a-f0-9]{64}$/);
});

test("rejects duplicate identities with conflicting frequencies", async (t) => {
  const directory = await temporaryDirectory(t);
  const first = await writeJson(directory, "first.json", manifest({
    observedAt: "2026-07-30T08:00:00.000Z",
    models: [{ brand: "Alpha", model: "MODEL-A", seo_frequency: 10 }],
  }));
  const second = await writeJson(directory, "second.json", manifest({
    observedAt: "2026-07-30T09:00:00.000Z",
    models: [{ brand: "Alpha", model: "MODEL-A", seo_frequency: 11 }],
  }));

  const result = runMerge([first, second], path.join(directory, "merged.json"));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Frequency conflict for Alpha MODEL-A/);
});

test("rejects an output path that is also an input manifest", async (t) => {
  const directory = await temporaryDirectory(t);
  const input = await writeJson(directory, "input.json", manifest({
    observedAt: "2026-07-30T08:00:00.000Z",
    models: [{ brand: "Alpha", model: "MODEL-A", seo_frequency: 10 }],
  }));
  const before = await readFile(input, "utf8");

  const result = runMerge([input], input);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Output must not overwrite one of the source batch manifests/);
  assert.equal(await readFile(input, "utf8"), before);
});

test("rejects manifests with a mismatched research contract", async (t) => {
  const directory = await temporaryDirectory(t);
  const first = await writeJson(directory, "first.json", manifest({
    observedAt: "2026-07-30T08:00:00.000Z",
    models: [{ brand: "Alpha", model: "MODEL-A", seo_frequency: 10 }],
  }));
  const second = await writeJson(directory, "second.json", manifest({
    observedAt: "2026-07-30T09:00:00.000Z",
    contract: { ...researchContract, relevance_rule: "Смешивать любые модели" },
    models: [{ brand: "Beta", model: "MODEL-B", seo_frequency: 20 }],
  }));

  const result = runMerge([first, second], path.join(directory, "merged.json"));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Demand contract mismatch:/);
});
