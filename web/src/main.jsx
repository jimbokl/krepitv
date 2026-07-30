import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/700.css";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import { App } from "./App.jsx";
import { loadCatalog } from "./lib/catalog.js";
import { bootClient } from "./lib/clientBoot.mjs";
import { installMetrika } from "./lib/metrika.mjs";
import { YANDEX_METRIKA_COUNTER_ID } from "./lib/metrikaConfig.mjs";
import {
  METRIKA_CONSENT_EVENT,
  METRIKA_CONSENT_GRANTED,
  readMetrikaConsent,
} from "./lib/metrikaConsent.mjs";
import "./styles.css";

const rootElement = document.getElementById("root");

const metrikaDisableKey = `disableYaCounter${YANDEX_METRIKA_COUNTER_ID}`;
let metrika = null;

function enableMetrika() {
  if (metrika?.enabled) return;
  window[metrikaDisableKey] = false;
  metrika = installMetrika({ counterId: YANDEX_METRIKA_COUNTER_ID });
}

if (readMetrikaConsent() === METRIKA_CONSENT_GRANTED) {
  enableMetrika();
} else {
  window[metrikaDisableKey] = true;
}

window.addEventListener(METRIKA_CONSENT_EVENT, (event) => {
  if (event?.detail?.value === METRIKA_CONSENT_GRANTED) enableMetrika();
});

void bootClient({
  rootElement,
  loadCatalog,
  render(catalog) {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App catalog={catalog} />
      </React.StrictMode>,
    );
  },
});
