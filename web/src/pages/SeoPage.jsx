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
import AffiliateOffer from "../components/AffiliateOffer.jsx";
import { EditorialAccountability } from "../components/EditorialAccountability.jsx";
import { BrandMountMatcher } from "../components/BrandMountMatcher.jsx";
import { CatalogBrandGroups } from "../components/CatalogBrandGroups.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import {
  PhoneTvConnectionReference,
  PhoneTvConnectionWizard,
} from "../components/PhoneTvConnectionWizard.jsx";
import {
  TvNoSignalReference,
  TvNoSignalWizard,
} from "../components/TvNoSignalWizard.jsx";
import {
  TvTrafficTaskReference,
  TvTrafficTaskWizard,
} from "../components/TvTrafficTaskWizard.jsx";
import { TvEnergyCalculator } from "../components/TvEnergyCalculator.jsx";
import { MountingMapCalculator } from "../components/MountingMapCalculator.jsx";
import { MountFunnelNextStep } from "../components/MountFunnelNextStep.jsx";
import { HeightCalculator } from "../components/HeightCalculator.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { TiltAngleCalculator } from "../components/TiltAngleCalculator.jsx";
import { TurnClearanceCalculator } from "../components/TurnClearanceCalculator.jsx";
import { TvMountScrewCatalog } from "../components/TvMountScrewCatalog.jsx";
import { TvVesaCatalog } from "../components/TvVesaCatalog.jsx";
import { TvZoneSocketCalculator } from "../components/TvZoneSocketCalculator.jsx";
import { TvDimensionsCalculator } from "../components/TvDimensionsCalculator.jsx";
import { TvDimensionsReference } from "../components/TvDimensionsReference.jsx";
import { VesaMatchCalculator } from "../components/VesaMatchCalculator.jsx";
import { ViewingDistanceCalculator } from "../components/ViewingDistanceCalculator.jsx";
import { WallPlannerCalculator } from "../components/WallPlannerCalculator.jsx";
import { modelHref } from "../lib/catalog.js";
import { buildEditorialEvidence } from "../lib/editorialPolicy.mjs";
import { modelWeightSuffix } from "../lib/modelWeight.js";
import {
  getCatalogItems,
  selectSeoHubAffiliateOffers,
} from "../lib/seoCatalogItems.mjs";
import { getRelatedPages, isIndexableSeoPage } from "../lib/seoPages.mjs";

const kindLabels = {
  guide: "Практическое руководство",
  vesa: "Справочник VESA",
  diagonal: "Подбор по диагонали",
  brand: "Подбор по бренду",
  "mount-brand": "Кронштейны по бренду",
  mechanism: "Типы кронштейнов",
  commercial: "Сравнение кронштейнов",
  calculator: "Расчёт установки",
  screws: "Подбор винтов VESA",
};

const connectionPageIds = new Set([
  "phone-to-tv", "laptop-to-tv", "soundbar-to-tv", "smart-tv-box",
  "tv-speakers", "tv-headphones", "tv-antenna-connect", "digital-box-connect",
  "game-console-to-tv", "phone-tv-remote", "tv-keyboard-mouse", "tv-microphone",
]);

const diagnosticsPageIds = new Set([
  "tv-no-signal", "tv-sound-no-picture", "tv-no-sound", "tv-remote-not-working",
  "tv-turns-off", "tv-no-internet", "tv-usb-not-seen", "tv-wont-turn-on",
  "tv-freezes", "tv-dark-screen", "tv-youtube-recovery", "tv-flicker",
  "dead-pixel-test",
]);

const setupPageIds = new Set([
  "digital-channels", "picture-setup", "tv-firmware-update", "tv-app-install",
  "tv-factory-reset", "tv-storage-cleanup", "tv-model-lookup", "tv-aspect-ratio",
  "tv-disable-subtitles", "tv-disable-voice", "tv-game-mode",
]);

export function seoPageKindLabel(page) {
  if (connectionPageIds.has(page.id)) return "Подключение устройств";
  if (diagnosticsPageIds.has(page.id)) return "Диагностика телевизора";
  if (setupPageIds.has(page.id)) return "Настройка телевизора";
  if (page.id === "hide-tv-wires") return "Планирование установки";
  if (page.id === "tv-purchase-checklist") return "Проверка перед покупкой";
  if (page.id === "screen-cleaning") return "Уход за телевизором";
  if (page.id === "tv-energy-consumption") return "Расчёт электроэнергии";
  return kindLabels[page.kind] ?? "Технический справочник";
}

