const STATUS_VALUES = new Set(["pilot", "growing", "complete"]);
const DEMAND_STATUS_VALUES = new Set(["not-measured", "measured"]);

export const FULL_CATALOG_FLOORS = Object.freeze({
  verifiedModels: 50,
  brands: 5,
  series: 10,
  targetModels: 50,
  requiredDiagonalsInches: Object.freeze([32, 43, 50, 55, 65, 75]),
  requiredModelYears: Object.freeze([2024, 2025, 2026]),
  targetCoveragePercent: 100,
});

export class CatalogCoverageError extends Error {
  constructor(issues) {
    super(`Catalog coverage validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "CatalogCoverageError";
    this.issues = issues;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(issues, location, message) {
  issues.push(`${location}: ${message}`);
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function sortedNumbers(values) {
  return unique(values).sort((left, right) => left - right);
}

function sortedStrings(values) {
  return unique(values).sort((left, right) => left.localeCompare(right, "ru"));
}

function hasEvery(haystack, needles) {
  const values = new Set(haystack);
  return needles.every((value) => values.has(value));
}

function validateFloor(value, floor, location, issues) {
  if (!Number.isInteger(value) || value < floor) {
    add(issues, location, `must be an integer not lower than the non-demo floor ${floor}`);
  }
}

function validateRequiredNumberSet(value, required, location, issues) {
  if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item) || item <= 0)) {
    add(issues, location, "must be an array of positive integers");
    return;
  }
  if (unique(value).length !== value.length) {
    add(issues, location, "must not contain duplicates");
  }
  if (!hasEvery(value, required)) {
    add(issues, location, `must include the non-demo dimensions: ${required.join(", ")}`);
  }
}

function validateCatalogCoverageRows(rows, catalogModels, issues) {
  if (!Array.isArray(rows)) {
    add(issues, "catalog_models", "must be an array");
    return [];
  }

  const catalogById = new Map(catalogModels.map((model) => [model.id, model]));
  const seen = new Set();

  rows.forEach((row, index) => {
    const location = `catalog_models[${index}]`;
    if (!isObject(row)) {
      add(issues, location, "must be an object");
      return;
    }
    if (typeof row.model_id !== "string" || !row.model_id.trim()) {
      add(issues, `${location}.model_id`, "must be a non-empty string");
      return;
    }
    if (seen.has(row.model_id)) add(issues, `${location}.model_id`, "must be unique");
    seen.add(row.model_id);

    const catalogModel = catalogById.get(row.model_id);
    if (!catalogModel) {
      add(issues, `${location}.model_id`, `unknown catalog model ${row.model_id}`);
      return;
    }
    if (row.brand !== catalogModel.brand) {
      add(issues, `${location}.brand`, `must equal catalog brand ${catalogModel.brand}`);
    }
    if (row.diagonal_inches !== catalogModel.diagonal_inches) {
      add(
        issues,
        `${location}.diagonal_inches`,
        `must equal catalog diagonal ${catalogModel.diagonal_inches}`,
      );
    }
    if (row.catalog_source_url !== catalogModel.source_url) {
      add(issues, `${location}.catalog_source_url`, "must equal the model's catalog source URL");
    }
    if (typeof row.series !== "string" || !row.series.trim()) {
      add(issues, `${location}.series`, "must be a non-empty verified series");
    }
    if (row.model_year !== null && (
      !Number.isInteger(row.model_year) || row.model_year < 2000 || row.model_year > 2100
    )) {
      add(issues, `${location}.model_year`, "must be null or a four-digit sourced product year");
    }
    if (!isHttpsUrl(row.dimension_source_url)) {
      add(issues, `${location}.dimension_source_url`, "must be a credential-free HTTPS URL");
    }
    if (typeof row.dimension_source_label !== "string" || !row.dimension_source_label.trim()) {
      add(issues, `${location}.dimension_source_label`, "must be a non-empty source label");
    }
    if (!isIsoDate(row.checked_at)) {
      add(issues, `${location}.checked_at`, "must be a real ISO date");
    }
  });

  for (const model of catalogModels) {
    if (!seen.has(model.id)) {
      add(issues, "catalog_models", `missing coverage dimensions for ${model.id}`);
    }
  }
  if (seen.size !== catalogModels.length) {
    add(
      issues,
      "catalog_models",
      `must map the catalog one-to-one: ${catalogModels.length} source models, ${seen.size} manifest IDs`,
    );
  }

  return rows.filter(isObject);
}

function validateTargetModels(snapshot, issues) {
  if (!Array.isArray(snapshot.target_models)) {
    add(issues, "demand_snapshot.target_models", "must be an array");
    return [];
  }

  const seenIdentities = new Set();
  const seenModelIds = new Set();
  const seenRanks = new Set();
  snapshot.target_models.forEach((row, index) => {
    const location = `demand_snapshot.target_models[${index}]`;
    if (!isObject(row)) {
      add(issues, location, "must be an object");
      return;
    }
    for (const key of ["brand", "model", "series"]) {
      if (typeof row[key] !== "string" || !row[key].trim()) {
        add(issues, `${location}.${key}`, "must be a non-empty string");
      }
    }
    const identity = `${row.brand}\u0000${row.model}`;
    if (seenIdentities.has(identity)) {
      add(issues, `${location}.model`, "brand and exact model identity must be unique");
    }
    seenIdentities.add(identity);
    if (typeof row.catalog_verified !== "boolean") {
      add(issues, `${location}.catalog_verified`, "must be boolean");
    }
    if (row.catalog_verified === true) {
      if (typeof row.model_id !== "string" || !row.model_id.trim()) {
        add(issues, `${location}.model_id`, "must be a non-empty string when verified");
      } else {
        if (seenModelIds.has(row.model_id)) {
          add(issues, `${location}.model_id`, "must be unique");
        }
        seenModelIds.add(row.model_id);
      }
      if (!Number.isInteger(row.model_year) || row.model_year < 2000 || row.model_year > 2100) {
        add(issues, `${location}.model_year`, "must be a four-digit product year when verified");
      }
      if (!isHttpsUrl(row.model_source_url)) {
        add(issues, `${location}.model_source_url`, "must be a credential-free HTTPS URL when verified");
      }
      if (typeof row.model_source_label !== "string" || !row.model_source_label.trim()) {
        add(issues, `${location}.model_source_label`, "must be a non-empty source label when verified");
      }
      if (!isIsoDate(row.model_checked_at)) {
        add(issues, `${location}.model_checked_at`, "must be a real ISO date when verified");
      }
    } else if (row.catalog_verified === false) {
      for (const key of ["model_id", "model_year", "model_source_url", "model_source_label", "model_checked_at"]) {
        if (row[key] !== null) {
          add(issues, `${location}.${key}`, "must be null until the exact model is verified");
        }
      }
    }
    if (!Number.isInteger(row.demand_rank) || row.demand_rank <= 0) {
      add(issues, `${location}.demand_rank`, "must be a positive integer");
    } else if (seenRanks.has(row.demand_rank)) {
      add(issues, `${location}.demand_rank`, "must be unique");
    }
    seenRanks.add(row.demand_rank);
    if (!Number.isInteger(row.diagonal_inches) || row.diagonal_inches <= 0) {
      add(issues, `${location}.diagonal_inches`, "must be a positive whole-inch diagonal");
    }
    if (!Number.isInteger(row.monthly_exact_searches) || row.monthly_exact_searches <= 0) {
      add(issues, `${location}.monthly_exact_searches`, "must be a positive integer");
    }
    if (typeof row.operator_query !== "string" || !row.operator_query.trim()) {
      add(issues, `${location}.operator_query`, "must be the non-empty measured query");
    }
  });

  const ranked = [...snapshot.target_models]
    .filter((row) => isObject(row) && Number.isInteger(row.demand_rank))
    .sort((left, right) => left.demand_rank - right.demand_rank);
  ranked.forEach((row, index) => {
    if (row.demand_rank !== index + 1) {
      add(issues, "demand_snapshot.target_models", "demand ranks must be contiguous from 1");
    }
    const previous = ranked[index - 1];
    if (previous && previous.monthly_exact_searches < row.monthly_exact_searches) {
      add(
        issues,
        "demand_snapshot.target_models",
        "monthly exact searches must not increase as demand rank decreases",
      );
    }
  });

  return snapshot.target_models;
}

function validateDemandSnapshot(snapshot, issues) {
  if (!isObject(snapshot)) {
    add(issues, "demand_snapshot", "must be an object");
    return [];
  }
  if (!DEMAND_STATUS_VALUES.has(snapshot.status)) {
    add(issues, "demand_snapshot.status", "must be not-measured or measured");
  }
  const targetModels = validateTargetModels(snapshot, issues);

  if (snapshot.status === "not-measured") {
    if (targetModels.length !== 0) {
      add(issues, "demand_snapshot.target_models", "must be empty until demand is measured");
    }
    for (const key of ["source_url", "source_label", "checked_at"]) {
      if (snapshot[key] !== null) {
        add(issues, `demand_snapshot.${key}`, "must be null while status is not-measured");
      }
    }
  }

  if (snapshot.status === "measured") {
    if (!isHttpsUrl(snapshot.source_url)) {
      add(issues, "demand_snapshot.source_url", "must be a credential-free HTTPS URL");
    }
    if (typeof snapshot.source_label !== "string" || !snapshot.source_label.trim()) {
      add(issues, "demand_snapshot.source_label", "must be a non-empty source label");
    }
    if (!isIsoDate(snapshot.checked_at)) {
      add(issues, "demand_snapshot.checked_at", "must be a real ISO date");
    }
    if (typeof snapshot.batch_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(snapshot.batch_sha256)) {
      add(issues, "demand_snapshot.batch_sha256", "must be a lowercase SHA-256 digest");
    }
    if (!Number.isInteger(snapshot.region_id) || snapshot.region_id <= 0) {
      add(issues, "demand_snapshot.region_id", "must be a positive region identifier");
    }
    for (const key of ["period", "devices"]) {
      if (typeof snapshot[key] !== "string" || !snapshot[key].trim()) {
        add(issues, `demand_snapshot.${key}`, "must be a non-empty measurement dimension");
      }
    }
    if (snapshot.selection_rule !== "top-positive-exact-demand") {
      add(
        issues,
        "demand_snapshot.selection_rule",
        "must equal top-positive-exact-demand",
      );
    }
    if (!Number.isInteger(snapshot.candidate_pool_size) || snapshot.candidate_pool_size < targetModels.length) {
      add(
        issues,
        "demand_snapshot.candidate_pool_size",
        "must be an integer not smaller than the selected target",
      );
    }
    if (!Number.isInteger(snapshot.target_limit) || snapshot.target_limit <= 0) {
      add(issues, "demand_snapshot.target_limit", "must be a positive integer");
    } else if (targetModels.length !== Math.min(snapshot.target_limit, snapshot.candidate_pool_size)) {
      add(
        issues,
        "demand_snapshot.target_models",
        "must contain the full target limit or the whole positive candidate pool",
      );
    }
  }

  return targetModels;
}

export function validateCoverageManifest(manifest, catalogModels) {
  const issues = [];
  if (!isObject(manifest)) throw new CatalogCoverageError(["manifest: must be an object"]);
  if (!Array.isArray(catalogModels)) {
    throw new CatalogCoverageError(["catalog: models must be an array"]);
  }

  if (manifest.schema_version !== 2) add(issues, "schema_version", "must equal 2");
  if (manifest.market !== "RU") add(issues, "market", "must equal RU");
  if (!STATUS_VALUES.has(manifest.catalog_status)) {
    add(issues, "catalog_status", "must be pilot, growing, or complete");
  }
  if (typeof manifest.full_catalog_claim !== "boolean") {
    add(issues, "full_catalog_claim", "must be boolean");
  }
  if (!isIsoDate(manifest.updated_at)) add(issues, "updated_at", "must be a real ISO date");
  if (!isObject(manifest.definition)) {
    add(issues, "definition", "must be an object");
  } else {
    if (manifest.definition.popular_models_basis !== "measured-exact-search-demand") {
      add(
        issues,
        "definition.popular_models_basis",
        "must equal measured-exact-search-demand",
      );
    }
    if (
      typeof manifest.definition.measurement_rule_ru !== "string" ||
      !manifest.definition.measurement_rule_ru.trim()
    ) {
      add(issues, "definition.measurement_rule_ru", "must explain the demand rule in Russian");
    }
  }

  const gate = manifest.completion_gate;
  if (!isObject(gate)) {
    add(issues, "completion_gate", "must be an object");
  } else {
    validateFloor(
      gate.minimum_verified_models,
      FULL_CATALOG_FLOORS.verifiedModels,
      "completion_gate.minimum_verified_models",
      issues,
    );
    validateFloor(
      gate.minimum_brands,
      FULL_CATALOG_FLOORS.brands,
      "completion_gate.minimum_brands",
      issues,
    );
    validateFloor(
      gate.minimum_series,
      FULL_CATALOG_FLOORS.series,
      "completion_gate.minimum_series",
      issues,
    );
    validateFloor(
      gate.minimum_target_models,
      FULL_CATALOG_FLOORS.targetModels,
      "completion_gate.minimum_target_models",
      issues,
    );
    validateRequiredNumberSet(
      gate.required_diagonals_inches,
      FULL_CATALOG_FLOORS.requiredDiagonalsInches,
      "completion_gate.required_diagonals_inches",
      issues,
    );
    validateRequiredNumberSet(
      gate.required_model_years,
      FULL_CATALOG_FLOORS.requiredModelYears,
      "completion_gate.required_model_years",
      issues,
    );
    if (gate.required_target_coverage_percent !== FULL_CATALOG_FLOORS.targetCoveragePercent) {
      add(
        issues,
        "completion_gate.required_target_coverage_percent",
        `must equal ${FULL_CATALOG_FLOORS.targetCoveragePercent}`,
      );
    }
  }

  const rows = validateCatalogCoverageRows(manifest.catalog_models, catalogModels, issues);
  const targetModels = validateDemandSnapshot(manifest.demand_snapshot, issues);
  if (
    isObject(gate) &&
    manifest.demand_snapshot?.status === "measured" &&
    manifest.demand_snapshot.target_limit !== gate.minimum_target_models
  ) {
    add(
      issues,
      "demand_snapshot.target_limit",
      "must equal completion_gate.minimum_target_models",
    );
  }

  const actual = {
    verified_models: rows.length,
    brands: sortedStrings(rows.map((row) => row.brand).filter(Boolean)),
    series: sortedStrings(rows.map((row) => row.series).filter(Boolean)),
    diagonals_inches: sortedNumbers(
      rows.map((row) => row.diagonal_inches).filter((value) => Number.isFinite(value)),
    ),
    model_years: sortedNumbers(
      rows.map((row) => row.model_year).filter((value) => Number.isFinite(value)),
    ),
  };
  const catalogIds = new Set(catalogModels.map((model) => model.id));
  const catalogByIdentity = new Map(
    catalogModels.map((model) => [`${model.brand}\u0000${model.model}`, model]),
  );
  const coveredTargetModels = targetModels.filter(
    (model) => model.catalog_verified === true && catalogIds.has(model.model_id),
  );
  const coverageById = new Map(rows.map((row) => [row.model_id, row]));
  const catalogById = new Map(catalogModels.map((model) => [model.id, model]));
  for (const targetModel of targetModels) {
    const catalogIdentity = catalogByIdentity.get(`${targetModel.brand}\u0000${targetModel.model}`);
    if (catalogIdentity && targetModel.catalog_verified !== true) {
      add(
        issues,
        `demand_snapshot.target_models.${targetModel.brand}.${targetModel.model}`,
        "must be marked verified because the exact identity exists in the catalog",
      );
    }
    if (
      targetModel.catalog_verified === true &&
      (!catalogIdentity || catalogIdentity.id !== targetModel.model_id)
    ) {
      add(
        issues,
        `demand_snapshot.target_models.${targetModel.brand}.${targetModel.model}`,
        "verified target must resolve to the same exact catalog identity",
      );
    }
  }
  for (const targetModel of coveredTargetModels) {
    const coverage = coverageById.get(targetModel.model_id);
    const catalogModel = catalogById.get(targetModel.model_id);
    if (
      !coverage ||
      !catalogModel ||
      targetModel.brand !== catalogModel.brand ||
      targetModel.model !== catalogModel.model ||
      targetModel.series !== coverage.series ||
      targetModel.diagonal_inches !== catalogModel.diagonal_inches ||
      targetModel.model_year !== coverage.model_year
    ) {
      add(
        issues,
        `demand_snapshot.target_models.${targetModel.model_id}`,
        "must match the exact catalog brand, model, series, diagonal and model year",
      );
    }
  }
  const targetCoveragePercent =
    targetModels.length === 0 ? null : (coveredTargetModels.length / targetModels.length) * 100;
  const missingTargetModels = targetModels.filter(
    (model) => model.catalog_verified !== true || !catalogIds.has(model.model_id),
  );

  const blockers = [];
  if (isObject(gate)) {
    if (actual.verified_models < gate.minimum_verified_models) {
      blockers.push(
        `verified models ${actual.verified_models}/${gate.minimum_verified_models}`,
      );
    }
    if (actual.brands.length < gate.minimum_brands) {
      blockers.push(`brands ${actual.brands.length}/${gate.minimum_brands}`);
    }
    if (actual.series.length < gate.minimum_series) {
      blockers.push(`series ${actual.series.length}/${gate.minimum_series}`);
    }
    const requiredDiagonals = Array.isArray(gate.required_diagonals_inches)
      ? gate.required_diagonals_inches
      : [];
    const missingDiagonals = requiredDiagonals.filter(
      (value) => !actual.diagonals_inches.includes(value),
    );
    if (missingDiagonals.length > 0) blockers.push(`missing diagonals ${missingDiagonals.join(", ")}`);
    const requiredYears = Array.isArray(gate.required_model_years)
      ? gate.required_model_years
      : [];
    const missingYears = requiredYears.filter(
      (value) => !actual.model_years.includes(value),
    );
    if (missingYears.length > 0) blockers.push(`missing model years ${missingYears.join(", ")}`);
    if (manifest.demand_snapshot?.status !== "measured") {
      blockers.push("exact-search demand is not measured");
    }
    if (targetModels.length < gate.minimum_target_models) {
      blockers.push(`demand-ranked target models ${targetModels.length}/${gate.minimum_target_models}`);
    }
    if (
      targetCoveragePercent === null ||
      targetCoveragePercent < gate.required_target_coverage_percent
    ) {
      blockers.push(
        `target coverage ${targetCoveragePercent === null ? "unknown" : `${targetCoveragePercent.toFixed(1)}%`}/${gate.required_target_coverage_percent}%`,
      );
    }
    if (missingTargetModels.length > 0) {
      const examples = missingTargetModels
        .slice(0, 8)
        .map((row) => `${row.brand} ${row.model}`)
        .join(", ");
      blockers.push(
        `unverified top-demand models ${examples}${missingTargetModels.length > 8 ? ` +${missingTargetModels.length - 8}` : ""}`,
      );
    }
  }

  const fullCatalogReady = issues.length === 0 && blockers.length === 0;
  if (
    (manifest.catalog_status === "complete") !== (manifest.full_catalog_claim === true)
  ) {
    add(
      issues,
      "catalog_status",
      "complete status and full_catalog_claim=true must be set together",
    );
  }
  if ((manifest.catalog_status === "complete" || manifest.full_catalog_claim === true) && !fullCatalogReady) {
    add(issues, "full_catalog_claim", `blocked: ${blockers.join("; ")}`);
  }

  if (issues.length > 0) throw new CatalogCoverageError(issues);
  return {
    catalog_status: manifest.catalog_status,
    full_catalog_claim: manifest.full_catalog_claim,
    full_catalog_ready: fullCatalogReady,
    actual,
    target: {
      demand_status: manifest.demand_snapshot.status,
      models: targetModels.length,
      covered_models: coveredTargetModels.length,
      coverage_percent: targetCoveragePercent,
    },
    blockers,
  };
}

export function formatCoverageReport(summary) {
  const readiness = summary.full_catalog_ready ? "YES" : "NO";
  return [
    `Catalog coverage: status=${summary.catalog_status}; full catalog ready=${readiness}`,
    `Verified models=${summary.actual.verified_models}; brands=${summary.actual.brands.length} (${summary.actual.brands.join(", ") || "none"}); series=${summary.actual.series.length} (${summary.actual.series.join(", ") || "none"})`,
    `Diagonals=${summary.actual.diagonals_inches.join(", ") || "none"}; model years=${summary.actual.model_years.join(", ") || "none"}`,
    `Demand target=${summary.target.models}; covered=${summary.target.covered_models}; coverage=${summary.target.coverage_percent === null ? "unknown" : `${summary.target.coverage_percent.toFixed(1)}%`}`,
    ...(summary.blockers.length > 0 ? [`Full-claim blockers: ${summary.blockers.join("; ")}`] : []),
  ].join("\n");
}
