import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildMarketAffiliateRequestUrl } from "../../scripts/affiliate/lib.mjs";
import {
  buildModelPrivateSnapshot,
  buildModelPublicSnapshot,
  expandModelPlacementCards,
  generateModelPlacementManifest,
  ModelPlacementValidationError,
  modelPlacementId,
  modelPlacementVid,
  selectModelPlacementCandidates,
  validateModelPlacementManifest,
  validateModelPrivateSnapshot,
  validateModelPublicSnapshot,
} from "../../scripts/affiliate/model-placements.mjs";
import {
  parseGenerateModelPlacementArgs,
  runGenerateModelPlacements,
} from "../../scripts/affiliate/generate-model-placements.mjs";

const source = JSON.parse(
  await readFile(new URL("../fixtures/affiliate/source.valid.json", import.meta.url), "utf8"),
);

const models = [
  {
    id: "model-beta",
    title: "Model Beta",
    diagonal_inches: 50,
    weight_kg: 10,
    vesa_width_mm: 200,
    vesa_height_mm: 200,
  },
  {
    id: "model-alpha",
    title: "Model Alpha",
    diagonal_inches: 55,
    weight_kg: 10,
    vesa_width_mm: 200,
    vesa_height_mm: 200,
  },
];

const catalogMounts = [
  {
    id: "mount-fixed-01",
    title: "Fixture Fixed",
    vesa: ["200x200"],
    max_load_kg: 30,
    min_diagonal_in: 32,
    max_diagonal_in: 65,
  },
  {
    id: "mount-tilt-02",
    title: "Fixture Tilt",
    vesa: ["200x200"],
    max_load_kg: 40,
    min_diagonal_in: 40,
    max_diagonal_in: 80,
  },
  {
    id: "mount-without-source",
    title: "Fixture Without Source",
    vesa: ["200x200"],
    max_load_kg: 100,
    min_diagonal_in: 20,
    max_diagonal_in: 100,
  },
];

function fixtureManifest() {
  return generateModelPlacementManifest({
    source,
    models,
    catalogMounts,
    allowExampleHosts: true,
  });
}

