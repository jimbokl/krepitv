import { lazy, Suspense } from "react";
import trustPages from "../../data/trust_pages.json";
import { SiteFooter } from "./components/SiteFooter.jsx";

const routeLoaders = {
  home: () => import("./pages/HomePage.jsx"),
  matcher: () => import("./pages/GuidedSelectionPage.jsx"),
  catalog: () => import("./pages/CatalogIndexPage.jsx"),
  model: () => import("./pages/ModelPage.jsx"),
  observedModel: () => import("./pages/ObservedModelPage.jsx"),
  mount: () => import("./pages/MountPage.jsx"),
  seo: () => import("./pages/SeoPage.jsx"),
  trust: () => import("./pages/TrustPage.jsx"),
  guideIndex: () => import("./pages/GuideIndexPage.jsx"),
};

const HomePage = lazyNamed(routeLoaders.home, "HomePage");
const GuidedSelectionPage = lazyNamed(routeLoaders.matcher, "GuidedSelectionPage");
const CatalogIndexPage = lazyNamed(routeLoaders.catalog, "CatalogIndexPage");
const ModelPage = lazyNamed(routeLoaders.model, "ModelPage");
const ObservedModelPage = lazyNamed(routeLoaders.observedModel, "ObservedModelPage");
const MountPage = lazyNamed(routeLoaders.mount, "MountPage");
const SeoPage = lazyNamed(routeLoaders.seo, "SeoPage");
const TrustPage = lazyNamed(routeLoaders.trust, "TrustPage");
const GuideIndexPage = lazyNamed(routeLoaders.guideIndex, "GuideIndexPage");

const loaderByPageKind = new Map([
  ["home", routeLoaders.home],
  ["matcher", routeLoaders.matcher],
  ["models-catalog", routeLoaders.catalog],
  ["mounts-catalog", routeLoaders.catalog],
  ["model", routeLoaders.model],
  ["market-model", routeLoaders.observedModel],
  ["mount", routeLoaders.mount],
  ["seo", routeLoaders.seo],
  ["trust", routeLoaders.trust],
  ["guide-index", routeLoaders.guideIndex],
]);

export function preloadAppRoute(rootElement) {
  const pageKind = rootElement?.dataset?.pageKind;
  if (pageKind === "not-found") return Promise.resolve();
  const loader = loaderByPageKind.get(pageKind);
  if (!loader) {
    return Promise.reject(new Error("Не удалось определить интерактивный модуль страницы."));
  }
  return loader().then(() => undefined);
}

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

  if (path === "/spravochnik/") {
    return withSiteFooter(<GuideIndexPage catalog={catalog} />);
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
    <Suspense fallback={null}>
      {page}
      <SiteFooter />
    </Suspense>
  );
}

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
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
