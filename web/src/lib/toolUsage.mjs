export const TOOL_USAGE_EVENT = "krepitv:tool-usage";
export const TOOL_USAGE_STARTED = "started";

export const KNOWN_TOOL_IDS = Object.freeze([
  "brand_mount_match",
  "digital_channel_setup",
  "height_calculator",
  "installation_kit",
  "laptop_tv_connection",
  "mounting_map_calculator",
  "phone_tv_connection",
  "picture_setup",
  "screen_cleaning",
  "screw_lookup",
  "smart_tv_box",
  "soundbar_to_tv",
  "tilt_angle_calculator",
  "turn_clearance_calculator",
  "tv_app_install",
  "tv_dimensions_calculator",
  "tv_energy_calculator",
  "tv_factory_reset",
  "tv_firmware_update",
  "tv_headphones",
  "tv_no_internet",
  "tv_no_signal",
  "tv_picture_without_sound",
  "tv_remote_control",
  "tv_speakers",
  "tv_sound_without_picture",
  "tv_turns_off",
  "tv_usb_not_seen",
  "tv_zone_socket_calculator",
  "vesa_match_calculator",
  "vesa_model_lookup",
  "vesa_screw_length_calculator",
  "viewing_distance_calculator",
  "wall_planner",
]);

const TOOL_IDS = new Set(KNOWN_TOOL_IDS);
const SAFE_PATHNAME = /^\/(?:[A-Za-z0-9_-]+\/?)*$/;

function sameSitePathname(value) {
  return typeof value === "string" &&
    value.length <= 241 &&
    SAFE_PATHNAME.test(value)
    ? value
    : undefined;
}

export function toolUsageDetail(value = {}, sourcePath) {
  if (value?.action !== TOOL_USAGE_STARTED || !TOOL_IDS.has(value?.toolId)) {
    return false;
  }
  const detail = {
    action: TOOL_USAGE_STARTED,
    toolId: value.toolId,
  };
  const safeSourcePath = sameSitePathname(sourcePath);
  if (safeSourcePath !== undefined) detail.sourcePath = safeSourcePath;
  return detail;
}

export function emitToolUsage(windowObject, value) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }
  const detail = toolUsageDetail(
    value,
    value?.sourcePath ?? windowObject.location?.pathname,
  );
  if (!detail) return false;
  try {
    windowObject.dispatchEvent(
      new windowObject.CustomEvent(TOOL_USAGE_EVENT, { detail }),
    );
  } catch {
    return false;
  }
  return true;
}

export function installToolUsageTracker({
  documentObject = globalThis.document,
  windowObject = globalThis.window,
} = {}) {
  if (
    !documentObject ||
    typeof documentObject.addEventListener !== "function" ||
    !windowObject
  ) {
    return { dispose() {}, enabled: false };
  }

  const interactionEvents = ["click", "input", "change", "submit"];
  const started = new Set();
  function handleInteraction(event) {
    const boundary = event?.target?.closest?.("[data-analytics-tool]");
    const toolId = boundary?.dataset?.analyticsTool;
    const sourcePath = windowObject.location?.pathname;
    const detail = toolUsageDetail({ action: TOOL_USAGE_STARTED, toolId }, sourcePath);
    if (!detail) return;
    const key = `${detail.toolId}\n${detail.sourcePath ?? ""}`;
    if (started.has(key)) return;
    if (emitToolUsage(windowObject, detail)) started.add(key);
  }

  for (const eventName of interactionEvents) {
    documentObject.addEventListener(eventName, handleInteraction, true);
  }
  return {
    dispose() {
      for (const eventName of interactionEvents) {
        documentObject.removeEventListener?.(eventName, handleInteraction, true);
      }
      started.clear();
    },
    enabled: true,
  };
}
