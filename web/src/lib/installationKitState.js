const SAFE_ID = /^[a-z0-9][a-z0-9-]{2,79}$/u;

const WALL_PROFILES = new Set([
  "concrete",
  "solid-brick",
  "hollow-block",
  "aerated-block",
  "drywall-with-blocking",
  "drywall-without-blocking",
  "unknown",
]);

const MECHANISMS = new Set(["fixed", "tilt", "full-motion"]);
const CABLE_ROUTING = new Set(["open", "hidden", "unknown"]);
const CABLE_CONNECTIONS = new Set([
  "power",
  "hdmi",
  "ethernet",
  "antenna",
  "optical",
  "usb",
]);
const PORT_DIRECTIONS = new Set(["sideways", "downward", "rearward", "unknown"]);
const CLEARANCE_FACT_SOURCES = new Set(["passport", "user", "unknown"]);
const INVALID_CABLES = Symbol("invalid-cables");

export const initialInstallationKitState = Object.freeze({
  step: 1,
  brand: "",
  modelId: null,
  wallProfile: null,
  mechanism: null,
  mountId: null,
  placement: null,
  cables: null,
  revision: 0,
});

function freshState(overrides = {}) {
  return { ...initialInstallationKitState, ...overrides };
}

function safeId(value) {
  return typeof value === "string" && SAFE_ID.test(value) ? value : null;
}

function finiteInRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validPlacement(value) {
  return Boolean(
    value
    && finiteInRange(value.eye_height_cm, 50, 220)
    && finiteInRange(value.viewing_distance_cm, 30, 1_000)
    && finiteInRange(value.viewing_angle_degrees, -30, 30)
    && finiteInRange(value.furniture_height_cm, 0, 200)
    && finiteInRange(value.furniture_clearance_cm, 0, 100)
    && finiteInRange(value.desired_turn_degrees, 0, 90)
    && finiteInRange(value.safety_clearance_cm, 0, 50)
  );
}

function validCables(value) {
  return Boolean(
    value
    && CABLE_ROUTING.has(value.routing)
    && Array.isArray(value.connections)
    && value.connections.every((item) => CABLE_CONNECTIONS.has(item))
    && finiteInRange(value.spare_length_cm, 0, 500)
    && validConnectorClearance(value.connectorClearance, value.connections)
  );
}

function validConnectorClearance(value, connections) {
  if (value === null || value === undefined) return true;
  return Boolean(
    value
    && typeof value === "object"
    && CABLE_CONNECTIONS.has(value.connectionKind)
    && connections.includes(value.connectionKind)
    && PORT_DIRECTIONS.has(value.portDirection)
    && CLEARANCE_FACT_SOURCES.has(value.factSource)
    && (
      value.requiredClearanceMm === null
      || finiteInRange(value.requiredClearanceMm, 1, 200)
    )
  );
}

function normalizeCables(value) {
  if (!value || !Array.isArray(value.connections)) return INVALID_CABLES;
  const connections = [...new Set(value.connections)];
  const candidate = {
    routing: value.routing,
    connections,
    spare_length_cm: value.spare_length_cm,
    connectorClearance: value.connectorClearance ?? null,
  };
  return validCables(candidate) ? candidate : INVALID_CABLES;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function installationKitModelIdFromSearch(search) {
  if (typeof search !== "string") return null;
  try {
    return safeId(new URLSearchParams(search).get("model"));
  } catch {
    return null;
  }
}

export function createInstallationKitState({ model } = {}) {
  const modelId = safeId(model?.id);
  const brand = typeof model?.brand === "string" ? model.brand.trim() : "";
  if (!modelId || !brand) return freshState();
  return freshState({ step: 2, brand, modelId });
}

export function canAdvance(state) {
  switch (state.step) {
    case 1:
      return typeof state.brand === "string" && state.brand.trim().length > 0;
    case 2:
      return Boolean(safeId(state.modelId));
    case 3:
      return WALL_PROFILES.has(state.wallProfile);
    case 4:
      return MECHANISMS.has(state.mechanism);
    case 5:
      return Boolean(safeId(state.mountId));
    case 6:
      return validPlacement(state.placement) && validCables(state.cables);
    default:
      return false;
  }
}

export function getCompletedSteps(state) {
  const complete = [];
  for (let step = 1; step <= 6; step += 1) {
    if (!canAdvance({ ...state, step })) break;
    complete.push(step);
  }
  return complete;
}

function revise(state, next) {
  if (sameValue(state, next)) return state;
  return { ...next, revision: state.revision + 1 };
}

export function installationKitReducer(state, action) {
  const current = state ?? freshState();
  switch (action?.type) {
    case "set-brand": {
      const brand = typeof action.value === "string" ? action.value.trim() : "";
      if (brand === current.brand) return current;
      return revise(current, freshState({ brand }));
    }
    case "set-model": {
      const modelId = safeId(action.value);
      if (modelId === current.modelId) return current;
      return revise(current, freshState({
        step: Math.min(current.step, 2),
        brand: current.brand,
        modelId,
      }));
    }
    case "set-wall-profile": {
      const wallProfile = WALL_PROFILES.has(action.value) ? action.value : null;
      if (wallProfile === current.wallProfile) return current;
      return revise(current, freshState({
        step: Math.min(current.step, 3),
        brand: current.brand,
        modelId: current.modelId,
        wallProfile,
      }));
    }
    case "set-mechanism": {
      const mechanism = MECHANISMS.has(action.value) ? action.value : null;
      if (mechanism === current.mechanism) return current;
      return revise(current, freshState({
        step: Math.min(current.step, 4),
        brand: current.brand,
        modelId: current.modelId,
        wallProfile: current.wallProfile,
        mechanism,
      }));
    }
    case "set-mount": {
      const mountId = safeId(action.value);
      if (mountId === current.mountId) return current;
      return revise(current, freshState({
        step: Math.min(current.step, 5),
        brand: current.brand,
        modelId: current.modelId,
        wallProfile: current.wallProfile,
        mechanism: current.mechanism,
        mountId,
      }));
    }
    case "set-placement": {
      if (sameValue(action.value, current.placement)) return current;
      return { ...current, placement: action.value, revision: current.revision + 1 };
    }
    case "set-cables": {
      const connectionsChanged = current.cables
        && Array.isArray(action.value?.connections)
        && !sameValue(current.cables.connections, action.value.connections);
      const candidate = connectionsChanged
        ? { ...action.value, connectorClearance: null }
        : action.value;
      let cables = normalizeCables(candidate);
      if (cables === INVALID_CABLES) cables = null;
      if (sameValue(cables, current.cables)) return current;
      return { ...current, cables, revision: current.revision + 1 };
    }
    case "advance":
      return canAdvance(current) && current.step < 6
        ? { ...current, step: current.step + 1 }
        : current;
    case "back":
      return current.step > 1 ? { ...current, step: current.step - 1 } : current;
    case "go-to-step": {
      const step = Number(action.value);
      return Number.isInteger(step) && step >= 1 && step <= current.step
        ? { ...current, step }
        : current;
    }
    case "reset":
      return freshState();
    default:
      return current;
  }
}
