import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  InstallationKitDataError,
  validateInstallationKitData,
} from "../../scripts/catalog/validate-installation-kit-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

const [wallFixingSystems, modelPorts, connectionProfiles, models, mounts] =
  await Promise.all([
    readJson("data/wall_fixing_systems.json"),
    readJson("data/model_ports.json"),
    readJson("data/connection_profiles.json"),
    readJson("data/tv_models.json"),
    readJson("data/mounts.json"),
  ]);

function validate(candidate = {}) {
  return validateInstallationKitData({
    wallFixingSystems: candidate.wallFixingSystems ?? structuredClone(wallFixingSystems),
    modelPorts: candidate.modelPorts ?? structuredClone(modelPorts),
    connectionProfiles:
      candidate.connectionProfiles ?? structuredClone(connectionProfiles),
    models: candidate.models ?? models,
    mounts: candidate.mounts ?? mounts,
    now: new Date("2026-08-25T12:00:00Z"),
  });
}

function issueIncludes(fragment) {
  return (error) =>
    error instanceof InstallationKitDataError &&
    error.issues.some((issue) => issue.includes(fragment));
}

test("the sourced installation-kit datasets pass the strict contract", () => {
  const summary = validate();

  assert.equal(summary.wall_systems, 3);
  assert.equal(summary.exact_wall_recommendations, 0);
  assert.equal(summary.model_port_passports, 0);
  assert.equal(summary.connection_profiles, 1);
});

test("unknown fields are rejected instead of being silently published", () => {
  const candidate = structuredClone(modelPorts);
  candidate.unreviewed_notes = [];

  assert.throws(
    () => validate({ modelPorts: candidate }),
    issueIncludes("model_ports: unknown field unreviewed_notes"),
  );
});

test("a model port passport must reference an exact catalog model and HTTPS evidence", () => {
  const candidate = structuredClone(modelPorts);
  candidate.models.push({
    model_id: "invented-tv",
    ports: [{ kind: "hdmi", position: "right", direction: "sideways" }],
    evidence: {
      source_url: "http://example.com/manual",
      source_title: "Unknown manual",
      source_publisher: "Unknown",
      source_region: "Россия",
      checked_at: "2026-08-25",
    },
  });

  assert.throws(
    () => validate({ modelPorts: candidate }),
    (error) =>
      issueIncludes("unknown catalog model invented-tv")(error) &&
      issueIncludes("must use HTTPS evidence")(error),
  );
});

test("an exact wall recommendation cannot exist without complete mount geometry", () => {
  const candidate = structuredClone(wallFixingSystems);
  candidate.exact_recommendations.push({
    id: "test-concrete-atlantis",
    system_id: "fischer-faz-ii-classic",
    mount_id: "kromax-atlantis-65",
    wall_profile: "concrete",
    minimum_base_thickness_mm: 120,
    fastener_title: "Test only",
    quantity: 4,
    anchor_diameter_mm: 10,
    anchor_length_mm: 95,
    drill_diameter_mm: 10,
    supported_load_kg: 120,
    evidence: candidate.systems[0].evidence,
  });

  assert.throws(
    () => validate({ wallFixingSystems: candidate }),
    issueIncludes("requires sourced mount mass and complete wall-plate geometry"),
  );
});

test("class-level wall guidance cannot masquerade as an exact recommendation", () => {
  const candidate = structuredClone(wallFixingSystems);
  candidate.systems[0].scope = "exact";

  assert.throws(
    () => validate({ wallFixingSystems: candidate }),
    issueIncludes("scope must be class-only"),
  );
});

test("future, stale, and non-HTTPS evidence is rejected", () => {
  const candidate = structuredClone(connectionProfiles);
  candidate.profiles[0].evidence.source_url = "http://example.com/hdmi";
  candidate.profiles[0].evidence.checked_at = "2027-01-01";

  assert.throws(
    () => validate({ connectionProfiles: candidate }),
    (error) =>
      issueIncludes("must use HTTPS evidence")(error) &&
      issueIncludes("cannot be in the future")(error),
  );
});

test("schema files stay strict and versioned", async () => {
  const schemas = await Promise.all([
    readJson("schemas/wall-fixing-systems.schema.json"),
    readJson("schemas/model-ports.schema.json"),
    readJson("schemas/connection-profiles.schema.json"),
  ]);

  for (const schema of schemas) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.schema_version.const, 1);
  }
});
