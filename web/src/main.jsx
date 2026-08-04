import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/700.css";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import { App, preloadAppRoute } from "./App.jsx";
import { loadCatalog } from "./lib/catalog.js";
import { bootClient } from "./lib/clientBoot.mjs";
import { YANDEX_METRIKA_COUNTER_ID } from "./lib/metrikaConfig.mjs";
import { installConsentGatedMetrika } from "./lib/metrikaGate.mjs";
import "./styles.css";

const rootElement = document.getElementById("root");

installConsentGatedMetrika({ counterId: YANDEX_METRIKA_COUNTER_ID });

// Сначала загружаем только модуль текущего типа страницы. До его готовности
// самостоятельный SSR остаётся в DOM, поэтому медленная сеть не превращает
// полезный поисковый ответ в пустой экран.
void preloadAppRoute(rootElement).then(
  () => bootClient({
    rootElement,
    loadCatalog,
    render(catalog) {
      createRoot(rootElement).render(
        <React.StrictMode>
          <App catalog={catalog} />
        </React.StrictMode>,
      );
    },
  }),
  (error) => {
    console.error("Не удалось подключить интерактивный модуль; оставлен статический контент.", error);
  },
);
