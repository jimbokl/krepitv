import { useMemo, useState } from "react";
import { ArrowRight, BracketsSquare, TelevisionSimple } from "@phosphor-icons/react";
import { CatalogBrandGroups } from "../components/CatalogBrandGroups.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { EditorialScene } from "../components/EditorialScene.jsx";
import { formatNumber } from "../components/ModelFacts.jsx";
import { modelHref, mountHref } from "../lib/catalog.js";
import { modelWeightSuffix } from "../lib/modelWeight.js";
import { filterModelSearchResults } from "../lib/modelSearch.mjs";

const mountBrandHubs = [
  { href: "/kronshteyny-godoo/", label: "GoDoo" },
  { href: "/kronshteyny-onkron/", label: "ONKRON" },
  { href: "/kronshteyny-kromax/", label: "KROMAX" },
  { href: "/kronshteyny-holder/", label: "Holder" },
  { href: "/kronshteyny-itechmount/", label: "iTECHmount" },
];

export function CatalogIndexPage({ catalog, kind }) {
  const models = kind === "models";
  const items = models ? catalog.models : catalog.mounts;
  const incomingModelQuery = models
    ? (new URLSearchParams(window.location.search).get("model") ?? "").trim().slice(0, 120)
    : "";
  const [query, setQuery] = useState(incomingModelQuery);
  const [requestedQuery, setRequestedQuery] = useState(incomingModelQuery);
  const verifiedIds = useMemo(() => new Set(catalog.models.map((item) => item.id)), [catalog.models]);
  const requestedMatches = useMemo(
    () => requestedQuery ? filterModelSearchResults(catalog.search, requestedQuery, 6) : [],
    [catalog.search, requestedQuery],
  );
  const observedModels = models
    ? catalog.marketModels.filter((item) => item.page_kind === "observed")
    : [];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active={models ? "/modeli/" : "/kronshteyny/"} />
      <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
        <Breadcrumbs items={[
          { href: "/", label: "Главная" },
          { label: models ? "Модели телевизоров" : "Кронштейны" },
        ]} />
        <header className="technical-editorial-hero">
          <div className="technical-editorial-hero__copy">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
          {models ? "Начните с точной модели" : "Проверенная база"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
          {models ? "Модели телевизоров" : "Кронштейны для телевизоров"}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted">
          {models
            ? "Посмотрите код на наклейке сзади телевизора и введите его ниже. Если данные о креплении проверены, откроем паспорт модели и покажем подходящие кронштейны."
            : "Точные изделия с явными VESA, нагрузкой, механизмом и списком подходящих популярных телевизоров."}
        </p>
            {models ? (
              <section className="mt-6 border-2 border-ink bg-white p-4 sm:p-5" data-model-catalog-search="true" aria-labelledby="model-catalog-search-title">
                <h2 className="font-display text-2xl font-extrabold" id="model-catalog-search-title">Найдите свой телевизор</h2>
                <div className="mt-4">
                  <ModelSearch
                    buttonLabel="Открыть модель"
                    compact
                    emptyMessage="Такого кода пока нет в каталоге."
                    onChange={(value) => {
                      setQuery(value);
                      setRequestedQuery("");
                    }}
                    onSubmit={(item) => window.location.assign(item.href || modelHref(item))}
                    placeholder="Например, TCL 55C7K"
                    resultLabel={(item) => verifiedIds.has(item.id) ? "Паспорт проверен" : "Характеристики проверяются"}
                    search={catalog.search}
                    value={query}
                  />
                </div>
                {requestedQuery ? (
                  <div className="mt-5 border-t border-line pt-5" data-model-catalog-query-result="true" aria-live="polite">
                    {requestedMatches.length ? (
                      <>
                        <p className="text-sm font-semibold">По запросу «{requestedQuery}» найдены модели:</p>
                        <ul className="mt-3 grid gap-2">
                          {requestedMatches.map((item) => (
                            <li key={item.id}>
                              <a className="flex min-h-12 flex-wrap items-center justify-between gap-2 border border-line px-4 py-3 font-semibold text-action hover:border-action" href={item.href || modelHref(item)}>
                                <span>{item.title}</span>
                                <span className="text-xs font-normal text-muted">{verifiedIds.has(item.id) ? "Паспорт проверен" : "Характеристики проверяются"}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="leading-relaxed">По запросу «{requestedQuery}» модель не нашлась. Сверьте код на наклейке или выберите бренд в списке ниже.</p>
                    )}
                  </div>
                ) : null}
                <p className="mt-4 text-sm text-muted">Не знаете код? <a className="font-semibold text-action underline underline-offset-4" href="#checked-models">Выберите бренд в списке ниже</a>.</p>
              </section>
            ) : null}
          </div>
          <EditorialScene
            alt={models ? "Человек проверяет обозначение модели телевизора" : "Человек сравнивает варианты кронштейнов для телевизора"}
            caption={models ? "Фото показывает, где искать точную модель. Характеристики каждой модели приведены в её паспорте ниже." : "На фото условные крепления, не товары каталога. Открывайте точные карточки с паспортными VESA и нагрузкой."}
            src={models ? "/assets/images/home-step-model.webp" : "/assets/images/internal-mount-choice.webp"}
          />
        </header>

        {!models ? (
          <nav className="mt-7 flex flex-wrap items-center gap-2" aria-label="Сравнение кронштейнов по бренду">
            <span className="mr-2 font-mono text-xs uppercase text-muted">Сравнить бренд</span>
            {mountBrandHubs.map((hub) => (
              <a
                className="border border-ink bg-white px-3 py-2 font-display text-sm font-bold transition hover:border-action hover:text-action"
                href={hub.href}
                key={hub.href}
              >
                {hub.label}
              </a>
            ))}
          </nav>
        ) : null}

        {models ? (
          <aside className="mt-7 grid gap-4 border-2 border-ink bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="font-mono text-xs uppercase text-action">Новый технический справочник</p>
              <p className="mt-1 font-display text-2xl font-extrabold">
                Какие винты нужны для крепления телевизора
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Поиск по точной модели: M6 или M8, количество, длина либо допустимая глубина и официальное руководство.
              </p>
            </div>
            <a className="primary-button" href="/vinty-dlya-krepleniya-televizora/">
              Подобрать винты <ArrowRight aria-hidden="true" />
            </a>
          </aside>
        ) : null}

        <section className="mt-9" id={models ? "checked-models" : undefined}>
          {models ? (
            <>
              <p className="font-mono text-xs uppercase text-verified">Проверено по источникам · {items.length}</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold">Паспорта с VESA и массой</h2>
            </>
          ) : null}
        <nav className={models ? "mt-5" : ""} aria-label={models ? "Проверенные модели телевизоров" : "Кронштейны"}>
          <CatalogBrandGroups
            countLabel={models ? "Моделей" : "Кронштейнов"}
            items={items}
            listClassName="border-b border-line"
            renderItem={(item) => (
            <a
              className="group grid gap-4 border-t border-line py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
              href={models ? modelHref(item) : mountHref(item)}
              key={item.id}
            >
              {models ? (
                <TelevisionSimple aria-hidden="true" className="size-9 text-action" />
              ) : (
                <BracketsSquare aria-hidden="true" className="size-9 text-action" />
              )}
              <span>
                <strong className="font-display text-2xl font-extrabold">{item.title}</strong>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {models
                    ? `VESA ${item.vesa_width_mm}×${item.vesa_height_mm} мм · ${formatNumber(item.diagonal_inches)}″ · ${formatNumber(item.weight_kg)} кг ${modelWeightSuffix(item)}`
                    : `${mechanismLabel(item.mechanism)} · до ${formatNumber(item.max_load_kg)} кг · VESA ${item.vesa.join(" · ").replaceAll("x", "×")}`}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-action group-hover:underline">
                Открыть <ArrowRight aria-hidden="true" />
              </span>
            </a>
            )}
          />
        </nav>
        </section>

        {models ? (
          <section className="mt-12 border-t-2 border-ink pt-8" data-market-model-catalog="true">
            <p className="font-mono text-xs uppercase text-action">Найдены в выдаче Маркета · {observedModels.length}</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold">Модели до паспортной проверки</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
              Страница каждой модели рассчитывает размер активной области и даёт законченный план сверки VESA. Числа VESA, масса и подходящие кронштейны не угадываются.
            </p>
            <nav className="mt-5" aria-label="Наблюдаемые модели телевизоров">
              <CatalogBrandGroups
                countLabel="Моделей"
                items={observedModels}
                listClassName="border-b border-line"
                renderItem={(item) => (
                  <a
                    className="group grid gap-4 border-t border-line py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
                    href={item.route_path}
                    key={item.id}
                  >
                    <TelevisionSimple aria-hidden="true" className="size-9 text-action" />
                    <span>
                      <strong className="font-display text-2xl font-extrabold">{item.title}</strong>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">
                        {item.diagonal_inches ? `${formatNumber(item.diagonal_inches)}″ · ` : ""}VESA и масса проверяются
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-action group-hover:underline">
                      Проверить <ArrowRight aria-hidden="true" />
                    </span>
                  </a>
                )}
              />
            </nav>
          </section>
        ) : null}
      </article>
    </main>
  );
}

function mechanismLabel(value) {
  if (value === "fixed") return "Фиксированный";
  if (value === "tilt") return "Наклонный";
  if (value === "full-motion") return "Поворотный";
  return "Механизм не указан";
}
