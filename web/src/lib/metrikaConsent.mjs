export const METRIKA_CONSENT_STORAGE_KEY = "krepitv:metrika-consent";
export const METRIKA_CONSENT_EVENT = "krepitv:metrika-consent";
export const METRIKA_CONSENT_GRANTED = "granted";
export const METRIKA_CONSENT_DENIED = "denied";

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
