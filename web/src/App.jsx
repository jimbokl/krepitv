import trustPages from "../../data/trust_pages.json";
import { SiteFooter } from "./components/SiteFooter.jsx";
import { GuidedSelectionPage } from "./pages/GuidedSelectionPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ModelPage } from "./pages/ModelPage.jsx";
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

  const modelMatch = path.match(/^\/modeli\/([^/]+)\/?/);
  if (modelMatch) {
    return withSiteFooter(<ModelPage catalog={catalog} modelId={decodeURIComponent(modelMatch[1])} />);
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
