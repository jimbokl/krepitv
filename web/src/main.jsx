import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/700.css";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import { bootClient } from "./lib/clientBoot.mjs";
import { YANDEX_METRIKA_COUNTER_ID } from "./lib/metrikaConfig.mjs";
import { installConsentGatedMetrika } from "./lib/metrikaGate.mjs";
import { installStaticNavigation } from "./lib/staticNavigation.mjs";
import { installToolUsageTracker } from "./lib/toolUsage.mjs";
import "./styles.css";

const rootElement = document.getElementById("root");

installConsentGatedMetrika({ counterId: YANDEX_METRIKA_COUNTER_ID });
installToolUsageTracker();
const staticNavigation = installStaticNavigation();

if (rootElement?.dataset.pageKind === "home") {
  void Promise.all([
    import("./components/HomeSearchIsland.jsx"),
    import("./lib/modelSearch.mjs"),
  ]).then(
    ([{ HomeSearchIsland }, { loadHomeSearch }]) => bootClient({
      rootElement,
      loadHomeSearch,
      renderHome(island, search) {
        createRoot(island).render(
          <React.StrictMode>
            <HomeSearchIsland search={search} />
          </React.StrictMode>,
        );
      },
    }),
    reportEnhancementError,
  );
} else if (rootElement?.dataset.pageKind === "model") {
  const modelId = rootElement.dataset.modelId;
  void Promise.all([
    import("./components/ModelOffersIsland.jsx"),
    import("./lib/catalog.js"),
  ]).then(
    ([{ ModelOffersIsland }, { loadFreshModelAffiliateOffers }]) => bootClient({
      rootElement,
      loadIslandData: () => loadFreshModelAffiliateOffers({ modelId }),
      renderIsland(island, offers) {
        if (!offers.length) return;
        createRoot(island).render(
          <React.StrictMode>
            <ModelOffersIsland offers={offers} />
          </React.StrictMode>,
        );
      },
    }),
    reportEnhancementError,
  );
} else if (rootElement?.dataset.pageKind === "matcher") {
  void Promise.all([
    import("./pages/GuidedSelectionPage.jsx"),
    import("./lib/catalog.js"),
  ]).then(
    ([{ GuidedSelectionPage }, { loadCatalog }]) => bootClient({
      rootElement,
      loadIslandData: loadCatalog,
      renderIsland(island, catalog) {
        createRoot(island).render(
          <React.StrictMode>
            <GuidedSelectionPage catalog={catalog} embedded />
          </React.StrictMode>,
        );
      },
    }),
    reportEnhancementError,
  );
} else {
  void Promise.all([
    import("./App.jsx"),
    import("./lib/catalog.js"),
  ]).then(
    ([{ App, preloadAppRoute }, { loadCatalog }]) => preloadAppRoute(rootElement).then(
      () => bootClient({
        rootElement,
        loadCatalog,
        render(catalog) {
          staticNavigation.dispose();
          createRoot(rootElement).render(
            <React.StrictMode>
              <App catalog={catalog} />
            </React.StrictMode>,
          );
        },
      }),
    ),
    reportEnhancementError,
  );
}

function reportEnhancementError(error) {
  console.error("Не удалось подключить интерактивный модуль; оставлен статический контент.", error);
}