const buyMountShortlist = [
  ["itech-plb440nt", "Наклонный · экран ближе к стене"],
  ["itech-ptrb440ln", "Поворотно-выдвижной · для диагоналей до 55″"],
  ["itech-slt-460", "Для больших диагоналей · VESA до 600×400"],
];

const tvTrafficTaskByPageId = new Map([
  ["laptop-to-tv", "laptop-to-tv"],
  ["digital-channels", "digital-channels"],
  ["picture-setup", "picture-setup"],
  ["tv-sound-no-picture", "sound-but-no-picture"],
  ["tv-no-sound", "no-sound"],
  ["tv-remote-not-working", "remote-not-working"],
  ["tv-turns-off", "turns-off"],
  ["tv-no-internet", "no-internet"],
  ["tv-usb-not-seen", "usb-not-seen"],
  ["soundbar-to-tv", "soundbar-to-tv"],
  ["screen-cleaning", "screen-cleaning"],
  ["smart-tv-box", "smart-tv-box"],
  ["tv-speakers", "tv-speakers"],
  ["tv-headphones", "tv-headphones"],
  ["tv-firmware-update", "tv-firmware-update"],
  ["tv-app-install", "tv-app-install"],
  ["tv-factory-reset", "tv-factory-reset"],
]);

const trafficUtilityCtas = {
  "phone-to-tv": {
    title: "Проверьте размер экрана",
    description: "После подключения рассчитайте реальную ширину и высоту телевизора по диагонали.",
    href: "/razmery-televizora-po-diagonali/",
    label: "Рассчитать размеры",
    shortLabel: "Размеры телевизора",
  },
  "tv-no-signal": {
    title: "Подключаете телефон?",
    description: "Если сигнал ещё не появлялся, сначала выберите рабочий способ подключения телефона.",
    href: "/kak-podklyuchit-telefon-k-televizoru/",
    label: "Открыть мастер подключения",
    shortLabel: "Подключение телефона",
  },
  "laptop-to-tv": {
    title: "На экране нет изображения?",
    description: "Если способ подключения уже выбран, отделите неверный вход от питания источника и кабеля.",
    href: "/televizor-pishet-net-signala/",
    label: "Проверить сигнал",
    shortLabel: "Диагностика сигнала",
  },
  "digital-channels": {
    title: "Каналы внезапно пропали?",
    description: "Не запускайте поиск наугад: сначала определите, телевизор или внешняя приставка показывает сообщение.",
    href: "/televizor-pishet-net-signala/",
    label: "Проверить источник",
    shortLabel: "Диагностика сигнала",
  },
  "picture-setup": {
    title: "Сверьте размер и дистанцию",
    description: "Восприятие изображения зависит и от геометрии просмотра — проверьте диагональ относительно места зрителя.",
    href: "/rasstoyanie-do-televizora-i-diagonal/",
    label: "Рассчитать расстояние",
    shortLabel: "Расстояние просмотра",
  },
  "tv-sound-no-picture": {
    title: "На экране появилось сообщение?",
    description: "Если вместо полностью чёрного экрана телевизор показывает «Нет сигнала», используйте отдельную проверку входа и источника.",
    href: "/televizor-pishet-net-signala/",
    label: "Проверить источник сигнала",
    shortLabel: "Проверка сигнала",
  },
  "tv-no-sound": {
    title: "Пропало и изображение?",
    description: "Если звук остался, а экран стал чёрным, сначала отделите собственное меню телевизора от выбранного источника.",
    href: "/televizor-zvuk-est-izobrazheniya-net/",
    label: "Проверить чёрный экран",
    shortLabel: "Проверка изображения",
  },
  "tv-remote-not-working": {
    title: "Телевизор реагирует, но вход пуст?",
    description: "Когда управление восстановлено, сообщение «Нет сигнала» проверяется отдельно от самого пульта.",
    href: "/televizor-pishet-net-signala/",
    label: "Проверить источник сигнала",
    shortLabel: "Проверка сигнала",
  },
  "tv-turns-off": {
    title: "Экран гаснет, а звук остаётся?",
    description: "Если телевизор не выключается полностью, а только теряет изображение, используйте отдельную проверку чёрного экрана.",
    href: "/televizor-zvuk-est-izobrazheniya-net/",
    label: "Проверить изображение",
    shortLabel: "Диагностика изображения",
  },
  "tv-no-internet": {
    title: "Нужно открыть файл без интернета?",
    description: "Если задача — посмотреть медиафайл с обычной флешки, сначала проверьте, видит ли телевизор сам накопитель.",
    href: "/televizor-ne-vidit-fleshku/",
    label: "Проверить USB-флешку",
    shortLabel: "Диагностика USB",
  },
  "tv-usb-not-seen": {
    title: "Файл находится в онлайн-сервисе?",
    description: "Если вместо флешки используется приложение телевизора, отделите проблему сети от одного конкретного сервиса.",
    href: "/televizor-ne-podklyuchaetsya-k-internetu/",
    label: "Проверить подключение",
    shortLabel: "Диагностика интернета",
  },
  "soundbar-to-tv": {
    title: "Подключили, но звука нет?",
    description: "Отделите настройки выхода телевизора от кабеля и внешнего аудиоустройства.",
    href: "/net-zvuka-na-televizore/",
    label: "Проверить звук",
    shortLabel: "Диагностика звука",
  },
  "screen-cleaning": {
    title: "Экран уже чистый?",
    description: "Сравните несколько обратимых настроек изображения без копирования чужих чисел.",
    href: "/nastroyka-izobrazheniya-televizora/",
    label: "Настроить изображение",
    shortLabel: "Настройка изображения",
  },
  "smart-tv-box": {
    title: "Приставка включена, но сигнала нет?",
    description: "Проверьте выбранный вход, питание источника и кабель как отдельные причины.",
    href: "/televizor-pishet-net-signala/",
    label: "Проверить сигнал",
    shortLabel: "Диагностика сигнала",
  },
  "tv-speakers": {
    title: "Нужен звук для одного зрителя?",
    description: "Сопоставьте выход телевизора с проводным или Bluetooth-путём точных наушников.",
    href: "/kak-podklyuchit-naushniki-k-televizoru/",
    label: "Открыть мастер наушников",
    shortLabel: "Подключение наушников",
  },
  "tv-headphones": {
    title: "Нужен звук для комнаты?",
    description: "Проверьте общий аудиопуть телевизора и активной акустики без случайного переходника.",
    href: "/kak-podklyuchit-kolonki-k-televizoru/",
    label: "Открыть мастер колонок",
    shortLabel: "Подключение колонок",
  },
  "tv-energy-consumption": {
    title: "Телевизор выключается сам?",
    description: "Отделите обычный режим ожидания и таймеры от опасного или повторяющегося отключения.",
    href: "/televizor-sam-vyklyuchaetsya/",
    label: "Проверить отключение",
    shortLabel: "Диагностика отключения",
  },
  "tv-firmware-update": {
    title: "Нужно установить приложение?",
    description: "После обновления проверьте приложение в официальном магазине именно вашей платформы и региона.",
    href: "/kak-ustanovit-prilozhenie-na-televizor/",
    label: "Открыть мастер приложений",
    shortLabel: "Установка приложения",
  },
  "tv-app-install": {
    title: "Магазин не открывается?",
    description: "Отделите отсутствие приложения от проблемы сети во всех онлайн-сервисах телевизора.",
    href: "/televizor-ne-podklyuchaetsya-k-internetu/",
    label: "Проверить подключение",
    shortLabel: "Диагностика интернета",
  },
  "tv-factory-reset": {
    title: "Телевизор выключается сам?",
    description: "Перед удалением данных проверьте таймеры, внешние устройства и опасные признаки отдельным мастером.",
    href: "/televizor-sam-vyklyuchaetsya/",
    label: "Проверить отключения",
    shortLabel: "Диагностика отключений",
  },
};

