export const INSTALLATION_KIT_INTERACTION_EVENT = "krepitv:installation-kit-interaction";

const ACTIONS = new Set(["checks_opened", "cable_check_opened", "print_started"]);
const SECTIONS = new Set(["summary", "cables", "print"]);
const STATUSES = new Set(["verified", "needs-check", "blocked"]);

export function installationKitInteractionDetail(detail = {}) {
  if (
    !ACTIONS.has(detail.action)
    || !SECTIONS.has(detail.section)
    || !STATUSES.has(detail.status)
  ) {
    return null;
  }
  return {
    action: detail.action,
    section: detail.section,
    status: detail.status,
  };
}

export function emitInstallationKitInteraction(windowObject, detail) {
  const safeDetail = installationKitInteractionDetail(detail);
  if (
    !safeDetail
    || !windowObject
    || typeof windowObject.dispatchEvent !== "function"
    || typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }
  windowObject.dispatchEvent(new windowObject.CustomEvent(
    INSTALLATION_KIT_INTERACTION_EVENT,
    { detail: safeDetail },
  ));
  return true;
}
