import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Info,
  LinkSimple,
  Ruler,
  ShieldCheck,
} from "@phosphor-icons/react";
import { AffiliateLink } from "../components/AffiliateOffer.jsx";
import { CatalogBrandGroups } from "../components/CatalogBrandGroups.jsx";
import { CommercialProfile } from "../components/CommercialProfile.jsx";
import { ModelFacts, formatNumber } from "../components/ModelFacts.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { HeightCalculator } from "../components/HeightCalculator.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { TrustMark, formatCheckedDate } from "../components/TrustMark.jsx";
import { mountHref } from "../lib/catalog.js";
import { getAffiliatePresentation, selectAffiliateOffer } from "../lib/affiliateOffer.mjs";
import { selectCommercialProfile } from "../lib/commercialProfiles.mjs";
import { getModelContextPages } from "../lib/seoPages.mjs";

export function ModelPage({ catalog, modelId }) {
  const model = catalog.models.find((item) => item.id === modelId);
  const [query, setQuery] = useState(model?.title ?? "");
  const compatible = useMemo(
    () => catalog.compatibilityEdges
      .filter((edge) => edge.tv_id === modelId && edge.compatible)
      .map((edge) => ({
        ...edge,
        mount: catalog.mounts.find((mount) => mount.id === edge.mount_id),
      }))
      .filter((edge) => edge.mount),
    [catalog.compatibilityEdges, catalog.mounts, modelId],
  );
  const contextPages = useMemo(
    () => getModelContextPages(model, catalog.seoPages),
    [catalog.seoPages, model],
  );
  if (!model) {
    return <MissingModel catalog={catalog} />;
  }
  const commercialProfile = selectCommercialProfile(catalog.commercialProfiles, {
    entityKind: "model",
    entityId: model.id,
    pagePath: `/modeli/${model.id}/`,
  });

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active="/modeli/" />
      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-6 sm:px-8">
        <section>
          <h1 className="font-display text-[clamp(2.5rem,4.7vw,4.7rem)] font-extrabold leading-none tracking-[-0.025em]">
            Кронштейн для {model.title}
          </h1>
          <div className="mt-4 grid gap-2 border-y border-ink py-3 font-mono text-xs text-muted sm:grid-cols-3">
            <span>Источник: база Крепи ТВ · {model.brand} · {model.model}</span>
            <span className="sm:text-center">{model.series} · {model.model_year}</span>
            <span className="sm:text-right">Данные проверены: {formatCheckedDate(model.checked_at)}</span>
          </div>
        </section>

        <CommercialProfile profile={commercialProfile} />

        <section className="grid border-b-2 border-ink lg:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.15fr)]">
          <div className="border-b border-ink py-6 lg:border-b-0 lg:border-r lg:pr-8">
            <h2 className="mb-3 text-base font-semibold">Введите модель телевизора</h2>
            <div className="relative z-20">
              <ModelSearch
                buttonLabel="Найти"
                compact
                onChange={setQuery}
                onSubmit={openModel}
                search={catalog.search}
                value={query}
              />
            </div>

            <h2 className="mb-2 mt-7 font-display text-lg font-bold">
              Технические характеристики телевизора
            </h2>
            <ModelFacts detailed model={model} />

            {contextPages.length ? (
              <nav className="mt-5 border-y border-line" aria-label="Связанные подборы">
                {contextPages.map((page) => (
                  <a
                    className="flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 font-display font-bold first:border-t-0 hover:text-action"
                    href={page.path}
                    key={page.id}
                  >
                    {page.label} <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
                  </a>
                ))}
              </nav>
            ) : null}

            <div className="mt-5 flex items-start gap-4 border border-ink bg-white/60 p-4">
              <Info aria-hidden="true" className="size-8 shrink-0" weight="regular" />
              <div className="text-sm leading-relaxed">
                <p>Эти данные сверены KREPI TV с указанным официальным источником производителя.</p>
                <a
                  className="mt-2 inline-flex items-center gap-2 font-semibold text-technical underline underline-offset-4"
                  href={model.source_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Открыть источник <LinkSimple aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="py-6 lg:pl-8">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-verified text-white">
                <Check aria-hidden="true" className="size-9" weight="bold" />
              </span>
              <div>
                <h2 className="font-display text-3xl font-extrabold text-verified sm:text-4xl lg:text-5xl">
                  Совместимые варианты
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
                  Все варианты проходят точную VESA и запас нагрузки для {model.title}. Диапазон диагонали проверяется отдельно в статусе каждой позиции.
                </p>
              </div>
            </div>

            <MountMatches affiliateOffers={catalog.affiliateOffers} matches={compatible} />

            <figure className="mt-4 border-b border-line">
              <picture>
                <source srcSet="/assets/images/mount-mechanisms.avif" type="image/avif" />
                <source srcSet="/assets/images/mount-mechanisms.webp" type="image/webp" />
                <img
                  alt="Фиксированный, наклонный и поворотный механизмы кронштейнов"
                  className="aspect-[2.11/1] w-full object-contain"
                  decoding="async"
                  height="663"
                  loading="lazy"
                  src="/assets/images/mount-mechanisms.png"
                  width="1400"
                />
              </picture>
              <figcaption className="px-2 py-2 font-mono text-[0.68rem] uppercase text-muted">
                Справочное сравнение механизмов — не фотография конкретного товара
              </figcaption>
            </figure>
          </div>
        </section>

        <HeightCalculator model={model} />
      </div>
    </main>
  );
}

