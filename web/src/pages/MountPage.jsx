import {
  ArrowRight,
  Barbell,
  BracketsSquare,
  CalendarDots,
  CheckCircle,
  LinkSimple,
  Ruler,
  TelevisionSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import AffiliateOffer from "../components/AffiliateOffer.jsx";
import { CatalogBrandGroups } from "../components/CatalogBrandGroups.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { formatNumber } from "../components/ModelFacts.jsx";
import { formatCheckedDate } from "../components/TrustMark.jsx";
import { modelHref } from "../lib/catalog.js";
import { selectAffiliateOffer } from "../lib/affiliateOffer.mjs";

export function MountPage({ catalog, mountId }) {
  const mount = catalog.mounts.find((item) => item.id === mountId);

  if (!mount) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <section className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="font-display text-5xl font-extrabold">Кронштейн не найден</h1>
          <a className="mt-6 inline-flex font-semibold text-action underline" href="/kronshteyny/">
            Открыть проверенный каталог
          </a>
        </section>
      </main>
    );
  }

  const compatibleModels = catalog.compatibilityEdges
    .filter((edge) => edge.mount_id === mount.id && edge.compatible)
    .map((edge) => ({
      ...edge,
      model: catalog.models.find((model) => model.id === edge.tv_id),
    }))
    .filter((edge) => edge.model);
  const affiliateOffer = selectAffiliateOffer(
    catalog.affiliateOffers,
    {
      pagePath: `/kronshteyny/${mount.id}/`,
      entityKind: "mount",
      entityId: mount.id,
    },
  );
  const verifiedModels = compatibleModels.filter(
    (edge) => edge.fit_status === "verified-fit",
  );
  const conditionalModels = compatibleModels.filter(
    (edge) => edge.fit_status === "conditional-fit",
  );

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active="/kronshteyny/" />
      <article className="mx-auto max-w-[1440px] px-5 pb-14 pt-6 sm:px-8">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            Проверенный кронштейн
          </p>
          <h1 className="mt-3 font-display text-[clamp(3rem,5.8vw,6.2rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            {mount.title}
          </h1>
          <div className="mt-5 grid gap-2 border-y border-ink py-3 font-mono text-xs text-muted sm:grid-cols-3">
            <span>{mount.brand} · {mount.model}</span>
            <span className="sm:text-center">Проверено: {formatCheckedDate(mount.checked_at)}</span>
            <span className="sm:text-right">Граф рассчитан в Rust</span>
          </div>
        </header>

        {affiliateOffer ? (
          <section className="border-b-2 border-ink py-7">
            <AffiliateOffer offer={affiliateOffer}>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Ссылка ведёт прямо на карточку этого кронштейна, а не на похожую модель.
              </p>
            </AffiliateOffer>
          </section>
        ) : null}

        <section className="grid border-b-2 border-ink lg:grid-cols-[minmax(21rem,0.85fr)_minmax(0,1.15fr)]">
          <div className="border-b border-ink py-7 lg:border-b-0 lg:border-r lg:pr-8">
            <h2 className="font-display text-3xl font-extrabold">Характеристики изделия</h2>
            <dl className="mt-5 divide-y divide-dashed divide-line border-y border-ink">
              <Fact Icon={BracketsSquare} label="Поддерживаемые VESA" value={mount.vesa.join(" · ").replaceAll("x", "×")} />
              <Fact Icon={Barbell} label="Максимальная нагрузка" value={`${formatNumber(mount.max_load_kg)} кг`} />
              <Fact Icon={TelevisionSimple} label="Диагональ" value={`${formatNumber(mount.min_diagonal_in)}–${formatNumber(mount.max_diagonal_in)}″`} />
              <Fact Icon={Ruler} label="Расстояние от стены" value={formatDistance(mount)} />
              <Fact Icon={CalendarDots} label="Дата проверки" value={formatCheckedDate(mount.checked_at)} />
            </dl>
            <a
              className="mt-5 inline-flex items-center gap-2 font-semibold text-technical underline underline-offset-4"
              href={mount.source_url}
              rel="noreferrer"
              target="_blank"
            >
              Источник характеристик <LinkSimple aria-hidden="true" />
            </a>
          </div>

          <div className="py-7 lg:pl-8">
            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-verified text-white">
                <CheckCircle aria-hidden="true" className="size-9" weight="fill" />
              </span>
              <div>
                <h2 className="font-display text-3xl font-extrabold text-verified sm:text-4xl">
                  Подтверждённые популярные телевизоры
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                  Прошли точную VESA, запас нагрузки 25% и паспортный диапазон диагонали.
                </p>
              </div>
            </div>

            <ModelRows items={verifiedModels} />

            {conditionalModels.length ? (
              <section className="mt-7 border-y-2 border-action py-5">
                <div className="flex items-start gap-4">
                  <WarningCircle aria-hidden="true" className="size-10 shrink-0 text-action" weight="fill" />
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-action sm:text-3xl">
                      Кандидаты после проверки диагонали
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      VESA и нагрузка совпали, но паспортный диапазон диагонали требует ручной проверки геометрии пластины.
                    </p>
                  </div>
                </div>
                <ModelRows conditional items={conditionalModels} />
              </section>
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 border-b border-line py-7 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <h2 className="font-display text-3xl font-extrabold">Границы проверки</h2>
          <p className="max-w-3xl leading-relaxed text-muted">
            Совместимость не назначает винты и анкеры, не подтверждает основание стены, скрытые коммуникации, доступ к разъёмам и фактическую геометрию пластины. Эти пункты проверяются по двум инструкциям и на месте.
          </p>
        </section>
      </article>
    </main>
  );
}

function ModelRows({ conditional = false, items }) {
  if (!items.length) {
    return (
      <div className="mt-5 border-b border-line">
        <p className="border-t border-line py-5 text-muted">В проверенной базе пока нет подтверждённых моделей.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <CatalogBrandGroups
        countLabel="Моделей"
        getBrand={(item) => item.model.brand}
        items={items}
        listClassName="border-b border-line"
        renderItem={({ model, warnings = [] }) => (
                <article className="grid gap-4 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={model.id}>
                  <div>
                    <h3 className="font-display text-2xl font-extrabold">{model.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {conditional ? "VESA и нагрузка совпали; диагональ требует проверки" : "Подходит по VESA, нагрузке и диагонали"}
                    </p>
                    <p className="mt-2 font-mono text-xs">VESA {model.vesa_width_mm}×{model.vesa_height_mm} мм · {formatNumber(model.weight_kg)} кг</p>
                    {conditional && warnings.length ? (
                      <p className="mt-2 text-sm leading-relaxed text-action">{warnings.join(" · ")}</p>
                    ) : null}
                  </div>
                  <a className="secondary-button" href={modelHref(model)}>
                    Страница телевизора <ArrowRight aria-hidden="true" />
                  </a>
                </article>
        )}
      />
    </div>
  );
}

function Fact({ Icon, label, value }) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-2 py-3 sm:grid-cols-[2.5rem_12rem_minmax(0,1fr)]">
      <Icon aria-hidden="true" className="size-8" />
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="col-start-2 break-words font-medium text-technical sm:col-start-3">{value}</dd>
    </div>
  );
}

function formatDistance(mount) {
  if (mount.wall_distance_min_mm === mount.wall_distance_max_mm) {
    return `${formatNumber(mount.wall_distance_min_mm)} мм`;
  }
  return `${formatNumber(mount.wall_distance_min_mm)}–${formatNumber(mount.wall_distance_max_mm)} мм`;
}
