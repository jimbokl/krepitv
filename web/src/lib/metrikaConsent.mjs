export const METRIKA_CONSENT_STORAGE_KEY = "krepitv:metrika-consent";
export const METRIKA_CONSENT_EVENT = "krepitv:metrika-consent";
export const METRIKA_CONSENT_GRANTED = "granted";
export const METRIKA_CONSENT_DENIED = "denied";
export const METRIKA_NOTICE_STORAGE_KEY = "krepitv:metrika-notice";

const DECISIONS = new Set([METRIKA_CONSENT_GRANTED, METRIKA_CONSENT_DENIED]);

export function readMetrikaConsent(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(METRIKA_CONSENT_STORAGE_KEY);
    return DECISIONS.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeMetrikaConsent(value, storage = globalThis.localStorage) {
  if (!DECISIONS.has(value)) return false;
  try {
    storage?.setItem(METRIKA_CONSENT_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function ensureMetrikaConsent(storage = globalThis.localStorage) {
  const current = readMetrikaConsent(storage);
  if (current) return current;
  writeMetrikaConsent(METRIKA_CONSENT_GRANTED, storage);
  return METRIKA_CONSENT_GRANTED;
}

export function readMetrikaNoticeDismissed(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(METRIKA_NOTICE_STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissMetrikaNotice(storage = globalThis.localStorage) {
  try {
    storage?.setItem(METRIKA_NOTICE_STORAGE_KEY, "dismissed");
    return true;
  } catch {
    return false;
  }
}

export function emitMetrikaConsent(windowObject, value) {
  if (
    !DECISIONS.has(value) ||
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }
  windowObject.dispatchEvent(
    new windowObject.CustomEvent(METRIKA_CONSENT_EVENT, { detail: { value } }),
  );
  return true;
}