function MountMatches({ affiliateOffers, matches }) {
  if (!matches.length) {
    return <p className="py-6 text-muted">В проверенном каталоге пока нет совместимых вариантов.</p>;
  }
  const matchesWithOffers = matches
    .map((match) => ({ ...match, ...marketOfferForMatch(affiliateOffers, match.mount) }))
    .filter(({ market }) => market);
  const featuredOffers = matchesWithOffers.slice(0, 3);
  const featuredMountIds = new Set(featuredOffers.map(({ mount }) => mount.id));

  return (
    <>
      {featuredOffers.length ? (
        <section aria-label="Предложения Яндекс Маркета" className="mt-6 border-2 border-ink bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ink pb-3">
            <h2 className="font-display text-2xl font-extrabold">Сейчас доступны на Маркете</h2>
            <span className="font-mono text-xs uppercase text-muted">До 3 проверенных вариантов</span>
          </div>
          <div className="grid gap-4 pt-4 lg:grid-cols-3">
            {featuredOffers.map(({ market, mount, offer }) => (
              <article className="flex flex-col border border-line p-4" key={mount.id}>
                <h3 className="font-display text-xl font-bold">{mount.title}</h3>
                <dl className="mt-3 grid gap-1 border-y border-line py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Механизм</dt>
                    <dd className="font-semibold">{mechanismLabel(mount.mechanism)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">От стены</dt>
                    <dd className="font-semibold">{formatDistance(mount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Нагрузка</dt>
                    <dd className="font-semibold">до {formatNumber(mount.max_load_kg)} кг</dd>
                  </div>
                </dl>
                {market.notice ? (
                  <p className="mt-2 font-mono text-[0.62rem] leading-relaxed text-muted">
                    {market.notice}
                  </p>
                ) : null}
                <div className="mt-auto pt-4">
                  <AffiliateLink className="primary-button" offer={offer}>
                    Открыть на Маркете <ArrowRight aria-hidden="true" />
                  </AffiliateLink>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <CatalogBrandGroups
        countLabel="Кронштейнов"
        getBrand={(item) => item.mount.brand}
        items={matches}
        listClassName="border-b border-line"
        renderItem={({ mount, reasons, warnings, required_load_kg: requiredLoad, fit_status: fitStatus }) => {
          const { market, offer } = marketOfferForMatch(affiliateOffers, mount);
          return (
        <article className="grid gap-4 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={mount.id}>
          <div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="font-display text-2xl font-bold">{mount.title}</h3>
              <span className="font-mono text-xs uppercase text-muted">
                {mechanismLabel(mount.mechanism)}
              </span>
              <span className={`font-mono text-xs uppercase ${fitStatus === "verified-fit" ? "text-verified" : "text-action"}`}>
                {fitStatus === "verified-fit" ? "Три проверки пройдены" : "Нужна проверка диагонали"}
              </span>
            </div>
            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              {reasons.map((reason) => (
                <li className="flex gap-2" key={reason}>
                  <CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" weight="fill" />
                  <span>{reason}</span>
                </li>
              ))}
              {warnings.map((warning) => (
                <li className="flex gap-2 text-action" key={warning}>
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
              <li className="flex gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" />
                Требуемая нагрузка с запасом: {formatNumber(requiredLoad)} кг
              </li>
              <li className="flex gap-2">
                <Ruler aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-technical" />
                Расстояние от стены: {formatDistance(mount)}
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {market && !featuredMountIds.has(mount.id) ? (
              <>
                <AffiliateLink className="primary-button" offer={offer}>
                  На Яндекс Маркет <ArrowRight aria-hidden="true" />
                </AffiliateLink>
                {market.notice ? (
                  <span className="max-w-64 text-left font-mono text-[0.62rem] leading-relaxed text-muted sm:text-right">
                    {market.notice}
                  </span>
                ) : null}
              </>
            ) : null}
            <a className="secondary-button" href={mountHref(mount)}>
              Подробнее о совместимости <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </article>
          );
        }}
      />
    </>
  );
}

function marketOfferForMatch(affiliateOffers, mount) {
  const offer = selectAffiliateOffer(
    affiliateOffers,
    {
      pagePath: `/kronshteyny/${mount.id}/`,
      entityKind: "mount",
      entityId: mount.id,
    },
  );
  return { offer, market: getAffiliatePresentation(offer) };
}

function MissingModel({ catalog }) {
  const [query, setQuery] = useState("");
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-5xl font-extrabold">Модель не найдена</h1>
        <p className="mt-4 text-muted">Выберите телевизор из проверенной базы.</p>
        <div className="mt-8 text-left">
          <ModelSearch
            compact
            onChange={setQuery}
            onSubmit={(item) => window.location.assign(item.href)}
            search={catalog.search}
            value={query}
          />
        </div>
      </section>
    </main>
  );
}

function mechanismLabel(value) {
  if (value === "fixed") return "Фиксированный";
  if (value === "tilt") return "Наклонный";
  if (value === "full-motion") return "Поворотный";
  return "Механизм не указан";
}

function formatDistance(mount) {
  if (mount.wall_distance_min_mm === mount.wall_distance_max_mm) {
    return `${formatNumber(mount.wall_distance_min_mm)} мм`;
  }
  return `${formatNumber(mount.wall_distance_min_mm)}–${formatNumber(mount.wall_distance_max_mm)} мм`;
}
