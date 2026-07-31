import { installMetrika } from "./metrika.mjs";
import {
  METRIKA_CONSENT_EVENT,
  METRIKA_CONSENT_GRANTED,
  readMetrikaConsent,
} from "./metrikaConsent.mjs";

export function installConsentGatedMetrika({
  counterId,
  documentObject = globalThis.document,
  install = installMetrika,
  readConsent = readMetrikaConsent,
  windowObject = globalThis.window,
} = {}) {
  if (!windowObject || typeof windowObject.addEventListener !== "function") {
    return { dispose() {}, enabled: false };
  }

  const disableKey = `disableYaCounter${counterId}`;
  let metrika = null;

  function enable() {
    if (metrika?.enabled) return true;
    windowObject[disableKey] = false;
    metrika = install({ counterId, documentObject, windowObject });
    return Boolean(metrika?.enabled);
  }

  if (readConsent() === METRIKA_CONSENT_GRANTED) {
    enable();
  } else {
    windowObject[disableKey] = true;
  }

  function handleConsent(event) {
    if (event?.detail?.value === METRIKA_CONSENT_GRANTED) enable();
  }

  windowObject.addEventListener(METRIKA_CONSENT_EVENT, handleConsent);
  return {
    dispose() {
      windowObject.removeEventListener?.(METRIKA_CONSENT_EVENT, handleConsent);
      metrika?.dispose?.();
    },
    get enabled() {
      return Boolean(metrika?.enabled);
    },
  };
}
