function finite(value) {
  return Number.isFinite(value) ? value : null;
}

const PORT_KINDS = new Set(["power", "hdmi", "ethernet", "antenna", "optical", "usb"]);
const PORT_POSITIONS = new Set(["left", "right", "bottom", "rear", "external-box"]);
const PASSPORT_DIRECTIONS = new Set(["sideways", "downward", "rearward", "detachable"]);
const USER_DIRECTIONS = new Set(["sideways", "downward", "rearward", "unknown"]);

function millimetresToCentimetres(value) {
  const number = finite(value);
  return number === null ? null : number / 10;
}

function toRustEvidence(value) {
  if (!value || typeof value !== "object") return null;
  const sourceUrl = value.source_url;
  const sourceLabel = value.source_label ?? value.source_title;
  const checkedAt = value.checked_at;
  if (
    typeof sourceUrl !== "string"
    || !sourceUrl.startsWith("https://")
    || typeof sourceLabel !== "string"
    || !sourceLabel.trim()
    || typeof checkedAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(checkedAt)
  ) {
    return null;
  }
  return {
    source_url: sourceUrl,
    source_label: sourceLabel.trim(),
    checked_at: checkedAt,
  };
}

function buildModel(model, modelPortPassport) {
  const screwEvidence = toRustEvidence(model.wall_mount_screws);
  const geometryEvidence = toRustEvidence(model.mounting_geometry?.evidence);
  const passportEvidence = modelPortPassport?.model_id === model.id
    ? toRustEvidence(modelPortPassport.evidence)
    : null;

  const ports = passportEvidence && Array.isArray(modelPortPassport.ports)
    ? modelPortPassport.ports
        .filter((port) => (
          port
          && PORT_KINDS.has(port.kind)
          && PORT_POSITIONS.has(port.position)
          && PASSPORT_DIRECTIONS.has(port.direction)
        ))
        .map(({ kind, position, direction }) => ({ kind, position, direction }))
    : [];

  return {
    id: model.id,
    title: model.title,
    weight_kg: model.weight_kg,
    diagonal_inches: model.diagonal_inches,
    width_cm: millimetresToCentimetres(model.width_mm),
    height_cm: millimetresToCentimetres(model.height_mm),
    vesa_width_mm: model.vesa_width_mm,
    vesa_height_mm: model.vesa_height_mm,
    vesa_vertical_offset_cm: geometryEvidence
      ? millimetresToCentimetres(model.mounting_geometry.vesa_vertical_offset_mm)
      : null,
    vesa_horizontal_offset_cm: geometryEvidence
      ? millimetresToCentimetres(model.mounting_geometry.vesa_horizontal_offset_mm)
      : null,
    screw_groups: screwEvidence && Array.isArray(model.wall_mount_screws.groups)
      ? model.wall_mount_screws.groups
      : [],
    screw_evidence: screwEvidence,
    port_sides: [...new Set(ports.map((port) => port.position))],
    ports,
    port_evidence: passportEvidence,
  };
}

export function buildConnectorClearanceInput({
  connections,
  modelPortPassport,
  connectorClearance,
}) {
  if (!connectorClearance || typeof connectorClearance !== "object") return null;
  const selectedConnections = Array.isArray(connections)
    ? connections.filter((kind) => PORT_KINDS.has(kind))
    : [];
  const connectionKind = connectorClearance.connectionKind;
  if (!PORT_KINDS.has(connectionKind) || !selectedConnections.includes(connectionKind)) {
    throw new Error("Проверяемый разъём должен входить в выбранные подключения.");
  }

  const explicitDirection = connectorClearance.portDirection;
  let portDirection = null;
  let factSource = "unknown";
  if (USER_DIRECTIONS.has(explicitDirection)) {
    portDirection = explicitDirection;
    factSource = "user";
  } else {
    const passportDirections = [
      ...new Set(
        (modelPortPassport?.ports ?? [])
          .filter((port) => port.kind === connectionKind && PASSPORT_DIRECTIONS.has(port.direction))
          .map((port) => port.direction),
      ),
    ];
    if (passportDirections.length === 1) {
      [portDirection] = passportDirections;
      factSource = "passport";
    } else {
      portDirection = "unknown";
    }
  }

  const rawRequired = connectorClearance.requiredClearanceMm;
  if (
    rawRequired !== null
    && rawRequired !== undefined
    && (!Number.isFinite(rawRequired) || rawRequired < 1 || rawRequired > 200)
  ) {
    throw new Error("Габарит штекера с изгибом должен быть от 1 до 200 мм.");
  }

  return {
    connection_kind: connectionKind,
    port_direction: portDirection,
    required_clearance_mm: rawRequired ?? null,
    fact_source: factSource,
  };
}

