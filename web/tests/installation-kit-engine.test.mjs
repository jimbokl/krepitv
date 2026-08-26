import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInstallationKitInput,
  buildInstallationKitWithEngine,
} from "../src/lib/installationKit.js";

const evidence = {
  source_url: "https://example.com/manual",
  source_title: "Официальное руководство",
  source_publisher: "Производитель",
  source_region: "Россия",
  checked_at: "2026-08-25",
};

const model = {
  id: "tcl-65c7k",
  title: "TCL 65C7K",
  diagonal_inches: 65,
  weight_kg: 18,
  width_mm: 1444,
  height_mm: 832,
  vesa_width_mm: 300,
  vesa_height_mm: 300,
  wall_mount_screws: {
    groups: [
      { location: "Верхний ряд", thread: "M6", length_mm: 16, quantity: 2 },
      { location: "Нижний ряд", thread: "M6", length_mm: 12, quantity: 2 },
    ],
    source_url: "https://example.com/model-manual",
    source_label: "Руководство TCL",
    checked_at: "2026-08-25",
  },
  mounting_geometry: {
    vesa_vertical_offset_mm: -20,
    vesa_horizontal_offset_mm: 0,
    evidence,
  },
};

const mount = {
  id: "kromax-atlantis-65",
  brand: "KROMAX",
  model: "ATLANTIS-65",
  title: "KROMAX ATLANTIS-65",
  mechanism: "full-motion",
  min_diagonal_in: 40,
  max_diagonal_in: 90,
  max_load_kg: 45,
  vesa: ["300x300"],
  wall_distance_min_mm: 60,
  wall_distance_max_mm: 500,
  source_url: "https://example.com/mount",
  source_label: "Карточка KROMAX",
  checked_at: "2026-08-25",
  technical_details: {
    maximum_extension_mm: 500,
    maximum_down_tilt_degrees: 12,
    maximum_up_tilt_degrees: 2,
    wall_plate_reference_offset_mm: 35,
    evidence,
  },
};

const modelPortPassport = {
  model_id: "tcl-65c7k",
  ports: [
    { kind: "hdmi", label: "HDMI 1", position: "rear", direction: "rearward" },
  ],
  evidence,
};

const wallFixingRecommendation = {
  id: "verified-test-system",
  system_id: "test-anchor",
  mount_id: "kromax-atlantis-65",
  wall_profile: "concrete",
  fastener_title: "Проверенный анкер",
  quantity: 4,
  anchor_diameter_mm: 10,
  anchor_length_mm: 95,
  drill_diameter_mm: 10,
  supported_load_kg: 120,
  evidence,
};

const values = {
  model,
  mount,
  requestedMechanism: "full-motion",
  wallProfile: "concrete",
  placement: {
    eye_height_cm: 105,
    viewing_distance_cm: 280,
    viewing_angle_degrees: 0,
    furniture_height_cm: 55,
    furniture_clearance_cm: 10,
    desired_turn_degrees: 25,
    safety_clearance_cm: 3,
  },
  cables: {
    routing: "open",
    connections: ["power", "hdmi"],
    spare_length_cm: 30,
    connectorClearance: {
      connectionKind: "hdmi",
      requiredClearanceMm: 35,
    },
  },
  modelPortPassport,
  wallFixingRecommendation,
};

test("the browser adapter emits the exact Rust input contract", () => {
  const input = buildInstallationKitInput(values);

  assert.deepEqual(input.model.screw_groups, model.wall_mount_screws.groups);
  assert.equal(input.model.width_cm, 144.4);
  assert.equal(input.model.height_cm, 83.2);
  assert.equal(input.model.vesa_vertical_offset_cm, -2);
  assert.deepEqual(input.model.port_sides, ["rear"]);
  assert.deepEqual(input.model.ports, [{
    kind: "hdmi",
    position: "rear",
    direction: "rearward",
  }]);
  assert.equal(input.mount.market_url, null);
  assert.equal(input.mount.reward_rub_snapshot, null);
  assert.equal(input.mount_details.maximum_extension_cm, 50);
  assert.equal(input.mount_details.wall_plate_reference_offset_cm, 3.5);
  assert.equal(input.wall_fixing.system_id, "test-anchor");
  assert.deepEqual(input.placement, values.placement);
  assert.deepEqual(input.cables, {
    routing: "open",
    connections: ["power", "hdmi"],
    spare_length_cm: 30,
    connector_clearance: {
      connection_kind: "hdmi",
      port_direction: "rearward",
      required_clearance_mm: 35,
      fact_source: "passport",
    },
  });
});

test("missing secondary evidence stays null instead of being guessed", () => {
  const input = buildInstallationKitInput({
    ...values,
    model: { ...model, wall_mount_screws: undefined, mounting_geometry: undefined },
    mount: { ...mount, technical_details: undefined },
    modelPortPassport: null,
    wallFixingRecommendation: null,
  });

  assert.deepEqual(input.model.screw_groups, []);
  assert.equal(input.model.screw_evidence, null);
  assert.equal(input.model.vesa_vertical_offset_cm, null);
  assert.deepEqual(input.model.port_sides, []);
  assert.deepEqual(input.model.ports, []);
  assert.equal(input.model.port_evidence, null);
  assert.equal(input.mount_details, null);
  assert.equal(input.wall_fixing, null);
});

test("invalid port evidence cannot enter the Rust model contract", () => {
  const input = buildInstallationKitInput({
    ...values,
    modelPortPassport: {
      ...modelPortPassport,
      evidence: { ...evidence, source_url: "http://example.com/manual" },
    },
  });

  assert.deepEqual(input.model.ports, []);
  assert.equal(input.model.port_evidence, null);
  assert.deepEqual(input.cables.connector_clearance, {
    connection_kind: "hdmi",
    port_direction: "unknown",
    required_clearance_mm: 35,
    fact_source: "unknown",
  });
});

test("an explicit direction is recorded as a user fact instead of a passport guess", () => {
  const input = buildInstallationKitInput({
    ...values,
    cables: {
      ...values.cables,
      connectorClearance: {
        connectionKind: "hdmi",
        portDirection: "downward",
        requiredClearanceMm: null,
      },
    },
  });

  assert.deepEqual(input.cables.connector_clearance, {
    connection_kind: "hdmi",
    port_direction: "downward",
    required_clearance_mm: null,
    fact_source: "user",
  });
});

test("engine response preserves section statuses and error envelopes fail closed", async () => {
  let received = null;
  const engine = {
    build_installation_kit_json(serialized) {
      received = JSON.parse(serialized);
      return JSON.stringify({
        schema_version: "1.0",
        overall_status: "needs-check",
        compatibility: { status: "verified" },
        screws: { status: "verified" },
        wall_fixing: { status: "needs-check" },
        placement: { status: "verified" },
        cables: { status: "needs-check" },
        tools: { status: "needs-check" },
        checklist: { status: "needs-check" },
      });
    },
  };

  const result = await buildInstallationKitWithEngine(engine, values);
  assert.equal(received.model.id, "tcl-65c7k");
  assert.equal(result.compatibility.status, "verified");
  assert.equal(result.wall_fixing.status, "needs-check");
  assert.equal(result.placement.status, "verified");

  await assert.rejects(
    buildInstallationKitWithEngine(
      { build_installation_kit_json: () => JSON.stringify({ error: "Нет данных" }) },
      values,
    ),
    /Нет данных/u,
  );
});
