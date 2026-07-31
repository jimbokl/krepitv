export const MOUNT_DETAIL_CLICK_EVENT = "krepitv:mount-detail-click";

const SAFE_PLACEMENTS = new Set([
  "featured_result",
  "compatibility_result",
]);

export function mountDetailClickDetail(value = {}) {
  return SAFE_PLACEMENTS.has(value?.placement)
    ? { placement: value.placement }
    : false;
}

export function emitMountDetailClick(windowObject, detail) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }

  const safeDetail = mountDetailClickDetail(detail);
  if (!safeDetail) return false;

  try {
    windowObject.dispatchEvent(
      new windowObject.CustomEvent(MOUNT_DETAIL_CLICK_EVENT, { detail: safeDetail }),
    );
  } catch {
    return false;
  }
  return true;
}

export function mountDetailClickHandlers(windowObject, placement) {
  return {
    onAuxClick(event) {
      if (event?.button === 1) {
        emitMountDetailClick(windowObject, { placement });
      }
    },
    onClick() {
      emitMountDetailClick(windowObject, { placement });
    },
  };
}
