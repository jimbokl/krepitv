import { CircleNotch, Warning } from "@phosphor-icons/react";
import trustPages from "../../data/trust_pages.json";
import { SiteFooter } from "./components/SiteFooter.jsx";
import { useCatalog } from "./hooks/useCatalog.js";
import { GuidedSelectionPage } from "./pages/GuidedSelectionPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ModelPage } from "./pages/ModelPage.jsx";
import { SeoPage } from "./pages/SeoPage.jsx";
import { TrustPage } from "./pages/TrustPage.jsx";

export function App() {
  const catalog = useCatalog();
  const path = normalizePath(window.location.pathname);
  const trustPage = trustPages.find((page) => normalizePath(page.path) === path);

  if (trustPage) {
    return withSiteFooter(<TrustPage page={trustPage} />);
  }

  if (catalog.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <div className="text-center" role="status" aria-live="polite">
          <CircleNotch aria-hidden="true" className="mx-auto size-10 animate-spin text-action" />
          <p className="mt-4 font-display text-xl font-bold">Загружаем проверенные данные…</p>
        </div>
      </main>
    );
  }

  if (catalog.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <div className="max-w-lg border-2 border-danger bg-white p-7 text-center" role="alert">
          <Warning aria-hidden="true" className="mx-auto size-10 text-danger" />
          <h1 className="mt-4 font-display text-3xl font-bold">Данные не загрузились</h1>
          <p className="mt-3 text-muted">{catalog.error}</p>
          <button className="primary-button mx-auto mt-6" onClick={() => window.location.reload()} type="button">
            Обновить страницу
          </button>
        </div>
      </main>
    );
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