export function SeoPage({ catalog, page, requestedPath }) {
  if (!page) {
    return <SeoNotFound catalog={catalog} requestedPath={requestedPath} />;
  }

  return <SeoArticle catalog={catalog} page={page} />;
}

function SeoArticle({ catalog, page }) {
  const [query, setQuery] = useState("");
  const prioritizesBrandComparison = page.id === "mount-brand-onkron";
  const prioritizesBuyComparison = page.id === "buy-tv-mount";
  const prioritizesScrewLookup = page.id === "tv-mount-screws";
  const prioritizesVesaLookup = page.id === "vesa";
  const prioritizesWallPlanner = page.id === "wall-planner";
  const prioritizesTvDimensions = page.id === "tv-dimensions";
  const prioritizesPhoneTvConnection = page.id === "phone-to-tv";
  const prioritizesTvNoSignal = page.id === "tv-no-signal";
  const prioritizesTvEnergy = page.id === "tv-energy-consumption";
  const prioritizesEvidenceGuide = Boolean(page.guide);
  const tvTrafficTask = tvTrafficTaskByPageId.get(page.id);
  const prioritizesTvTrafficTask = Boolean(tvTrafficTask);
  const prioritizesTrafficUtility = prioritizesPhoneTvConnection || prioritizesTvNoSignal
    || prioritizesTvTrafficTask || prioritizesTvEnergy || prioritizesEvidenceGuide;
  const prioritizesPrimaryLookup = prioritizesScrewLookup
    || prioritizesVesaLookup
    || prioritizesWallPlanner
    || prioritizesTvDimensions
    || prioritizesTrafficUtility;
  const topFacts = ["wall-mounted-tv", "mounting-map", "tv-zone-sockets", "tilt-mount", "vesa", "tv-mount-screws"].includes(page.id)
    ? page.facts.slice(0, 3)
    : page.facts;
  const relatedPages = useMemo(
    () => getRelatedPages(page, catalog.seoPages),
    [catalog.seoPages, page],
  );
  const catalogItems = useMemo(
    () => getCatalogItems(page, catalog),
    [catalog, page],
  );
  const affiliateOffers = useMemo(
    () => selectSeoHubAffiliateOffers(
      page,
      catalogItems,
      catalog.hubAffiliateOffers,
    ),
    [catalog.hubAffiliateOffers, catalogItems, page],
  );
  const buyComparisonItems = useMemo(() => {
    if (!prioritizesBuyComparison) return [];
    const mountsById = new Map(catalog.mounts.map((mount) => [mount.id, mount]));
    return buyMountShortlist
      .map(([id, scenario]) => {
        const mount = mountsById.get(id);
        return mount ? { ...mount, scenario } : null;
      })
      .filter(Boolean);
  }, [catalog.mounts, prioritizesBuyComparison]);
  const trafficUtilityCta = trafficUtilityCtas[page.id];
  const pageKindLabel = seoPageKindLabel(page);
  const editorialEvidence = buildEditorialEvidence({
    checkedAt: page.guide?.updated_at ?? "2026-08-08",
    contentKind: page.guide ? "seo-reviewed" : "seo-calculated",
  });

  usePageMetadata(page.title, page.description, page.path);

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="mx-auto min-w-0 max-w-[1440px] px-5 pb-16 pt-6 [overflow-wrap:anywhere] sm:px-8">
        <Breadcrumbs items={[
          { href: "/", label: "Главная" },
          { href: "/spravochnik/", label: "Справочник" },
          { label: page.h1 },
        ]} />

        <header className="mt-5 border-b-2 border-ink pb-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            {pageKindLabel}
          </p>
          <h1 className={`mt-3 max-w-[1180px] font-display font-extrabold leading-[0.92] tracking-[-0.035em] [overflow-wrap:anywhere] ${
            ["tv-zone-sockets", "tilt-mount", "vesa", "wall-planner", "tv-dimensions", "phone-to-tv", "tv-no-signal"].includes(page.id)
              || prioritizesTvTrafficTask || prioritizesTvEnergy
              ? "text-[min(4.4rem,11vw)]"
              : ["wall-mounted-tv", "mounting-map"].includes(page.id)
              ? "text-[clamp(3rem,4.6vw,5rem)]"
              : "text-[clamp(3rem,6vw,6.4rem)]"
          }`}>
            {page.h1}
          </h1>
          <p className="mt-6 max-w-[1000px] text-lg leading-relaxed text-muted sm:text-xl">
            {page.lead}
          </p>
        </header>

        <EditorialAccountability evidence={editorialEvidence} />

        {!prioritizesPrimaryLookup && !prioritizesBrandComparison ? (
          <section
            className={`${["tv-zone-sockets", "tilt-mount", "vesa"].includes(page.id) ? "hidden sm:grid" : "grid"} divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0`}
            aria-label="Ключевые факты"
          >
            {topFacts.map((fact, index) => (
              <article className="flex gap-4 px-1 py-5 first:pl-0 sm:px-6 sm:first:pl-0" key={fact}>
                <span className="font-display text-3xl font-extrabold text-action">{index + 1}</span>
                <p className="text-sm leading-relaxed sm:text-base">{fact}</p>
              </article>
            ))}
          </section>
        ) : null}

        {prioritizesBrandComparison ? (
          <>
            <BrandMountMatcher
              affiliateOffers={catalog.affiliateOffers}
              brand="ONKRON"
              models={catalog.models}
              mounts={catalog.mounts}
              search={catalog.search}
            />
            <CatalogEvidence items={catalogItems} page={page} />
            <SeoHubOffers offers={affiliateOffers} page={page} />
          </>
        ) : null}

        {page.id === "mounting-height" ? <HeightCalculator /> : null}
        {page.id === "viewing-distance" ? <ViewingDistanceCalculator /> : null}
        {prioritizesPhoneTvConnection ? (
          <>
            <PhoneTvConnectionWizard />
            <PhoneTvConnectionReference />
          </>
        ) : null}
        {prioritizesTvNoSignal ? (
          <>
            <TvNoSignalWizard />
            <TvNoSignalReference />
          </>
        ) : null}
        {prioritizesTvTrafficTask ? (
          <>
            <TvTrafficTaskWizard task={tvTrafficTask} />
            <TvTrafficTaskReference task={tvTrafficTask} />
          </>
        ) : null}
        {prioritizesTvEnergy ? <TvEnergyCalculator /> : null}
        {prioritizesEvidenceGuide ? <SeoEvidenceGuide guide={page.guide} pageId={page.id} /> : null}
        {prioritizesTvDimensions ? (
          <>
            <TvDimensionsCalculator models={catalog.models} search={catalog.search} />
            <TvDimensionsReference />
          </>
        ) : null}
        {page.id === "wall-mounted-tv" ? <TurnClearanceCalculator /> : null}
        {page.id === "extendable-mount" ? <TurnClearanceCalculator /> : null}
        {page.id === "tilt-mount" ? <TiltAngleCalculator /> : null}
        {page.id === "mounting-map" ? <MountingMapCalculator /> : null}
        {prioritizesWallPlanner ? (
          <WallPlannerCalculator models={catalog.models} search={catalog.search} />
        ) : null}
        {page.id === "tv-zone-sockets" ? (
          <TvZoneSocketCalculator
            compatibilityEdges={catalog.compatibilityEdges}
            models={catalog.models}
            mounts={catalog.mounts}
            search={catalog.search}
          />
        ) : null}
        {prioritizesVesaLookup ? (
          <TvVesaCatalog
            compatibilityEdges={catalog.compatibilityEdges}
            models={catalog.models}
            search={catalog.search}
          />
        ) : null}
        {page.id === "vesa" ? <VesaMatchCalculator /> : null}
        {prioritizesScrewLookup ? (
          <TvMountScrewCatalog models={catalog.models} search={catalog.search} />
        ) : null}

        {!prioritizesPrimaryLookup && !prioritizesBrandComparison ? (
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
        ) : null}

        {prioritizesBuyComparison ? (
          <>
            <BuyMountComparison items={buyComparisonItems} />
            <SeoHubOffers offers={affiliateOffers} page={page} />
          </>
        ) : null}

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

            {!prioritizesBrandComparison && !prioritizesPrimaryLookup ? (
              <CatalogEvidence items={catalogItems} page={page} />
            ) : null}

            {!prioritizesBrandComparison && !prioritizesBuyComparison && !prioritizesPrimaryLookup ? (
              <SeoHubOffers offers={affiliateOffers} page={page} />
            ) : null}

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
            {!prioritizesTrafficUtility ? <PageVisual kind={page.kind} /> : null}

            <div className="border-2 border-ink bg-white p-5">
              <p className="font-display text-2xl font-bold">
                {trafficUtilityCta?.title ?? "Подбор без догадок"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {trafficUtilityCta?.description
                  ?? "Укажите модель, стену и нужный механизм. Проверка VESA и нагрузки выполняется по каталогу."}
              </p>
              <a
                className="primary-button mt-5 w-full"
                href={trafficUtilityCta?.href ?? "/podbor/"}
              >
                {trafficUtilityCta?.label ?? "Начать подбор"} <ArrowRight aria-hidden="true" />
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

        <MountFunnelNextStep />

        <section className="mt-12 border-t-2 border-ink pt-6" aria-labelledby="more-title" id="svyazannye-materialy">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-bold" id="more-title">Полезные материалы</h2>
            <a
              className="text-sm font-semibold text-action underline underline-offset-4"
              href={trafficUtilityCta?.href ?? "/podbor/"}
            >
              {trafficUtilityCta?.shortLabel ?? "Перейти к подбору"}
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

function SeoEvidenceGuide({ guide, pageId }) {
  const [selectedLabel, setSelectedLabel] = useState("");
  const selectedStep = guide.steps.find((step) => step.label === selectedLabel);

  return (
    <section
      className="border-y-2 border-ink py-7"
      data-evidence-guide={pageId}
      aria-labelledby={`${pageId}-guide-title`}
      id="мастер"
    >
      <nav className="mb-7 grid gap-2 border-y border-line py-4 font-display text-sm font-bold sm:grid-cols-2 lg:grid-cols-4" data-guide-toc="true" aria-label="Содержание руководства">
        <a className="underline decoration-line underline-offset-4 hover:text-action" href="#мастер">Инструмент</a>
        <a className="underline decoration-line underline-offset-4 hover:text-action" href="#granitsa">Граница проверки</a>
        <a className="underline decoration-line underline-offset-4 hover:text-action" href="#istochniki">Источники</a>
        <a className="underline decoration-line underline-offset-4 hover:text-action" href="#svyazannye-materialy">По теме</a>
      </nav>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
        {guide.kicker}
      </p>
      <h2 className="mt-2 max-w-4xl font-display text-3xl font-extrabold" id={`${pageId}-guide-title`}>
        {guide.heading}
      </h2>
      <p className="mt-3 max-w-4xl leading-relaxed text-muted">{guide.summary}</p>
      <fieldset className="mt-7 border-2 border-ink bg-white p-5" data-evidence-guide-tool="true">
        <legend className="px-2 font-display text-2xl font-extrabold">Что вы наблюдаете?</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {guide.steps.map((step) => (
            <button
              aria-pressed={selectedLabel === step.label}
              className={`min-h-14 border-2 px-4 py-3 text-left font-display font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                selectedLabel === step.label
                  ? "border-action bg-action text-white"
                  : "border-ink bg-paper hover:bg-white"
              }`}
              key={step.label}
              onClick={() => setSelectedLabel(step.label)}
              type="button"
            >
              {step.label}
            </button>
          ))}
        </div>
        <div aria-live="polite" className="mt-5 min-h-28 border-l-2 border-action pl-5" data-evidence-guide-result="true">
          {selectedStep ? (
            <>
              <p className="font-mono text-xs uppercase text-action">Ваш следующий шаг</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold">{selectedStep.title}</h3>
              <p className="mt-2 max-w-3xl leading-relaxed text-muted">{selectedStep.body}</p>
            </>
          ) : (
            <p className="max-w-2xl pt-3 leading-relaxed text-muted">
              Выберите ближайшую ситуацию — расчёт выполняется локально в браузере без регистрации и отправки данных.
            </p>
          )}
        </div>
      </fieldset>
      <h3 className="mt-7 font-display text-2xl font-extrabold [overflow-wrap:anywhere]" id={`${pageId}-guide-table-title`}>
        Таблица решений по наблюдаемому признаку
      </h3>
      <p className="mt-2 font-mono text-xs uppercase text-action sm:hidden">Таблица прокручивается вправо →</p>
      <div className="mt-4 overflow-x-auto border-2 border-ink">
        <table aria-labelledby={`${pageId}-guide-table-title`} className="w-full min-w-[720px] bg-white text-sm" data-evidence-guide-table="true">
          <thead>
            <tr className="bg-ink text-paper">
              <th className="p-4 text-left" scope="col">Ситуация</th>
              <th className="p-4 text-left" scope="col">Следующий шаг</th>
              <th className="p-4 text-left" scope="col">Как проверить</th>
            </tr>
          </thead>
          <tbody>
            {guide.steps.map((step) => (
              <tr className="border-t border-line align-top" data-evidence-guide-step={step.label} key={step.label}>
                <th className="p-4 text-left font-display text-lg" scope="row">{step.label}</th>
                <td className="p-4 font-semibold">{step.title}</td>
                <td className="p-4 leading-relaxed text-muted">{step.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-evidence-guide-stop="true" id="granitsa">
        {guide.stop}
      </p>
      <details className="mt-7 border border-line bg-white p-4" id="istochniki">
        <summary className="cursor-pointer font-display font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Официальные источники и границы проверки
        </summary>
        <nav className="mt-4 grid gap-3 text-sm font-semibold sm:grid-cols-2" aria-label="Официальные источники">
          {guide.sources.map((source) => (
            <a
              className="text-technical underline underline-offset-4"
              data-evidence-guide-source={source.id}
              href={source.url}
              key={source.id}
              rel="noreferrer"
              target="_blank"
            >
              {source.label}
            </a>
          ))}
        </nav>
        <p className="mt-4 font-mono text-xs text-muted">Материал проверен {guide.updated_at}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Редакционная проверка KREPI TV: выводы ограничены официальными инструкциями и наблюдаемыми признаками. <a className="font-semibold text-action underline underline-offset-4" href="/metodika/">Методика, источники и границы проверки</a>.
        </p>
      </details>
    </section>
  );
}

function BuyMountComparison({ items }) {
  if (!items.length) return null;

  return (
    <section
      aria-labelledby="buy-mount-comparison-title"
      className="border-y-2 border-ink py-8"
      data-buy-mount-comparison="true"
    >
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
        Короткий список перед покупкой
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold" id="buy-mount-comparison-title">
        Три разных сценария, а не три одинаковые карточки
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Сначала найдите точную модель телевизора. Затем сравните подходящий механизм,
        расстояние от стены, нагрузку и явную пару VESA — только после этого открывайте
        предложение на Маркете.
      </p>
      <div className="mt-5 border-b-2 border-ink">
        {items.map((item) => (
          <article
            className="grid gap-4 border-t border-line py-5 lg:grid-cols-[minmax(12rem,1.25fr)_minmax(8rem,0.75fr)_minmax(8rem,0.7fr)_minmax(9rem,0.85fr)_auto] lg:items-center"
            data-buy-mount-comparison-item={item.id}
            key={item.id}
          >
            <div>
              <p className="font-mono text-[0.68rem] uppercase leading-relaxed text-action">
                {item.scenario}
              </p>
              <h3 className="mt-1 font-display text-2xl font-extrabold leading-tight">
                <a className="underline decoration-action decoration-2 underline-offset-4" href={`/kronshteyny/${item.id}/`}>
                  {item.title}
                </a>
              </h3>
              <p className="mt-1 text-sm text-muted">{mechanismLabel(item.mechanism)} механизм</p>
            </div>
            <ComparisonFact label="Диагональ">
              {formatNumber(item.min_diagonal_in)}–{formatNumber(item.max_diagonal_in)}″
            </ComparisonFact>
            <ComparisonFact label="Нагрузка">до {formatNumber(item.max_load_kg)} кг</ComparisonFact>
            <ComparisonFact label="От стены">{formatDistance(item)}</ComparisonFact>
            <a className="inline-flex items-center gap-2 font-semibold text-action" href={`/kronshteyny/${item.id}/`}>
              Проверить VESA <ArrowRight aria-hidden="true" />
            </a>
            <details className="group lg:col-span-5">
              <summary className="cursor-pointer list-none font-mono text-xs uppercase text-technical focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                {item.vesa.length} точных схем VESA <span aria-hidden="true" className="text-action">+</span>
              </summary>
              <p className="mt-3 break-words font-mono text-xs leading-6 text-muted">
                {item.vesa.join(" · ").replaceAll("x", "×")}
              </p>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function SeoHubOffers({ offers, page }) {
  if (!offers.length) return null;

  const titleId = `market-offers-${page.id}`;
  return (
    <section
      aria-labelledby={titleId}
      className="mt-10 border-t-2 border-ink pt-7"
      data-affiliate-hub={page.id}
    >
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
        Точные модели из каталога выше
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold" id={titleId}>
        Карточки кронштейнов на Яндекс Маркете
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Показываем только проверенные модели этого раздела. Перед переходом сверьте VESA,
        нагрузку и диапазон диагонали; актуальные условия зависят от региона и уточняются
        на стороне Маркета.
      </p>
      <div className="mt-5 grid gap-4">
        {offers.map((offer) => (
          <AffiliateOffer
            compact
            detailsHref={offer.page_path}
            key={offer.placement_id}
            offer={offer}
          />
        ))}
      </div>
    </section>
  );
}

function CatalogEvidence({ items, page }) {
  const isMountList = items.type === "mounts";
  const isMountBrand = page.kind === "mount-brand";
  const title = isMountBrand
    ? `Сравнение кронштейнов ${items.values[0]?.brand ?? "по бренду"}`
    : isMountList
      ? "Кронштейны из проверенного каталога"
      : "Модели из проверенной базы";

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
        <div className="mt-5">
          {isMountBrand ? (
            <MountBrandComparison items={items.values} />
          ) : (
            <CatalogBrandGroups
              countLabel={isMountList ? "Кронштейнов" : "Моделей"}
              items={items.values}
              listClassName="grid gap-3 sm:grid-cols-2"
              renderItem={(item) =>
              isMountList ? (
                <article className="border border-line bg-white/70 p-5" key={item.id}>
                  <h3 className="font-display text-xl font-bold">
                    <a className="underline decoration-action decoration-2 underline-offset-4" href={`/kronshteyny/${item.id}/`}>
                      {item.title}
                    </a>
                  </h3>
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
                      <dd className="mt-1 font-semibold">{formatNumber(item.weight_kg)} кг · {modelWeightSuffix(item)}</dd>
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
              )}
            />
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

function MountBrandComparison({ items }) {
  return (
    <div className="border-b-2 border-ink" data-mount-comparison="true">
      {items.map((item) => (
        <article
          className="grid gap-4 border-t border-line py-5 lg:grid-cols-[minmax(12rem,1.25fr)_minmax(8rem,0.75fr)_minmax(8rem,0.7fr)_minmax(9rem,0.85fr)_auto] lg:items-center"
          data-mount-comparison-item={item.id}
          key={item.id}
        >
          <div>
            <h3 className="font-display text-2xl font-extrabold leading-tight">
              <a className="underline decoration-action decoration-2 underline-offset-4" href={`/kronshteyny/${item.id}/`}>
                {item.title}
              </a>
            </h3>
            <p className="mt-1 text-sm text-muted">{mechanismLabel(item.mechanism)} механизм</p>
          </div>
          <ComparisonFact label="Диагональ">
            {formatNumber(item.min_diagonal_in)}–{formatNumber(item.max_diagonal_in)}″
          </ComparisonFact>
          <ComparisonFact label="Нагрузка">до {formatNumber(item.max_load_kg)} кг</ComparisonFact>
          <ComparisonFact label="От стены">{formatDistance(item)}</ComparisonFact>
          <a className="inline-flex items-center gap-2 font-semibold text-action" href={`/kronshteyny/${item.id}/`}>
            Открыть <ArrowRight aria-hidden="true" />
          </a>
          <details className="group lg:col-span-5">
            <summary className="cursor-pointer list-none font-mono text-xs uppercase text-technical focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
              {item.vesa.length} точных схем VESA <span aria-hidden="true" className="text-action">+</span>
            </summary>
            <p className="mt-3 break-words font-mono text-xs leading-6 text-muted">
              {item.vesa.join(" · ").replaceAll("x", "×")}
            </p>
          </details>
        </article>
      ))}
    </div>
  );
}

function ComparisonFact({ children, label }) {
  return (
    <dl className="text-sm">
      <dt className="font-mono text-[0.68rem] uppercase text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </dl>
  );
}

function PageVisual({ kind }) {
  const mechanisms = ["mechanism", "mount-brand", "commercial"].includes(kind);
  return (
    <figure className="border-b border-line pb-5">
      <picture className="contents">
        <source
          srcSet={mechanisms ? "/assets/images/mount-mechanisms.avif" : "/assets/images/mount-wall-system.avif"}
          type="image/avif"
        />
        <source
          srcSet={mechanisms ? "/assets/images/mount-mechanisms.webp" : "/assets/images/mount-wall-system.webp"}
          type="image/webp"
        />
        <img
          alt={mechanisms ? "Фиксированный, наклонный и поворотный механизмы" : "Устройство крепления телевизора к стене"}
          className={`w-full object-contain ${mechanisms ? "aspect-[2.11/1]" : "aspect-[1.77/1]"}`}
          decoding="async"
          height={mechanisms ? 663 : 791}
          loading="lazy"
          src={mechanisms ? "/assets/images/mount-mechanisms.png" : "/assets/images/mount-wall-system.png"}
          width="1400"
        />
      </picture>
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
          {catalog.seoPages.filter(isIndexableSeoPage).slice(0, 6).map((item) => (
            <a className="flex min-h-28 items-end justify-between gap-4 bg-paper p-5 font-display text-xl font-bold transition hover:bg-white hover:text-action" href={item.path} key={item.id}>
              {shortTitle(item)} <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </main>
  );
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

function mechanismLabel(value) {
  if (value === "fixed") return "Фиксированный";
  if (value === "tilt") return "Наклонный";
  if (value === "full-motion") return "Поворотный";
  return "Механизм не указан";
}
