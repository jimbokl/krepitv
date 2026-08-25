#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE_FIELDS = [
  "source_url",
  "source_title",
  "source_publisher",
  "source_region",
  "checked_at",
];
const WALL_PROFILES = new Set([
  "concrete",
  "solid-brick",
  "hollow-block",
  "aerated-block",
  "drywall-with-blocking",
  "drywall-without-blocking",
]);
const CONNECTION_KINDS = new Set([
  "power",
  "hdmi",
  "ethernet",
  "antenna",
  "optical",
  "usb",
]);
const PORT_POSITIONS = new Set(["left", "right", "bottom", "rear", "external-box"]);
const PORT_DIRECTIONS = new Set(["sideways", "downward", "rearward", "detachable"]);
const ROUTING_KINDS = new Set(["open", "hidden"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class InstallationKitDataError extends Error {
  constructor(issues) {
    super(`Installation-kit data validation failed with ${issues.length} issue(s)`);
    this.name = "InstallationKitDataError";
    this.issues = issues;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(issues, location, message) {
  issues.push(`${location}: ${message}`);
}

function exactKeys(value, allowed, location, issues) {
  if (!isObject(value)) {
    add(issues, location, "must be an object");
    return false;
  }
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) add(issues, location, `unknown field ${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) add(issues, location, `missing field ${key}`);
  }
  return true;
}

function optionalExactKeys(value, allowed, location, issues) {
  if (!isObject(value)) {
    add(issues, location, "must be an object");
    return false;
  }
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) add(issues, location, `unknown field ${key}`);
  }
  return true;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateEvidence(value, location, issues, now) {
  if (!exactKeys(value, EVIDENCE_FIELDS, location, issues)) return;

  try {
    const source = new URL(value.source_url);
    if (source.protocol !== "https:") add(issues, location, "must use HTTPS evidence");
  } catch {
    add(issues, location, "source_url must be a valid HTTPS URL");
  }
  for (const field of ["source_title", "source_publisher", "source_region"]) {
    if (!nonEmptyString(value[field])) add(issues, location, `${field} must not be empty`);
  }
  if (!ISO_DATE.test(value.checked_at ?? "")) {
    add(issues, location, "checked_at must use YYYY-MM-DD");
    return;
  }
  const checkedAt = new Date(`${value.checked_at}T00:00:00Z`);
  if (Number.isNaN(checkedAt.valueOf())) {
    add(issues, location, "checked_at must be a valid date");
    return;
  }
  if (checkedAt.valueOf() > now.valueOf()) {
    add(issues, location, "checked_at cannot be in the future");
  }
  const ageDays = (now.valueOf() - checkedAt.valueOf()) / 86_400_000;
  if (ageDays > 1095) add(issues, location, "evidence is older than three years");
}

function validateUniqueIds(rows, location, issues) {
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    const id = row?.id;
    if (!nonEmptyString(id)) {
      add(issues, `${location}[${index}]`, "id must not be empty");
    } else if (seen.has(id)) {
      add(issues, `${location}[${index}]`, `duplicate id ${id}`);
    } else {
      seen.add(id);
    }
  }
}

function validateWallFixingSystems(data, mountsById, issues, now) {
  if (!exactKeys(data, ["schema_version", "systems", "exact_recommendations"], "wall_fixing_systems", issues)) return;
  if (data.schema_version !== 1) add(issues, "wall_fixing_systems", "schema_version must equal 1");
  if (!Array.isArray(data.systems)) {
    add(issues, "wall_fixing_systems.systems", "must be an array");
    return;
  }
  if (!Array.isArray(data.exact_recommendations)) {
    add(issues, "wall_fixing_systems.exact_recommendations", "must be an array");
    return;
  }
  validateUniqueIds(data.systems, "systems", issues);
  validateUniqueIds(data.exact_recommendations, "exact_recommendations", issues);
  const systemsById = new Map();

  for (const [index, system] of data.systems.entries()) {
    const location = `systems[${index}]`;
    if (!exactKeys(system, [
      "id",
      "manufacturer",
      "product_title",
      "allowed_wall_profiles",
      "scope",
      "limitations",
      "evidence",
    ], location, issues)) continue;
    systemsById.set(system.id, system);
    if (!nonEmptyString(system.manufacturer)) add(issues, location, "manufacturer must not be empty");
    if (!nonEmptyString(system.product_title)) add(issues, location, "product_title must not be empty");
    if (system.scope !== "class-only") add(issues, location, "scope must be class-only");
    if (!Array.isArray(system.allowed_wall_profiles) || system.allowed_wall_profiles.length === 0) {
      add(issues, location, "allowed_wall_profiles must be a non-empty array");
    } else {
      const unique = new Set(system.allowed_wall_profiles);
      if (unique.size !== system.allowed_wall_profiles.length) add(issues, location, "allowed_wall_profiles must be unique");
      for (const profile of system.allowed_wall_profiles) {
        if (!WALL_PROFILES.has(profile)) add(issues, location, `unknown wall profile ${profile}`);
      }
    }
    if (!Array.isArray(system.limitations) || system.limitations.length === 0 || system.limitations.some((item) => !nonEmptyString(item))) {
      add(issues, location, "limitations must contain explicit boundaries");
    }
    validateEvidence(system.evidence, `${location}.evidence`, issues, now);
  }

  for (const [index, recommendation] of data.exact_recommendations.entries()) {
    const location = `exact_recommendations[${index}]`;
    const fields = [
      "id",
      "system_id",
      "mount_id",
      "wall_profile",
      "minimum_base_thickness_mm",
      "fastener_title",
      "quantity",
      "anchor_diameter_mm",
      "anchor_length_mm",
      "drill_diameter_mm",
      "supported_load_kg",
      "evidence",
    ];
    if (!exactKeys(recommendation, fields, location, issues)) continue;
    const system = systemsById.get(recommendation.system_id);
    if (!system) add(issues, location, `unknown fixing system ${recommendation.system_id}`);
    if (!WALL_PROFILES.has(recommendation.wall_profile)) add(issues, location, `unknown wall profile ${recommendation.wall_profile}`);
    if (system && !system.allowed_wall_profiles.includes(recommendation.wall_profile)) {
      add(issues, location, "wall profile is outside the sourced system scope");
    }
    const mount = mountsById.get(recommendation.mount_id);
    if (!mount) {
      add(issues, location, `unknown catalog mount ${recommendation.mount_id}`);
    } else {
      const details = mount.technical_details;
      const plate = details?.wall_plate;
      const completePlate =
        positiveNumber(plate?.width_mm) &&
        positiveNumber(plate?.height_mm) &&
        Array.isArray(plate?.hole_coordinates_mm) &&
        plate.hole_coordinates_mm.length >= 2 &&
        plate.hole_coordinates_mm.every(
          (point) =>
            typeof point?.x_mm === "number" &&
            Number.isFinite(point.x_mm) &&
            typeof point?.y_mm === "number" &&
            Number.isFinite(point.y_mm),
        );
      if (!positiveNumber(details?.mount_mass_kg) || !completePlate) {
        add(issues, location, "requires sourced mount mass and complete wall-plate geometry");
      }
    }
    for (const field of [
      "minimum_base_thickness_mm",
      "anchor_diameter_mm",
      "anchor_length_mm",
      "drill_diameter_mm",
      "supported_load_kg",
    ]) {
      if (!positiveNumber(recommendation[field])) add(issues, location, `${field} must be positive`);
    }
    if (!Number.isInteger(recommendation.quantity) || recommendation.quantity < 2 || recommendation.quantity > 16) {
      add(issues, location, "quantity must be an integer from 2 to 16");
    }
    if (!nonEmptyString(recommendation.fastener_title)) add(issues, location, "fastener_title must not be empty");
    validateEvidence(recommendation.evidence, `${location}.evidence`, issues, now);
  }
}

function validateModelPorts(data, modelsById, issues, now) {
  if (!exactKeys(data, ["schema_version", "models"], "model_ports", issues)) return;
  if (data.schema_version !== 1) add(issues, "model_ports", "schema_version must equal 1");
  if (!Array.isArray(data.models)) {
    add(issues, "model_ports.models", "must be an array");
    return;
  }
  const seenModels = new Set();
  for (const [index, passport] of data.models.entries()) {
    const location = `model_ports.models[${index}]`;
    if (!exactKeys(passport, ["model_id", "ports", "evidence"], location, issues)) continue;
    if (!modelsById.has(passport.model_id)) add(issues, location, `unknown catalog model ${passport.model_id}`);
    if (seenModels.has(passport.model_id)) add(issues, location, `duplicate model passport ${passport.model_id}`);
    seenModels.add(passport.model_id);
    if (!Array.isArray(passport.ports) || passport.ports.length === 0) {
      add(issues, location, "ports must be a non-empty array");
    } else {
      for (const [portIndex, port] of passport.ports.entries()) {
        const portLocation = `${location}.ports[${portIndex}]`;
        if (!optionalExactKeys(port, ["kind", "label", "position", "direction"], portLocation, issues)) continue;
        for (const required of ["kind", "position", "direction"]) {
          if (!(required in port)) add(issues, portLocation, `missing field ${required}`);
        }
        if (!CONNECTION_KINDS.has(port.kind)) add(issues, portLocation, `unknown port kind ${port.kind}`);
        if (!PORT_POSITIONS.has(port.position)) add(issues, portLocation, `unknown port position ${port.position}`);
        if (!PORT_DIRECTIONS.has(port.direction)) add(issues, portLocation, `unknown port direction ${port.direction}`);
      }
    }
    validateEvidence(passport.evidence, `${location}.evidence`, issues, now);
  }
}

function validateConnectionProfiles(data, issues, now) {
  if (!exactKeys(data, ["schema_version", "profiles"], "connection_profiles", issues)) return;
  if (data.schema_version !== 1) add(issues, "connection_profiles", "schema_version must equal 1");
  if (!Array.isArray(data.profiles)) {
    add(issues, "connection_profiles.profiles", "must be an array");
    return;
  }
  validateUniqueIds(data.profiles, "connection_profiles.profiles", issues);
  for (const [index, profile] of data.profiles.entries()) {
    const location = `connection_profiles.profiles[${index}]`;
    if (!exactKeys(profile, [
      "id",
      "connection_kind",
      "title",
      "allowed_routing",
      "requirements",
      "warnings",
      "evidence",
    ], location, issues)) continue;
    if (!CONNECTION_KINDS.has(profile.connection_kind)) add(issues, location, `unknown connection kind ${profile.connection_kind}`);
    if (!nonEmptyString(profile.title)) add(issues, location, "title must not be empty");
    if (!Array.isArray(profile.allowed_routing) || profile.allowed_routing.length === 0) {
      add(issues, location, "allowed_routing must be a non-empty array");
    } else {
      const unique = new Set(profile.allowed_routing);
      if (unique.size !== profile.allowed_routing.length) add(issues, location, "allowed_routing must be unique");
      for (const routing of profile.allowed_routing) {
        if (!ROUTING_KINDS.has(routing)) add(issues, location, `unknown routing ${routing}`);
      }
    }
    for (const field of ["requirements", "warnings"]) {
      if (!Array.isArray(profile[field]) || profile[field].length === 0 || profile[field].some((item) => !nonEmptyString(item))) {
        add(issues, location, `${field} must contain explicit text`);
      }
    }
    validateEvidence(profile.evidence, `${location}.evidence`, issues, now);
  }
}

function validateMountTechnicalDetails(mounts, issues, now) {
  for (const [index, mount] of mounts.entries()) {
    if (!("technical_details" in mount)) continue;
    const location = `mounts[${index}].technical_details`;
    const details = mount.technical_details;
    if (!optionalExactKeys(details, [
      "maximum_extension_mm",
      "maximum_down_tilt_degrees",
      "maximum_up_tilt_degrees",
      "total_turn_degrees",
      "mount_mass_kg",
      "wall_plate_reference_offset_mm",
      "wall_plate",
      "evidence",
    ], location, issues)) continue;
    if (!("evidence" in details)) add(issues, location, "missing field evidence");
    validateEvidence(details.evidence, `${location}.evidence`, issues, now);
    for (const field of ["maximum_extension_mm", "mount_mass_kg"]) {
      if (field in details && !positiveNumber(details[field])) add(issues, location, `${field} must be positive`);
    }
    for (const field of ["maximum_down_tilt_degrees", "maximum_up_tilt_degrees", "total_turn_degrees"]) {
      if (field in details && (typeof details[field] !== "number" || !Number.isFinite(details[field]) || details[field] < 0 || details[field] > 360)) {
        add(issues, location, `${field} must be from 0 to 360`);
      }
    }
    if ("wall_plate" in details) {
      const plate = details.wall_plate;
      if (!exactKeys(plate, ["width_mm", "height_mm", "hole_coordinates_mm"], `${location}.wall_plate`, issues)) continue;
      if (!positiveNumber(plate.width_mm) || !positiveNumber(plate.height_mm)) add(issues, `${location}.wall_plate`, "dimensions must be positive");
      if (!Array.isArray(plate.hole_coordinates_mm) || plate.hole_coordinates_mm.length < 2) {
        add(issues, `${location}.wall_plate`, "at least two sourced hole coordinates are required");
      }
    }
  }
}

function uniqueCatalogMap(rows, location, issues) {
  const result = new Map();
  if (!Array.isArray(rows)) {
    add(issues, location, "must be an array");
    return result;
  }
  for (const [index, row] of rows.entries()) {
    if (!nonEmptyString(row?.id)) {
      add(issues, `${location}[${index}]`, "missing catalog id");
    } else if (result.has(row.id)) {
      add(issues, `${location}[${index}]`, `duplicate catalog id ${row.id}`);
    } else {
      result.set(row.id, row);
    }
  }
  return result;
}

export function validateInstallationKitData({
  wallFixingSystems,
  modelPorts,
  connectionProfiles,
  models,
  mounts,
  now = new Date(),
}) {
  const issues = [];
  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new TypeError("now must be a valid Date");
  }
  const modelsById = uniqueCatalogMap(models, "tv_models", issues);
  const mountsById = uniqueCatalogMap(mounts, "mounts", issues);
  validateMountTechnicalDetails(Array.isArray(mounts) ? mounts : [], issues, now);
  validateWallFixingSystems(wallFixingSystems, mountsById, issues, now);
  validateModelPorts(modelPorts, modelsById, issues, now);
  validateConnectionProfiles(connectionProfiles, issues, now);

  if (issues.length > 0) throw new InstallationKitDataError(issues);
  return {
    wall_systems: wallFixingSystems.systems.length,
    exact_wall_recommendations: wallFixingSystems.exact_recommendations.length,
    model_port_passports: modelPorts.models.length,
    connection_profiles: connectionProfiles.profiles.length,
  };
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function main() {
  const [wallFixingSystems, modelPorts, connectionProfiles, models, mounts] =
    await Promise.all([
      readJson("data/wall_fixing_systems.json"),
      readJson("data/model_ports.json"),
      readJson("data/connection_profiles.json"),
      readJson("data/tv_models.json"),
      readJson("data/mounts.json"),
    ]);
  const summary = validateInstallationKitData({
    wallFixingSystems,
    modelPorts,
    connectionProfiles,
    models,
    mounts,
  });
  console.log(
    `Монтажный комплект: ${summary.wall_systems} классов систем, ` +
      `${summary.exact_wall_recommendations} точных схем, ` +
      `${summary.model_port_passports} паспортов портов, ` +
      `${summary.connection_profiles} профиль соединения.`,
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((error) => {
    if (error instanceof InstallationKitDataError) {
      for (const issue of error.issues) console.error(`- ${issue}`);
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  });
}
