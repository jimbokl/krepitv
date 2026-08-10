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
import { CommercialProfile } from "../components/CommercialProfile.jsx";
import { EditorialAccountability } from "../components/EditorialAccountability.jsx";
import { MountTechnicalScheme } from "../components/MountTechnicalScheme.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { formatNumber } from "../components/ModelFacts.jsx";
import { formatCheckedDate } from "../components/TrustMark.jsx";
import { modelHref } from "../lib/catalog.js";
import { buildEditorialEvidence } from "../lib/editorialPolicy.mjs";
import { modelWeightSuffix } from "../lib/modelWeight.js";
import { marketMountSearchHref } from "../lib/marketSearch.mjs";
import { pluralizeRu } from "../lib/russianGrammar.js";
import { selectAffiliateOffer } from "../lib/affiliateOffer.mjs";
import { selectCommercialProfile } from "../lib/commercialProfiles.mjs";

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
  const contextLinks = mountContextLinks(mount);
  const commercialProfile = selectCommercialProfile(catalog.commercialProfiles, {
    entityKind: "mount",
    entityId: mount.id,
    pagePath: `/kronshteyny/${mount.id}/`,
  });
  const marketSearchHref = marketMountSearchHref(mount.title);
  const editorialEvidence = buildEditorialEvidence({
    checkedAt: mount.checked_at,
    contentKind: "mount",
  });

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

        <section
          className="mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-3"
          data-mount-fit-summary="true"
          aria-label="Краткий итог совместимости"
        >
          <SummaryFact
            label="Поддерживаемые VESA"
            value={`${mount.vesa.length} ${pluralizeRu(mount.vesa.length, "схема", "схемы", "схем")}`}
          />
          <SummaryFact
            label="Подтверждено"
            value={`${verifiedModels.length} ${pluralizeRu(verifiedModels.length, "модель", "модели", "моделей")}`}
            verified
          />
          <SummaryFact
            label="Нужна проверка диагонали"
            value={`${conditionalModels.length} ${pluralizeRu(conditionalModels.length, "модель", "модели", "моделей")}`}
          />
        </section>

        <CommercialProfile profile={commercialProfile} />

        <EditorialAccountability evidence={editorialEvidence} />

        <section
          aria-label={`Предложения Яндекс Маркета для ${mount.title}`}
          className="border-b-2 border-ink py-7"
          data-market-mount-section="true"
        >
          {affiliateOffer ? (
            <AffiliateOffer offer={affiliateOffer}>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Ссылка ведёт прямо на карточку этого кронштейна, а не на похожую модель.
              </p>
            </AffiliateOffer>
          ) : (
            <aside className="border-2 border-ink bg-white p-5" data-market-search-fallback="true">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
                Поиск по точной модели
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold">
                Найти {mount.title} на Яндекс Маркете
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                Откроется выдача только по названию этой модели. Перед покупкой сверьте маркировку,
                VESA, нагрузку и комплектацию с данными выше.
              </p>
              <a
                className="mt-5 inline-flex min-h-12 items-center gap-2 border-2 border-ink bg-action px-5 py-3 font-display text-lg font-extrabold text-white shadow-[4px_4px_0_#111111] transition-transform hover:-translate-y-0.5"
                data-market-link="search"
                data-market-mount-search="true"
                href={marketSearchHref}
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                Открыть Яндекс Маркет <LinkSimple aria-hidden="true" className="size-5" />
              </a>
            </aside>
          )}
          {affiliateOffer ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Карточка недоступна в вашем регионе?{" "}
              <a
                className="font-semibold text-technical underline underline-offset-4"
                data-market-link="search"
                data-market-mount-search="true"
                href={marketSearchHref}
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                Посмотреть другие предложения {mount.title}
              </a>
            </p>
          ) : null}
        </section>

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
              data-market-source={mount.source_url.startsWith("https://market.yandex.ru/") ? "identity" : undefined}
              href={mount.source_url}
              rel={mount.source_url.startsWith("https://market.yandex.ru/") ? "nofollow noopener noreferrer" : "noreferrer"}
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

        <MountTechnicalScheme mount={mount} />

        <nav className="mt-5 border-y border-line" aria-label="Связанные подборы кронштейнов">
          {contextLinks.map((item) => (
            <a
              className="flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 font-display font-bold first:border-t-0"
              href={item.href}
              key={item.href}
            >
              {item.label} <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            </a>
          ))}
        </nav>

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

function SummaryFact({ label, value, verified = false }) {
  return (
    <div className="bg-paper p-5">
      <p className="font-mono text-xs uppercase text-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl font-extrabold ${verified ? "text-verified" : "text-ink"}`}>
        {value}
      </p>
    </div>
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
                    <p className="mt-2 font-mono text-xs">VESA {model.vesa_width_mm}×{model.vesa_height_mm} мм · {formatNumber(model.weight_kg)} кг {modelWeightSuffix(model)}</p>
                    {conditional && warnings.length ? (
                      <p className="mt-2 text-sm leading-relaxed text-action">{warnings.join(" · ")}</p>
                    ) : null}
                  </div>
                  <a className="secondary-button" href={modelHref(model)}>
                    Телевизор {model.title} <ArrowRight aria-hidden="true" />
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

function mountContextLinks(mount) {
  const links = [
    {
      href: "/kupit-kronshteyn-dlya-televizora/",
      label: "Сравнить все проверенные кронштейны",
    },
  ];
  if (mount.mechanism === "full-motion") {
    links.push({
      href: "/tipy-kronshteynov/vydvizhnoy/",
      label: "Выдвижные кронштейны и расчёт вылета",
    });
  }
  const mechanismHub = {
    fixed: {
      href: "/tipy-kronshteynov/fiksirovannyy/",
      label: "Фиксированные кронштейны",
    },
    tilt: {
      href: "/tipy-kronshteynov/naklonnyy/",
      label: "Наклонные кронштейны и расчёт угла",
    },
    "full-motion": {
      href: "/tipy-kronshteynov/povorotnyy/",
      label: "Поворотные кронштейны",
    },
  }[mount.mechanism];
  if (mechanismHub) {
    links.push(mechanismHub);
  }
  const brandKey = String(mount.brand ?? "").trim().toLocaleLowerCase("ru-RU");
  const brandHub = {
    holder: { href: "/kronshteyny-holder/", label: "Все кронштейны Holder" },
    itechmount: { href: "/kronshteyny-itechmount/", label: "Все кронштейны iTECHmount" },
    kromax: { href: "/kronshteyny-kromax/", label: "Все кронштейны KROMAX" },
    onkron: { href: "/kronshteyny-onkron/", label: "Все кронштейны ONKRON" },
    godoo: { href: "/kronshteyny-godoo/", label: "Все кронштейны GoDoo" },
  }[brandKey];
  if (brandHub) {
    links.push(brandHub);
  }
  return links;
}
