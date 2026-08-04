import trustPages from "../../data/trust_pages.json";
import { SiteFooter } from "./components/SiteFooter.jsx";
import { CatalogIndexPage } from "./pages/CatalogIndexPage.jsx";
import { GuidedSelectionPage } from "./pages/GuidedSelectionPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ModelPage } from "./pages/ModelPage.jsx";
import { MountPage } from "./pages/MountPage.jsx";
import { ObservedModelPage } from "./pages/ObservedModelPage.jsx";
import { SeoPage } from "./pages/SeoPage.jsx";
import { TrustPage } from "./pages/TrustPage.jsx";

export function App({ catalog }) {
  const path = normalizePath(window.location.pathname);
  const trustPage = trustPages.find((page) => normalizePath(page.path) === path);

  if (trustPage) {
    return withSiteFooter(<TrustPage page={trustPage} />);
  }

  if (path === "/podbor" || path.startsWith("/podbor/")) {
    return withSiteFooter(<GuidedSelectionPage catalog={catalog} />);
  }

  if (path === "/modeli/") {
    return withSiteFooter(<CatalogIndexPage catalog={catalog} kind="models" />);
  }

  if (path === "/kronshteyny/") {
    return withSiteFooter(<CatalogIndexPage catalog={catalog} kind="mounts" />);
  }

  const modelMatch = path.match(/^\/modeli\/([^/]+)\/?/);
  if (modelMatch) {
    const modelId = decodeURIComponent(modelMatch[1]);
    const observedModel = catalog.marketModels.find((item) => item.id === modelId && item.page_kind !== "verified");
    if (observedModel) {
      return withSiteFooter(<ObservedModelPage catalog={catalog} model={observedModel} />);
    }
    return withSiteFooter(<ModelPage catalog={catalog} modelId={modelId} />);
  }

  const mountMatch = path.match(/^\/kronshteyny\/([^/]+)\/?/);
  if (mountMatch) {
    return withSiteFooter(<MountPage catalog={catalog} mountId={decodeURIComponent(mountMatch[1])} />);
  }

  if (path === "/" || path === "/index.html/") {
    return withSiteFooter(<HomePage catalog={catalog} />);
  }

  const seoPage = catalog.seoPages.find((page) => seoPageMatchesPath(page, path));
  return withSiteFooter(<SeoPage catalog={catalog} page={seoPage} requestedPath={path} />);
}

function withSiteFooter(page) {
  return (
    <>
      {page}
      <SiteFooter />
    </>
  );
}

function normalizePath(value) {
  const path = `/${String(value ?? "").replace(/^\/+|\/+$/g, "")}`;
  return path === "/" ? path : `${path}/`;
}

function seoPageMatchesPath(page, currentPath) {
  return [page.path, page.slug]
    .filter(Boolean)
    .some((candidate) => normalizePath(candidate) === currentPath);
}
