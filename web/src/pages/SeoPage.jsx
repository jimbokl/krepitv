import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  CirclesThreePlus,
  Info,
  LinkSimple,
  Ruler,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { HeightCalculator } from "../components/HeightCalculator.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { modelHref } from "../lib/catalog.js";

const kindLabels = {
  guide: "Практическое руководство",
  vesa: "Справочник VESA",
  diagonal: "Подбор по диагонали",
  mechanism: "Типы кронштейнов",
  calculator: "Расчёт установки",
};

export function SeoPage({ catalog, page, requestedPath }) {
  if (!page) {
    return <SeoNotFound catalog={catalog} requestedPath={requestedPath} />;
  }

  return <SeoArticle catalog={catalog} page={page} />;
}

function SeoArticle({ catalog, page }) {
  const [query, setQuery] = useState("");
  const relatedPages = useMemo(
    () => getRelatedPages(page, catalog.seoPages),
    [catalog.seoPages, page],
  );
  const catalogItems = useMemo(
    () => getCatalogItems(page, catalog),
    [catalog, page],
  );

  usePageMetadata(page.title, page.description, page.path);

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-6 sm:px-8">
        <nav className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted" aria-label="Навигационная цепочка">
          <a className="hover:text-action" href="/">Главная</a>
          <span aria-hidden="true">/</span>
          <span>{kindLabels[page.kind] ?? "Справочник"}</span>
        </nav>

        <header className="mt-5 border-b-2 border-ink pb-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            {kindLabels[page.kind] ?? "Технический справочник"}
          </p>
          <h1 className="mt-3 max-w-[1180px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            {page.h1}
          </h1>
          <p className="mt-6 max-w-[1000px] text-lg leading-relaxed text-muted sm:text-xl">
            {page.lead}
          </p>
        </header>

        <section className="grid divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0" aria-label="Ключевые факты">
          {page.facts.map((fact, index) => (
            <article className="flex gap-4 px-1 py-5 first:pl-0 sm:px-6 sm:first:pl-0" key={fact}>
              <span className="font-display text-3xl font-extrabold text-action">{index + 1}</span>
              <p className="text-sm leading-relaxed sm:text-base">{fact}</p>
            </article>
          ))}
        </section>

        {page.id === "mounting-height" ? <HeightCalculator /> : null}

        <section className="relative z-20 py-7" aria-labelledby="seo-model-search">
          <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-end">
            <div>
              <h2 className="font-display text-3xl font-bold" id="seo-model-search">
                Проверить точную модель
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Модель точнее общего фильтра: покажем VESA, массу и только совместимые варианты.
              </p>
            </div>
            <ModelSearch
              buttonLabel="Проверить совместимость"
              compact
              onChange={setQuery}
              onSubmit={openModel}
              search={catalog.search}
              value={query}
            />
          </div>
        </section>

        <div className="grid gap-8 border-t border-ink pt-7 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
          <div className="min-w-0">
            <section aria-labelledby="check-title">
              <div className="flex items-center gap-3">
                <ShieldCheck aria-hidden="true" className="size-9 text-verified" />
                <h2 className="font-display text-3xl font-bold" id="check-title">
                  Что проверить перед выбором
                </h2>
              </div>
              <div className="mt-5 divide-y divide-line border-y border-line">
                {page.facts.map((fact) => (
                  <div className="flex items-start gap-4 py-4" key={fact}>
                    <CheckCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-verified" weight="fill" />
                    <p className="leading-relaxed">{fact}</p>
                  </div>
                ))}
              </div>
            </section>

            <CatalogEvidence items={catalogItems} page={page} />

            <section className="mt-10" aria-labelledby="faq-title">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                Короткие ответы
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold" id="faq-title">
                Частые вопросы
              </h2>
              <div className="mt-5 divide-y divide-line border-y-2 border-ink">
                {page.faq.map(([question, answer]) => (
                  <details className="group py-1" key={question}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                      {question}
                      <span className="text-2xl text-action transition group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="max-w-3xl pb-5 pr-10 leading-relaxed text-muted">{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <PageVisual kind={page.kind} />

            <div className="border-2 border-ink bg-white p-5">
              <p className="font-display text-2xl font-bold">Подбор без догадок</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Укажите модель, стену и нужный механизм. Проверка VESA и нагрузки выполняется по каталогу.
              </p>
              <a className="primary-button mt-5 w-full" href="/podbor/">
                Начать подбор <ArrowRight aria-hidden="true" />
              </a>
            </div>

            <nav className="border-t-2 border-ink pt-4" aria-label="Материалы по теме">
              <h2 className="font-display text-2xl font-bold">По этой теме</h2>
              <ul className="mt-3 divide-y divide-line border-b border-line">
                {relatedPages.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <a className="flex items-center justify-between gap-4 py-3 text-sm font-semibold transition hover:text-action" href={item.path}>
                      {shortTitle(item)} <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>

        <section className="mt-12 border-t-2 border-ink pt-6" aria-labelledby="more-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-bold" id="more-title">Полезные материалы</h2>
            <a className="text-sm font-semibold text-action underline underline-offset-4" href="/podbor/">
              Перейти к подбору
            </a>
          </div>
          <div className="mt-5 grid gap-px bg-line border border-line sm:grid-cols-2 lg:grid-cols-3">
            {relatedPages.map((item) => (
              <a className="group flex min-h-32 flex-col justify-between bg-paper p-5 transition hover:bg-white" href={item.path} key={item.id}>
                <span className="font-mono text-[0.68rem] uppercase text-muted">
                  {kindLabels[item.kind] ?? "Справочник"}
                </span>
                <span className="mt-4 flex items-end justify-between gap-4 font-display text-xl font-bold leading-tight group-hover:text-action">
                  {shortTitle(item)} <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function CatalogEvidence({ items, page }) {
  const isMountList = items.type === "mounts";
  const title = isMountList ? "Кронштейны из проверенного каталога" : "Модели из проверенной базы";

  return (
    <section className="mt-10" aria-labelledby="catalog-evidence-title">
      <div className="flex items-center gap-3">
        {isMountList ? (
          <Wrench aria-hidden="true" className="size-8 text-action" />
        ) : (
          <CirclesThreePlus aria-hidden="true" className="size-8 text-action" />
        )}
        <h2 className="font-display text-3xl font-bold" id="catalog-evidence-title">{title}</h2>
      </div>

      {items.values.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.values.map((item) =>
            isMountList ? (
              <article className="border border-line bg-white/70 p-5" key={item.id}>
                <h3 className="font-display text-xl font-bold">{item.title}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Нагрузка</dt>
                    <dd className="font-semibold">до {formatNumber(item.max_load_kg)} кг</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Диагональ</dt>
                    <dd className="font-semibold">{formatNumber(item.min_diagonal_in)}–{formatNumber(item.max_diagonal_in)}″</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">От стены</dt>
                    <dd className="font-semibold">{formatDistance(item)}</dd>
                  </div>
                </dl>
                <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4" href={item.source_url} rel="noreferrer" target="_blank">
                  Источник характеристик <LinkSimple aria-hidden="true" />
                </a>
              </article>
            ) : (
              <a className="border border-line bg-white/70 p-5 transition hover:border-action" href={modelHref(item)} key={item.id}>
                <h3 className="font-display text-xl font-bold">{item.title}</h3>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">VESA</dt>
                    <dd className="mt-1 font-semibold">{item.vesa_width_mm}×{item.vesa_height_mm}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Масса</dt>
                    <dd className="mt-1 font-semibold">{formatNumber(item.weight_kg)} кг</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Диагональ</dt>
                    <dd className="mt-1 font-semibold">{formatNumber(item.diagonal_inches)}″</dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-action">
                  Проверить совместимость <ArrowRight aria-hidden="true" />
                </span>
              </a>
            ),
          )}
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 border border-line bg-white/60 p-5">
          <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-action" />
          <p className="text-sm leading-relaxed text-muted">
            Для этого раздела в проверенном каталоге пока нет отдельных позиций. Используйте точную модель телевизора — общий признак «{page.h1}» не заменяет проверку VESA и нагрузки.
          </p>
        </div>
      )}
    </section>
  );
}

function PageVisual({ kind }) {
  const mechanisms = kind === "mechanism";
  return (
    <figure className="border-b border-line pb-5">
      <img
        alt={mechanisms ? "Фиксированный, наклонный и поворотный механизмы" : "Устройство крепления телевизора к стене"}
        className={`w-full object-contain ${mechanisms ? "aspect-[2.11/1]" : "aspect-[1.77/1]"}`}
        src={mechanisms ? "/assets/images/mount-mechanisms.png" : "/assets/images/mount-wall-system.png"}
      />
      <figcaption className="mt-3 flex items-start gap-2 font-mono text-xs leading-relaxed text-muted">
        {mechanisms ? <Wrench aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Ruler aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
        Совместимость определяется всей цепочкой: телевизор, VESA, кронштейн, крепёж и основание стены.
      </figcaption>
    </figure>
  );
}

function SeoNotFound({ catalog, requestedPath }) {
  const [query, setQuery] = useState("");
  usePageMetadata("Страница не найдена — Крепи ТВ", "Запрошенная страница не найдена. Перейдите к подбору кронштейна по точной модели телевизора.");

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8">
        <p className="font-mono text-xs uppercase text-action">Маршрут не найден</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-7xl">Страница не найдена</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Адрес «{requestedPath}» отсутствует в техническом справочнике. Найдите точную модель телевизора или перейдите к одному из проверенных материалов.
        </p>
        <div className="relative z-20 mt-8">
          <ModelSearch
            buttonLabel="Найти модель"
            compact
            onChange={setQuery}
            onSubmit={(item) => window.location.assign(item.href || `/modeli/${item.id}/`)}
            search={catalog.search}
            value={query}
          />
        </div>
        <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {catalog.seoPages.slice(0, 6).map((item) => (
            <a className="flex min-h-28 items-end justify-between gap-4 bg-paper p-5 font-display text-xl font-bold transition hover:bg-white hover:text-action" href={item.path} key={item.id}>
              {shortTitle(item)} <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

function getCatalogItems(page, catalog) {
  if (page.kind === "mechanism") {
    const mechanism = {
      "fixed-mount": "fixed",
      "tilt-mount": "tilt",
      "full-motion-mount": "full-motion",
    }[page.id];
    return {
      type: "mounts",
      values: catalog.mounts.filter((mount) => mount.mechanism === mechanism),
    };
  }

  if (page.kind === "vesa") {
    const vesa = page.id.replace("vesa-", "");
    return {
      type: "models",
      values: catalog.models.filter(
        (model) => `${model.vesa_width_mm}x${model.vesa_height_mm}` === vesa,
      ),
    };
  }

  if (page.kind === "diagonal") {
    const diagonal = Number(page.id.replace("diagonal-", ""));
    return {
      type: "models",
      values: catalog.models.filter((model) => model.diagonal_inches === diagonal),
    };
  }

  return { type: "models", values: catalog.models };
}

function getRelatedPages(page, pages) {
  return [...pages]
    .filter((item) => item.id !== page.id)
    .sort((left, right) => {
      const leftScore = left.kind === page.kind ? 0 : 1;
      const rightScore = right.kind === page.kind ? 0 : 1;
      return leftScore - rightScore;
    })
    .slice(0, 6);
}

function shortTitle(page) {
  return page.h1.replace(/:.+$/, "");
}

function usePageMetadata(title, description, path) {
  useEffect(() => {
    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    if (path) {
      const canonicalUrl = `https://krepitv.ru${path}`;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute("href", canonicalUrl);
      setMetaContent('meta[property="og:url"]', canonicalUrl);
    }
  }, [description, path, title]);
}

function setMetaContent(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute("content", value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

function formatDistance(mount) {
  if (mount.wall_distance_min_mm === mount.wall_distance_max_mm) {
    return `${formatNumber(mount.wall_distance_min_mm)} мм`;
  }
  return `${formatNumber(mount.wall_distance_min_mm)}–${formatNumber(mount.wall_distance_max_mm)} мм`;
}
