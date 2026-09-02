export const SELECTION_START_EVENT = "krepitv:selection-start";

const SAFE_PLACEMENTS = new Set(["seo_next_step"]);
const SAFE_PATHNAME = /^\/(?:[A-Za-z0-9_-]+\/?)*$/;

function sameSitePathname(value) {
  return typeof value === "string" &&
    value.length <= 241 &&
    SAFE_PATHNAME.test(value)
    ? value
    : undefined;
}

export function selectionStartDetail(value = {}, sourcePath) {
  if (!SAFE_PLACEMENTS.has(value?.placement)) return false;
  const detail = { placement: value.placement };
  const safeSourcePath = sameSitePathname(sourcePath ?? value?.sourcePath);
  if (safeSourcePath !== undefined) detail.sourcePath = safeSourcePath;
  return detail;
}

export function emitSelectionStart(windowObject, value) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }
  const detail = selectionStartDetail(
    value,
    value?.sourcePath ?? windowObject.location?.pathname,
  );
  if (!detail) return false;
  try {
    windowObject.dispatchEvent(
      new windowObject.CustomEvent(SELECTION_START_EVENT, { detail }),
    );
  } catch {
    return false;
  }
  return true;
}

export function selectionStartHandlers(windowObject, placement) {
  return {
    onAuxClick(event) {
      if (event?.button === 1) emitSelectionStart(windowObject, { placement });
    },
    onClick() {
      emitSelectionStart(windowObject, { placement });
    },
  };
}