function okCheck(card) {
  const sourceUrl = new URL(card.market_source_url);
  const destination = new URL(
    `${sourceUrl.pathname}?clid=${card.clid}`,
    "https://affiliate.example.invalid",
  );
  destination.searchParams.set("vid", card.vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", card.clid);
  if (card.compliance_mode === "advertising") {
    destination.searchParams.set("erid", card.creative.erid);
  }
  return {
    id: card.id,
    market_source_url: card.market_source_url,
    compliance_mode: card.compliance_mode,
    clid: card.clid,
    vid: card.vid,
    status: "ok",
    affiliate_href: destination.toString(),
    page_name: "POKUPKI_PRODUCT",
    title: card.entity_id === "mount-fixed-01"
      ? "Кронштейн Fixture Fixed"
      : "Кронштейн Fixture Tilt",
    product_photo: `https://images.example.invalid/${card.id}.jpg`,
    promise: 100,
    price: 2500,
    stock: 5,
    checked_at: "2026-07-31T08:59:00Z",
    error_code: null,
  };
}

function unavailableCheck(card) {
  return {
    id: card.id,
    market_source_url: card.market_source_url,
    compliance_mode: card.compliance_mode,
    clid: card.clid,
    vid: card.vid,
    status: "unavailable",
    affiliate_href: null,
    page_name: null,
    title: null,
    product_photo: null,
    promise: null,
    price: null,
    stock: null,
    checked_at: "2026-07-31T08:59:00Z",
    error_code: "not_in_stock",
  };
}

function batch(checks) {
  return {
    schema_version: 2,
    generated_at: "2026-07-31T09:00:00Z",
    checks,
  };
}

test("selects only source-backed exact-VESA/load-reserve mounts in Rust score order", () => {
  const selected = selectModelPlacementCandidates(models[0], {
    source,
    catalogMounts,
  });
  assert.deepEqual(
    selected.map(({ entity_id, score, fit_status, required_load_kg }) => ({
      entity_id,
      score,
      fit_status,
      required_load_kg,
    })),
    [
      {
        entity_id: "mount-tilt-02",
        score: 110,
        fit_status: "verified-fit",
        required_load_kg: 12.5,
      },
      {
        entity_id: "mount-fixed-01",
        score: 108,
        fit_status: "verified-fit",
        required_load_kg: 12.5,
      },
    ],
  );

  const wrongVesa = { ...models[0], vesa_width_mm: 600, vesa_height_mm: 400 };
  assert.deepEqual(
    selectModelPlacementCandidates(wrongVesa, { source, catalogMounts }),
    [],
  );
  const tooHeavy = { ...models[0], weight_kg: 40 };
  assert.deepEqual(
    selectModelPlacementCandidates(tooHeavy, { source, catalogMounts }),
    [],
  );

  const conditionalCatalog = catalogMounts.map((mount) =>
    mount.id === "mount-tilt-02" ? { ...mount, max_diagonal_in: 49 } : mount);
  assert.deepEqual(
    selectModelPlacementCandidates(models[0], {
      source,
      catalogMounts: conditionalCatalog,
    }).map(({ entity_id, score, fit_status }) => ({ entity_id, score, fit_status })),
    [
      { entity_id: "mount-fixed-01", score: 108, fit_status: "verified-fit" },
      { entity_id: "mount-tilt-02", score: 98, fit_status: "conditional-fit" },
    ],
  );
});

test("generator is canonical across catalog ordering and emits unique deterministic IDs", () => {
  const generated = fixtureManifest();
  const reordered = generateModelPlacementManifest({
    source,
    models: [...models].reverse(),
    catalogMounts: [...catalogMounts].reverse(),
    allowExampleHosts: true,
  });
  assert.deepEqual(reordered, generated);
  assert.equal(generated.schema_version, 1);
  assert.equal(generated.clid, "12345678");
  assert.equal(generated.models.length, 2);
  assert.equal(generated.expected_offer_count, 4);
  assert.deepEqual(generated.models.map((entry) => entry.model_id), [
    "model-alpha",
    "model-beta",
  ]);

  const placements = generated.models.flatMap((entry) => entry.placements);
  assert.equal(new Set(placements.map((entry) => entry.placement_id)).size, 4);
  assert.equal(new Set(placements.map((entry) => entry.vid)).size, 4);
  for (const modelEntry of generated.models) {
    assert.equal(modelEntry.model_path, `/modeli/${modelEntry.model_id}/`);
    assert.deepEqual(modelEntry.placements.map((entry) => entry.rank), [1, 2]);
    for (const placement of modelEntry.placements) {
      assert.equal(
        placement.placement_id,
        modelPlacementId(modelEntry.model_id, placement.rank, placement.entity_id),
      );
      assert.equal(
        placement.vid,
        modelPlacementVid(modelEntry.model_id, placement.rank, placement.entity_id),
      );
      assert.match(placement.vid, /^[A-Za-z0-9]{1,150}$/);
    }
  }
});

test("strict manifest validation rejects drift in coverage, compatibility, rank, binding and VID", () => {
  const missingModel = fixtureManifest();
  missingModel.models.pop();
  missingModel.expected_offer_count = missingModel.models[0].expected_offer_count;
  assert.throws(
    () => validateModelPlacementManifest(missingModel, {
      source,
      models,
      catalogMounts,
      allowExampleHosts: true,
    }),
    (error) => error instanceof ModelPlacementValidationError && /every catalog model|missing catalog model/.test(error.message),
  );

  const wrongOrder = fixtureManifest();
  wrongOrder.models[0].placements.reverse();
  assert.throws(
    () => validateModelPlacementManifest(wrongOrder, {
      source,
      models,
      catalogMounts,
      allowExampleHosts: true,
    }),
    /ordered contiguously|Rust score ordering/,
  );

  const wrongBinding = fixtureManifest();
  wrongBinding.models[0].placements[0].source_card_id = "mount-fixed-01";
  assert.throws(
    () => validateModelPlacementManifest(wrongBinding, {
      source,
      models,
      catalogMounts,
      allowExampleHosts: true,
    }),
    /source card entity|canonical source card/,
  );

  const baseVid = fixtureManifest();
  baseVid.models[0].placements[0].vid = source.cards[0].vid;
  assert.throws(
    () => validateModelPlacementManifest(baseVid, {
      source,
      models,
      catalogMounts,
      allowExampleHosts: true,
    }),
    /base-colliding VID|deterministic placement VID/,
  );

  const incompatible = fixtureManifest();
  incompatible.models[0].placements[0].entity_id = "mount-without-source";
  assert.throws(
    () => validateModelPlacementManifest(incompatible, {
      source,
      models,
      catalogMounts,
      allowExampleHosts: true,
    }),
    /source card entity|Rust score ordering/,
  );
});

test("expands exact one-card Market requests without mutating the source", () => {
  const manifest = fixtureManifest();
  const expanded = expandModelPlacementCards(manifest, {
    source,
    models,
    catalogMounts,
    allowExampleHosts: true,
  });
  assert.equal(expanded.length, 4);
  assert.equal(expanded[0].model_id, "model-alpha");
  assert.equal(expanded[0].model_path, "/modeli/model-alpha/");
  assert.equal(expanded[0].card.id, expanded[0].placement_id);
  assert.equal(expanded[0].card.vid, manifest.models[0].placements[0].vid);
  assert.equal(source.cards[0].id, "mount-fixed-01");

  const request = buildMarketAffiliateRequestUrl(expanded[0].card);
  assert.equal(request.searchParams.get("clid"), manifest.clid);
  assert.equal(request.searchParams.get("vid"), expanded[0].card.vid);
  assert.equal(
    request.searchParams.get("url"),
    expanded[0].card.market_source_url,
  );
});

test("builds complete private decisions and a publishable public subset", () => {
  const manifest = fixtureManifest();
  const expanded = expandModelPlacementCards(manifest, {
    source,
    models,
    catalogMounts,
    allowExampleHosts: true,
  });
  const checks = expanded.map(({ card }, index) =>
    index === 3 ? unavailableCheck(card) : okCheck(card));
  const privateSnapshot = buildModelPrivateSnapshot({
    manifest,
    source,
    models,
    catalogMounts,
    batch: batch(checks),
    allowExampleHosts: true,
  });
  assert.equal(privateSnapshot.placements.length, 4);
  assert.equal(privateSnapshot.placements[0].offer.promise, 100);
  assert.equal(privateSnapshot.placements[3].offer.publishable, false);
  validateModelPrivateSnapshot(privateSnapshot, {
    manifest,
    source,
    models,
    catalogMounts,
    allowExampleHosts: true,
  });

  const publicSnapshot = buildModelPublicSnapshot(privateSnapshot, {
    manifest,
    source,
    models,
    catalogMounts,
    allowExampleHosts: true,
  });
  assert.equal(publicSnapshot.placements.length, 3);
  for (const placement of publicSnapshot.placements) {
    assert.equal(placement.offer.publishable, true);
    assert.equal("promise" in placement.offer, false);
    assert.equal("price" in placement.offer, false);
    assert.equal("stock" in placement.offer, false);
    assert.equal(
      new URL(placement.offer.affiliate_href).searchParams.get("vid"),
      placement.offer.vid,
    );
  }
  validateModelPublicSnapshot(publicSnapshot, {
    manifest,
    source,
    models,
    catalogMounts,
    allowExampleHosts: true,
  });

  const tampered = structuredClone(publicSnapshot);
  tampered.placements[0].model_path = "/modeli/another-model/";
  assert.throws(
    () => validateModelPublicSnapshot(tampered, {
      manifest,
      source,
      models,
      catalogMounts,
      allowExampleHosts: true,
    }),
    /model_path.*must match manifest/,
  );
});

test("real catalog produces deterministic top-three placements for all 80 models", async () => {
  const [realSource, realModels, realMounts, rustGraph] = await Promise.all([
    readFile(new URL("../../data/affiliate/market-products.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/tv_models.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/mounts.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../web/public/data/compatibility-graph.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const generated = generateModelPlacementManifest({
    source: realSource,
    models: realModels,
    catalogMounts: realMounts,
  });
  assert.equal(realModels.length, 80);
  assert.equal(generated.models.length, 80);
  assert.equal(generated.expected_offer_count, 239);
  assert.equal(
    generated.models.every((entry) =>
      entry.expected_offer_count >= 1 &&
      entry.expected_offer_count <= 3 &&
      entry.placements.length === entry.expected_offer_count),
    true,
  );
  assert.deepEqual(
    generated.models
      .filter((entry) => entry.expected_offer_count < 3)
      .map((entry) => [entry.model_id, entry.expected_offer_count]),
    [["samsung-qe85q7faauxru", 2]],
  );
  assert.equal(
    generated.models
      .flatMap((entry) => entry.placements)
      .find((placement) => placement.entity_id === "onkron-tm6")
      .source_card_id,
    "market-onkron-tm6-5720427358",
    "the source manifest's first ONKRON TM6 card remains the primary offer",
  );
  assert.equal(
    new Set(generated.models.flatMap((entry) => entry.placements.map((placement) => placement.vid))).size,
    239,
  );
  const sourceBackedMounts = new Set(realSource.cards.map((card) => card.entity_id));
  for (const modelEntry of generated.models) {
    assert.deepEqual(
      modelEntry.placements.map((placement) => placement.entity_id),
      rustGraph
        .filter((edge) =>
          edge.tv_id === modelEntry.model_id &&
          edge.compatible &&
          sourceBackedMounts.has(edge.mount_id))
        .slice(0, 3)
        .map((edge) => edge.mount_id),
      `${modelEntry.model_id}: generated order must equal the Rust compatibility graph`,
    );
  }
});

test("CLI writes canonical output and --check detects any byte drift", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "krepitv-model-placements-"));
  const output = path.join(temporary, "model-page-placements.json");
  try {
    const written = await runGenerateModelPlacements(["--out", output]);
    assert.equal(written.status, "written");
    assert.equal(written.manifest.models.length, 80);
    const current = await runGenerateModelPlacements(["--check", output]);
    assert.equal(current.status, "current");

    await writeFile(output, (await readFile(output, "utf8")).trimEnd(), "utf8");
    await assert.rejects(
      runGenerateModelPlacements(["--check", output]),
      /does not exactly match/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("CLI argument parser requires exactly one mode", () => {
  assert.equal(parseGenerateModelPlacementArgs(["--out"]).mode, "out");
  assert.equal(parseGenerateModelPlacementArgs(["--check"]).mode, "check");
  assert.throws(() => parseGenerateModelPlacementArgs([]), /Choose --out or --check/);
  assert.throws(
    () => parseGenerateModelPlacementArgs(["--out", "--check"]),
    /exactly one/,
  );
  assert.throws(() => parseGenerateModelPlacementArgs(["--unknown"]), /Unknown argument/);
});
