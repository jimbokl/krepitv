import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Crosshair,
  LockKey,
  MagnifyingGlass,
  Medal,
  Monitor,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";
import { Brand } from "../components/Brand.jsx";
import { MetrikaConsent } from "../components/MetrikaConsent.jsx";
import { ModelFacts } from "../components/ModelFacts.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { TrustMark } from "../components/TrustMark.jsx";
import { modelHref } from "../lib/catalog.js";
import { getHomeDiagnosticPages, getHomeFeaturedPages } from "../lib/seoPages.mjs";

const HOME_MODEL_SPOTLIGHT_ID = "tcl-65c7k";

export function HomePage({ catalog }) {
  const [query, setQuery] = useState("");
  const [selectedSearch, setSelectedSearch] = useState(null);
  const selectedModel = useMemo(
    () => catalog.models.find((model) => model.id === selectedSearch?.id),
    [catalog.models, selectedSearch],
  );
  const compatibleMountCount = useMemo(
    () =>
      selectedModel
        ? catalog.mounts.filter(
            (mount) =>
              mount.max_load_kg >= selectedModel.weight_kg * 1.25 &&
              mount.min_diagonal_in <= selectedModel.diagonal_inches &&
              mount.max_diagonal_in >= selectedModel.diagonal_inches &&
              mount.vesa.includes(`${selectedModel.vesa_width_mm}x${selectedModel.vesa_height_mm}`),
          ).length
        : 0,
    [catalog.mounts, selectedModel],
  );
  const featuredSeoPages = useMemo(
    () => getHomeFeaturedPages(catalog.seoPages, 7),
    [catalog.seoPages],
  );
  const diagnosticPages = useMemo(
    () => getHomeDiagnosticPages(catalog.seoPages),
    [catalog.seoPages],
  );
  const spotlightModel = useMemo(
    () => catalog.models.find((model) => model.id === HOME_MODEL_SPOTLIGHT_ID),
    [catalog.models],
  );

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-5 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-b border-line pb-5">
          <div className="flex items-center gap-6">
            <Brand />
            <p className="hidden max-w-48 border-l border-line pl-6 text-sm font-semibold leading-tight sm:block">
              точное крепление
              <br />
              для вашего телевизора
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 lg:w-auto lg:flex-1 lg:max-w-[560px]">
            <HeaderTrust Icon={ShieldCheck} text="Точные данные от производителей" />
            <HeaderTrust Icon={Medal} text="Сверено по источникам" />
            <HeaderTrust Icon={LockKey} text="Проверка вместо догадок" />
          </div>
        </header>

        <MetrikaConsent />

        <div className="my-4 flex items-center gap-3 font-mono text-[0.65rem] text-muted" aria-hidden="true">
          <span>0</span>
          <div className="h-px flex-1 bg-line" />
          <span>200</span>
          <div className="h-px flex-1 bg-line" />
          <span>400</span>
          <div className="h-px flex-1 bg-line" />
          <span>600</span>
          <div className="h-px flex-1 bg-line" />
          <span>800</span>
          <div className="h-px flex-1 bg-line" />
          <span>1000 мм</span>
        </div>

        <section className="grid items-center gap-6 pt-1 lg:grid-cols-[minmax(0,1.75fr)_minmax(26rem,1fr)]">
          <h1 className="max-w-[1000px] font-display text-[3.25rem] font-extrabold uppercase leading-[0.89] tracking-[-0.04em] sm:text-[clamp(3.8rem,6.1vw,6.2rem)]">
            Кронштейн для
            <br />
            вашего телевизора
          </h1>
          <div className="hidden min-h-64 items-center justify-center border-l border-dashed border-line lg:flex">
            <picture className="contents">
              <source srcSet="/assets/images/tv-vesa-diagram.avif" type="image/avif" />
              <source srcSet="/assets/images/tv-vesa-diagram.webp" type="image/webp" />
              <img
                alt="Задняя панель телевизора с отверстиями VESA 200×200 и боковой профиль"
                className="h-72 w-full object-contain"
                decoding="async"
                fetchPriority="high"
                height="1024"
                src="/assets/images/tv-vesa-diagram.png"
                width="1536"
              />
            </picture>
          </div>
        </section>

        <section className="relative z-20 mt-6" aria-label="Поиск телевизора">
          <ModelSearch
            onChange={setQuery}
            onSelect={setSelectedSearch}
            onSubmit={openModel}
            search={catalog.search}
            value={query}
          />
        </section>

        {selectedModel ? (
          <a
            className="mt-5 grid items-center gap-5 border-b border-line px-2 py-5 transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-action sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
            href={modelHref(selectedModel)}
          >
            <Monitor aria-hidden="true" className="mx-auto size-24" weight="thin" />
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                {selectedModel.title}
              </h2>
              <div className="mt-4">
                <ModelFacts model={selectedModel} />
              </div>
            </div>
            <div className="flex items-center gap-5 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <TrustMark compact label="Характеристики проверены" />
              <div className="border-l border-line pl-5 font-display">
                <span className="block text-sm font-bold">Подходят</span>
                <span className="block text-4xl font-extrabold leading-none text-action">{compatibleMountCount}</span>
                <span className="block text-sm font-bold">кронштейна</span>
              </div>
              <ArrowRight aria-hidden="true" className="size-8 shrink-0 text-action" />
            </div>
          </a>
        ) : null}

        {!selectedModel && spotlightModel ? (
          <a
            className="mt-5 grid items-center gap-4 border border-line bg-white px-5 py-5 transition hover:border-action focus:outline-none focus:ring-2 focus:ring-action sm:grid-cols-[minmax(0,1fr)_auto]"
            data-home-model-spotlight={spotlightModel.id}
            href={modelHref(spotlightModel)}
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
                Пример точной проверки
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                {spotlightModel.title}
              </h2>
              <div className="mt-3">
                <ModelFacts deferColumns model={spotlightModel} />
              </div>
            </div>
            <span className="flex items-center gap-3 font-semibold text-action">
              Открыть паспорт и крепления
              <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            </span>
          </a>
        ) : null}

        <section className="grid gap-7 border-b border-line py-8 lg:grid-cols-[23rem_repeat(3,minmax(0,1fr))]" id="kak-vybrat">
          <h2 className="font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">
            3 простых шага
            <br />
            к правильному креплению
          </h2>
          <Step number="1" Icon={MagnifyingGlass} title="Модель">
            Введите точную модель телевизора.
          </Step>
          <Step number="2" Icon={ShieldCheck} title="Проверка">
            Сверим VESA, массу и диагональ.
          </Step>
          <Step number="3" Icon={Wrench} title="Совместимые варианты">
            Покажем варианты, прошедшие технический фильтр.
          </Step>
        </section>

        <section className="grid gap-4 border-b border-line py-6 sm:grid-cols-2 lg:grid-cols-4" id="proverka">
          <Benefit Icon={Crosshair}>VESA в миллиметрах</Benefit>
          <Benefit Icon={Wrench}>Проверка ключевых параметров</Benefit>
          <Benefit Icon={CheckCircle}>Проверка по источнику</Benefit>
          <Benefit Icon={ShieldCheck}>Стену проверяйте отдельно</Benefit>
        </section>

        <section className="border-b border-line py-8" id="spravochniki">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
                Бесплатные инструменты
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">
                Справочники и калькуляторы
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Самостоятельно рассчитайте установку и проверьте технические параметры до
              выбора товара. Все инструменты доступны без покупки.
            </p>
          </div>
          <nav
            aria-label="Справочники и калькуляторы"
            className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
          >
            {featuredSeoPages.map((page) => (
              <a
                className="group relative flex min-h-28 items-end bg-paper px-3 py-4 pr-9 font-display text-base font-bold leading-snug transition hover:bg-white hover:text-action sm:p-5 sm:pr-12 sm:text-lg"
                data-featured-traffic-tool={page.id}
                href={page.path}
                key={page.id}
              >
                {page.h1.replace(/:.+$/, "")}
                <ArrowRight aria-hidden="true" className="absolute bottom-4 right-3 size-4 transition group-hover:translate-x-1 sm:bottom-5 sm:right-5 sm:size-5" />
              </a>
            ))}
          </nav>
          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
            <a className="text-action underline underline-offset-4" href="/modeli/">
              Все проверенные модели телевизоров
            </a>
            <a className="text-action underline underline-offset-4" href="/kronshteyny/">
              Все проверенные кронштейны
            </a>
          </div>
        </section>

        <section
          className="border-b border-line py-8"
          data-home-tv-diagnostics="true"
          id="diagnostika-televizora"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
                Без разборки и догадок
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">
                Диагностика телевизора
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Выберите наблюдаемый симптом. Мастер даст одну безопасную следующую проверку
              и остановится там, где нужна инструкция точной модели или официальная поддержка.
            </p>
          </div>
          <nav
            aria-label="Диагностика телевизора"
            className="mt-6 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 md:grid-cols-3"
            data-home-tv-diagnostics-count={diagnosticPages.length}
          >
            {diagnosticPages.map((page) => (
              <a
                className="group relative flex min-h-16 items-end bg-paper px-3 py-3 pr-9 font-display text-base font-bold leading-snug transition hover:bg-white hover:text-action sm:min-h-28 sm:p-5 sm:pr-12 sm:text-lg"
                data-home-tv-diagnostic={page.id}
                href={page.path}
                key={page.id}
              >
                {page.h1.replace(/:.+$/, "")}
                <ArrowRight aria-hidden="true" className="absolute bottom-3 right-3 size-4 transition group-hover:translate-x-1 sm:bottom-5 sm:right-5 sm:size-5" />
              </a>
            ))}
          </nav>
        </section>

        <div className="mt-6 flex justify-center">
          <a
            className="inline-flex items-center gap-3 border-b-2 border-action pb-1 font-display text-lg font-bold text-action"
            href="/podbor/"
          >
            Пройти пошаговый подбор <ArrowRight aria-hidden="true" className="size-5" />
          </a>
        </div>
      </div>
    </main>
  );
}

function HeaderTrust({ Icon, text }) {
  return (
    <div className="hidden items-center gap-3 text-sm leading-tight sm:flex">
      <Icon aria-hidden="true" className="size-9 shrink-0" weight="regular" />
      <span>{text}</span>
    </div>
  );
}

function Step({ number, Icon, title, children }) {
  return (
    <article className="relative grid grid-cols-[3.5rem_1fr] gap-4">
      <span className="absolute -top-2 left-0 flex size-8 items-center justify-center rounded-full bg-action font-display text-lg font-bold text-white">
        {number}
      </span>
      <Icon aria-hidden="true" className="mt-6 size-14" weight="regular" />
      <div>
        <h3 className="font-display text-xl font-bold uppercase">{title}</h3>
        <p className="mt-2 text-sm leading-snug text-muted">{children}</p>
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-verified">
          <Check aria-hidden="true" /> Только проверенные данные
        </p>
      </div>
    </article>
  );
}

function Benefit({ Icon, children }) {
  return (
    <div className="flex items-center gap-4 border-r border-line last:border-r-0">
      <Icon aria-hidden="true" className="size-8 shrink-0" weight="regular" />
      <span className="text-sm">{children}</span>
    </div>
  );
}
