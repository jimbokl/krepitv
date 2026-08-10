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
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { CatalogBrandGroups } from "../components/CatalogBrandGroups.jsx";
import { CommercialProfile } from "../components/CommercialProfile.jsx";
import { EditorialAccountability } from "../components/EditorialAccountability.jsx";
import { ModelFacts, formatNumber } from "../components/ModelFacts.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { MountDetailLink } from "../components/MountDetailLink.jsx";
import { HeightCalculator } from "../components/HeightCalculator.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { TrustMark, formatCheckedDate } from "../components/TrustMark.jsx";
import { WallMountScrews } from "../components/WallMountScrews.jsx";
import { mountHref } from "../lib/catalog.js";
import { buildEditorialEvidence } from "../lib/editorialPolicy.mjs";
import { selectCommercialProfile } from "../lib/commercialProfiles.mjs";
import { selectModelAffiliateOffers } from "../lib/modelAffiliateOffers.mjs";
import { modelWeightReserveText } from "../lib/modelWeight.js";
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
  const vesaConflict = model.wall_mount_screws?.vesa_conflict;
  const verifiedCount = compatible.filter((edge) => edge.fit_status === "verified-fit").length;
  const conditionalCount = compatible.filter((edge) => edge.fit_status === "conditional-fit").length;
  const editorialEvidence = buildEditorialEvidence({
    checkedAt: model.checked_at,
    contentKind: "verified-model",
  });

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active="/modeli/" />
      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-6 sm:px-8">
        <Breadcrumbs items={[
          { href: "/", label: "Главная" },
          { href: "/modeli/", label: "Модели телевизоров" },
          { label: model.title },
        ]} />
        <section>
          <h1 className="font-display text-[clamp(2.5rem,4.7vw,4.7rem)] font-extrabold leading-none tracking-[-0.025em]">
            Кронштейн для {model.title}
          </h1>
          <div className="mt-4 grid gap-2 border-y border-ink py-3 font-mono text-xs text-muted sm:grid-cols-3">
            <span>Источник: база Крепи ТВ · {model.brand} · {model.model}</span>
            <span className="sm:text-center">
              {model.series} · {model.model_year ?? "год не указан производителем"}
            </span>
            <span className="sm:text-right">Характеристики модели проверены: {formatCheckedDate(model.checked_at)}</span>
          </div>
        </section>

        <CommercialProfile profile={commercialProfile} />

        <EditorialAccountability evidence={editorialEvidence} />

        <figure className="my-7 border border-ink bg-white p-3 sm:p-5">
          <img
            alt={`Техническая схема VESA для ${model.title}`}
            className="block h-auto w-full"
            data-technical-image="true"
            decoding="async"
            height="630"
            loading="lazy"
            src={`/images/modeli/${model.id}-vesa.svg`}
            width="1200"
          />
          <figcaption className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-muted">
            Схема показывает паспортную пару VESA {model.vesa_width_mm}×{model.vesa_height_mm} мм; геометрия корпуса условная.
          </figcaption>
        </figure>

        <CompatibilityProof
          matches={compatible}
          model={model}
          vesaConflict={vesaConflict}
        />

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
            <WallMountScrews model={model} />

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
              <span className={`flex size-14 shrink-0 items-center justify-center rounded-full text-white ${vesaConflict ? "bg-action" : "bg-verified"}`}>
                {vesaConflict
                  ? <Info aria-hidden="true" className="size-9" weight="bold" />
                  : <Check aria-hidden="true" className="size-9" weight="bold" />}
              </span>
              <div>
                <h2 className={`font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl ${vesaConflict ? "text-action" : "text-verified"}`}>
                  {vesaConflict ? "Кандидаты после проверки VESA" : "Подтверждённые варианты"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
                  {vesaConflict
                    ? "Официальные источники расходятся по VESA. До измерения отверстий не считайте автоматический список окончательным."
                    : conditionalCount > 0
                      ? `Полностью подтверждено: ${verifiedCount}. Условных вариантов из-за диапазона диагонали: ${conditionalCount}.`
                      : `Все ${verifiedCount} вариантов прошли точную VESA, нагрузку с запасом и паспортный диапазон диагонали для ${model.title}.`}
                </p>
              </div>
            </div>

            <MountMatches
              matches={compatible}
              model={model}
              modelAffiliateOffers={catalog.modelAffiliateOffers}
            />

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

function CompatibilityProof({ matches, model, vesaConflict }) {
  const requiredLoad = formatNumber(model.weight_kg * 1.25);
  const vesa = `${formatNumber(model.vesa_width_mm)}×${formatNumber(model.vesa_height_mm)} мм`;
  const verifiedCount = matches.filter((edge) => edge.fit_status === "verified-fit").length;
  const conditionalCount = matches.filter((edge) => edge.fit_status === "conditional-fit").length;

  return (
    <section
      aria-label="Как проверена совместимость"
      className="mt-6 grid gap-px border border-ink bg-ink md:grid-cols-3"
      data-compatibility-proof="true"
    >
      <article className="bg-paper p-5">
        <p className="font-mono text-xs uppercase text-action">01 · Отверстия</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          {vesaConflict ? "VESA требует сверки" : `Точная пара ${vesa}`}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {vesaConflict
            ? "Официальные источники расходятся. До ручного замера список остаётся набором кандидатов."
            : "Максимальный размер рамки не считается совпадением: проверяется именно заявленная пара отверстий."}
        </p>
      </article>
      <article className="bg-paper p-5">
        <p className="font-mono text-xs uppercase text-action">02 · Нагрузка</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">Минимум {requiredLoad} кг</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {modelWeightReserveText(model)} Нагрузка каждого показанного варианта не ниже порога.
        </p>
      </article>
      <article className="bg-paper p-5">
        <p className="font-mono text-xs uppercase text-action">03 · Результат</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          {vesaConflict ? `Кандидатов: ${matches.length}` : `Подтверждено: ${verifiedCount}`}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {vesaConflict
            ? "Из-за расхождения официальных источников кандидаты требуют ручного измерения VESA."
            : conditionalCount > 0
              ? `Дополнительно условных вариантов: ${conditionalCount}. Они требуют ручной проверки диапазона диагонали. Крепёж к стене выбирают после проверки основания.`
              : "Все показанные варианты прошли три проверки. Крепёж к стене выбирают после проверки основания."}
        </p>
      </article>
    </section>
  );
}

function MountMatches({ matches, model, modelAffiliateOffers }) {
  if (!matches.length) {
    return <p className="py-6 text-muted">В проверенном каталоге пока нет совместимых вариантов.</p>;
  }
  const featuredOffers = selectModelAffiliateOffers(
    model,
    matches,
    modelAffiliateOffers,
  );
  const vesaConflict = Boolean(model.wall_mount_screws?.vesa_conflict);

  return (
    <>
      {featuredOffers.length ? (
        <section aria-label="Предложения Яндекс Маркета" className="mt-6 border-2 border-ink bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ink pb-3">
            <h2 className="font-display text-2xl font-extrabold">Сейчас доступны на Маркете</h2>
            <span className="font-mono text-xs uppercase text-muted">
              {vesaConflict ? "До 3 вариантов после ручной сверки VESA" : "До 3 проверенных вариантов"}
            </span>
          </div>
          <div className="grid gap-4 pt-4 lg:grid-cols-3">
            {featuredOffers.map(({ market, mount, offer }) => (
              <article className="flex flex-col border border-line p-4" key={mount.id}>
                <h3 className="font-display text-xl font-bold">
                  <MountDetailLink
                    className="underline decoration-action decoration-2 underline-offset-4"
                    href={mountHref(mount)}
                    placement="featured_result"
                  >
                    {mount.title}
                  </MountDetailLink>
                </h3>
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
                <div className="mt-auto grid gap-3 pt-4">
                  <MountDetailLink
                    className="inline-flex text-sm font-semibold text-action underline underline-offset-4"
                    href={mountHref(mount)}
                    placement="featured_result"
                  >
                    Проверить VESA и нагрузку
                  </MountDetailLink>
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
        renderItem={({ mount, reasons, warnings, required_load_kg: requiredLoad, fit_status: fitStatus }) => (
        <article className="grid gap-4 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={mount.id}>
          <div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="font-display text-2xl font-bold">{mount.title}</h3>
              <span className="font-mono text-xs uppercase text-muted">
                {mechanismLabel(mount.mechanism)}
              </span>
              <span className={`font-mono text-xs uppercase ${fitStatus === "verified-fit" && !vesaConflict ? "text-verified" : "text-action"}`}>
                {vesaConflict
                  ? "Нужно сверить VESA"
                  : fitStatus === "verified-fit" ? "Три проверки пройдены" : "Нужна проверка диагонали"}
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
            {fitStatus === "verified-fit" && !vesaConflict ? (
              <MountDetailLink
                className="secondary-button"
                href={mountHref(mount)}
                placement="compatibility_result"
              >
                Кронштейн {mount.title} <ArrowRight aria-hidden="true" />
              </MountDetailLink>
            ) : (
              <span className="max-w-64 text-sm font-semibold leading-relaxed text-action">
                {vesaConflict
                  ? "Переход к покупке закрыт до ручной сверки VESA"
                  : "Переход к покупке закрыт до сверки диапазона диагонали"}
              </span>
            )}
          </div>
        </article>
        )}
      />
    </>
  );
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
