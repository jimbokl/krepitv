import "@fontsource/roboto-condensed/700.css";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource-variable/ibm-plex-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import { bootClient } from "./lib/clientBoot.mjs";
import { YANDEX_METRIKA_COUNTER_ID } from "./lib/metrikaConfig.mjs";
import { installConsentGatedMetrika } from "./lib/metrikaGate.mjs";
import { installAffiliateInteractionTracker } from "./lib/affiliateClick.mjs";
import { installStaticNavigation } from "./lib/staticNavigation.mjs";
import { installToolUsageTracker } from "./lib/toolUsage.mjs";
import "./styles.css";

const rootElement = document.getElementById("root");

installConsentGatedMetrika({ counterId: YANDEX_METRIKA_COUNTER_ID });
installAffiliateInteractionTracker();
installToolUsageTracker();
const staticNavigation = installStaticNavigation();

if (rootElement?.dataset.pageKind === "home") {
  void Promise.all([
    import("./lib/homeSearchEnhancement.mjs"),
    import("./lib/modelSearch.mjs"),
  ]).then(
    ([{ enhanceHomeSearch }, { loadHomeSearch }]) => bootClient({
      rootElement,
      loadHomeSearch,
      renderHome(island, search) {
        enhanceHomeSearch(island, search);
      },
    }),
    reportEnhancementError,
  );
} else if (rootElement?.dataset.pageKind === "model") {
  const modelId = rootElement.dataset.modelId;
  void Promise.all([
    import("./components/ModelOffersIsland.jsx"),
    import("./lib/catalog.js"),
    import("./lib/renderReactIsland.jsx"),
  ]).then(
    ([{ ModelOffersIsland }, { loadFreshModelAffiliateOffers }, { renderReactIsland }]) => bootClient({
      rootElement,
      loadIslandData: () => loadFreshModelAffiliateOffers({ modelId }),
      renderIsland(island, offers) {
        renderReactIsland(island, ModelOffersIsland, { modelId, offers });
      },
    }),
    reportEnhancementError,
  );
} else if (rootElement?.dataset.pageKind === "matcher") {
  void Promise.all([
    import("./pages/GuidedSelectionPage.jsx"),
    import("./lib/catalog.js"),
    import("./lib/renderReactIsland.jsx"),
  ]).then(
    ([{ GuidedSelectionPage }, { loadCatalog }, { renderReactIsland }]) => bootClient({
      rootElement,
      loadIslandData: loadCatalog,
      renderIsland(island, catalog) {
        renderReactIsland(island, GuidedSelectionPage, { catalog, embedded: true });
      },
    }),
    reportEnhancementError,
  );
} else {
  void Promise.all([
    import("./App.jsx"),
    import("./lib/catalog.js"),
    import("./lib/renderReactIsland.jsx"),
  ]).then(
    ([{ App, preloadAppRoute }, { loadCatalog }, { renderReactIsland }]) => preloadAppRoute(rootElement).then(
      () => bootClient({
        rootElement,
        loadCatalog,
        render(catalog) {
          staticNavigation.dispose();
          renderReactIsland(rootElement, App, { catalog });
        },
      }),
    ),
    reportEnhancementError,
  );
}

function reportEnhancementError(error) {
  console.error("Не удалось подключить интерактивный модуль; оставлен статический контент.", error);
}