function buildMount(mount) {
  return {
    id: mount.id,
    brand: mount.brand ?? "",
    model: mount.model ?? "",
    title: mount.title,
    mechanism: mount.mechanism,
    min_diagonal_in: mount.min_diagonal_in,
    max_diagonal_in: mount.max_diagonal_in,
    max_load_kg: mount.max_load_kg,
    vesa: mount.vesa,
    wall_distance_min_mm: mount.wall_distance_min_mm,
    wall_distance_max_mm: mount.wall_distance_max_mm,
    source_url: mount.source_url,
    source_label: mount.source_label ?? "",
    checked_at: mount.checked_at ?? "",
    market_url: null,
    reward_rub_snapshot: null,
  };
}

function buildMountDetails(mount) {
  const details = mount.technical_details;
  const source = toRustEvidence(details?.evidence);
  if (!details || !source) return null;

  const plate = details.wall_plate;
  const wallPlate = plate && Number.isFinite(plate.width_mm) && Number.isFinite(plate.height_mm)
    ? {
        width_mm: plate.width_mm,
        height_mm: plate.height_mm,
        hole_coordinates_mm: Array.isArray(plate.hole_coordinates_mm)
          ? plate.hole_coordinates_mm
          : [],
      }
    : null;

  return {
    maximum_extension_cm: millimetresToCentimetres(details.maximum_extension_mm),
    maximum_down_tilt_degrees: finite(details.maximum_down_tilt_degrees),
    maximum_up_tilt_degrees: finite(details.maximum_up_tilt_degrees),
    wall_plate_reference_offset_cm: millimetresToCentimetres(
      details.wall_plate_reference_offset_mm,
    ),
    wall_plate: wallPlate,
    source,
  };
}

function buildWallFixing(value, mountId, wallProfile) {
  const source = toRustEvidence(value?.evidence);
  if (!value || !source || value.mount_id !== mountId || value.wall_profile !== wallProfile) {
    return null;
  }
  return {
    system_id: value.system_id,
    wall_profile: value.wall_profile,
    mount_id: value.mount_id,
    fastener_title: value.fastener_title,
    quantity: value.quantity,
    anchor_diameter_mm: value.anchor_diameter_mm,
    anchor_length_mm: value.anchor_length_mm,
    drill_diameter_mm: value.drill_diameter_mm,
    supported_load_kg: value.supported_load_kg,
    source,
  };
}

export function buildInstallationKitInput(values) {
  if (!values?.model || !values?.mount) {
    throw new Error("Выберите точную модель телевизора и кронштейн.");
  }
  const model = buildModel(values.model, values.modelPortPassport);
  const cables = values.cables ?? {};
  return {
    model,
    mount: buildMount(values.mount),
    requested_mechanism: values.requestedMechanism,
    wall_profile: values.wallProfile,
    mount_details: buildMountDetails(values.mount),
    wall_fixing: buildWallFixing(
      values.wallFixingRecommendation,
      values.mount.id,
      values.wallProfile,
    ),
    placement: values.placement,
    cables: {
      routing: cables.routing,
      connections: cables.connections,
      spare_length_cm: cables.spare_length_cm,
      connector_clearance: buildConnectorClearanceInput({
        connections: cables.connections,
        modelPortPassport: { ports: model.ports },
        connectorClearance: cables.connectorClearance,
      }),
    },
  };
}

export async function buildInstallationKitWithEngine(engine, values) {
  if (!engine || typeof engine.build_installation_kit_json !== "function") {
    throw new Error("Локальный модуль монтажного комплекта недоступен.");
  }
  let response;
  try {
    response = JSON.parse(
      engine.build_installation_kit_json(JSON.stringify(buildInstallationKitInput(values))),
    );
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Не удалось прочитать расчёт монтажного комплекта.");
  }
  if (response?.error) throw new Error(response.error);
  return response;
}
