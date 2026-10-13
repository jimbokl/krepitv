export const SUBTITLE_INTERACTION_EVENT = "krepitv:subtitle-interaction";
const ACTIONS = new Set(["step", "ready", "error", "retry", "helped", "not_helped", "reason", "copy"]);
const STEPS = new Set(["appearance", "source", "observation", "result"]);
const ROUTES = new Set(["none", "broadcast", "teletext", "notice", "youtube", "app", "external", "usb_track", "usb_file", "video_check", "tv_possible", "unknown"]);
const REASONS = new Set(["none", "button_missing", "menu_differs", "text_remains", "other"]);
export function subtitleInteractionDetail(detail = {}) {
  if (!ACTIONS.has(detail.action) || !STEPS.has(detail.step) || !ROUTES.has(detail.route ?? "none") || !REASONS.has(detail.reason ?? "none") || !Number.isInteger(detail.attempt) || detail.attempt < 1 || detail.attempt > 1000) return null;
  return { action: detail.action, step: detail.step, route: detail.route ?? "none", reason: detail.reason ?? "none", attempt: detail.attempt };
}
export function emitSubtitleInteraction(windowObject, detail) {
  const safe = subtitleInteractionDetail(detail);
  if (!safe || !windowObject?.CustomEvent || !windowObject?.dispatchEvent) return false;
  windowObject.dispatchEvent(new windowObject.CustomEvent(SUBTITLE_INTERACTION_EVENT, { detail: safe }));
  return true;
}
