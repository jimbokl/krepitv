import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  ArrowsVertical,
  CaretDown,
  CheckCircle,
  HouseLine,
  Info,
  PushPin,
  Question,
  Stack,
} from "@phosphor-icons/react";
import { Brand } from "../components/Brand.jsx";
import { MetrikaConsent } from "../components/MetrikaConsent.jsx";
import { ModelFacts } from "../components/ModelFacts.jsx";
import { MountDetailLink } from "../components/MountDetailLink.jsx";
import { TrustMark } from "../components/TrustMark.jsx";
import { useCompatibility } from "../hooks/useCompatibility.js";
import { selectAffiliateOffer } from "../lib/affiliateOffer.mjs";
import { modelHref, mountHref } from "../lib/catalog.js";
import { groupCatalogItemsByBrand } from "../lib/catalogGroups.mjs";
import { modelWeightSuffix } from "../lib/modelWeight.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { pluralizeRu } from "../lib/russianGrammar.js";

const wallOptions = [
  {
    id: "solid",
    title: "Бетон или кирпич",
    description: "Сплошное минеральное основание",
    Icon: HouseLine,
  },
  {
    id: "block",
    title: "Блок или многослойная стена",
    description: "Основание требует отдельной проверки крепежа",
    Icon: Stack,
  },
  {
    id: "unknown",
    title: "Не знаю",
    description: "Сохраним пометку для проверки основания",
    Icon: Question,
  },
];

const mechanisms = [
  {
    id: "fixed",
    title: "Без регулировки",
    description: "Минимальное расстояние до стены",
    Icon: PushPin,
  },
  {
    id: "tilt",
    title: "С наклоном",
    description: "Можно изменить вертикальный угол",
    Icon: ArrowsVertical,
  },
  {
    id: "full-motion",
    title: "Поворотный",
    description: "Выдвижение, наклон и поворот",
    Icon: ArrowsClockwise,
  },
];

export function getGuidedBrandOptions(models) {
  const counts = new Map();
  for (const model of models) {
    if (typeof model?.brand !== "string" || !model.brand.trim()) continue;
    counts.set(model.brand, (counts.get(model.brand) ?? 0) + 1);
  }
  return Array.from(counts, ([brand, count]) => ({ brand, count })).sort(
    (left, right) => right.count - left.count
      || left.brand.localeCompare(right.brand, "ru-RU"),
  );
}

export function getGuidedModelOptions(models, brand) {
  if (typeof brand !== "string" || !brand) return [];
  return models
    .filter(
      (model) => model?.brand === brand
        && typeof model.id === "string"
        && typeof model.title === "string",
    )
    .sort((left, right) => left.title.localeCompare(right.title, "ru-RU", {
      numeric: true,
      sensitivity: "base",
    }));
}

export function findGuidedModel(models, brand, modelId) {
  return models.find(
    (model) => model?.id === modelId && model.brand === brand,
  ) ?? null;
}

export function GuidedSelectionPage({ catalog }) {
  const queryModelId = new URLSearchParams(window.location.search).get("model");
  const initialModel = catalog.models.find((model) => model.id === queryModelId) ?? null;
  const brandOptions = useMemo(
    () => getGuidedBrandOptions(catalog.models),
    [catalog.models],
  );
  const [step, setStep] = useState(initialModel ? 2 : 1);
  const [brand, setBrand] = useState(initialModel?.brand ?? "");
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [wall, setWall] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [compatibilityAttempt, setCompatibilityAttempt] = useState(0);
  const mechanismSelectionRef = useRef(null);
  const emittedSelectionRef = useRef(0);
  const nextSelectionIdRef = useRef(0);
  const modelOptions = useMemo(
    () => getGuidedModelOptions(catalog.models, brand),
    [brand, catalog.models],
  );
  const compatibility = useCompatibility(
    step >= 4 && mechanism ? selectedModel : null,
    catalog.mounts,
    mechanism,
    compatibilityAttempt,
  );
  const compatible = useMemo(
    () => compatibility.matches.filter((item) => item.compatible),
    [compatibility.matches],
  );
  const availableOfferMountIds = useMemo(
    () => new Set(
      catalog.mounts
        .filter((mount) => selectAffiliateOffer(catalog.affiliateOffers, {
          entityId: mount.id,
          entityKind: "mount",
          pagePath: mountHref(mount),
        }))
        .map((mount) => mount.id),
    ),
    [catalog.affiliateOffers, catalog.mounts],
  );

  useEffect(() => {
    const selection = mechanismSelectionRef.current;
    if (
      !selection ||
      emittedSelectionRef.current === selection.id ||
      selection.modelId !== selectedModel?.id ||
      selection.mechanism !== mechanism ||
      selection.compatibilityAtSelection === compatibility ||
      compatibility.status !== "ready" ||
      compatible.length === 0
    ) {
      return;
    }

    emittedSelectionRef.current = selection.id;
    emitResultCompleted(window, {
      toolId: "mount_match",
      resultType: "compatible_matches",
      resultCount: compatible.length,
    });
  }, [compatibility, compatible.length, mechanism, selectedModel?.id]);

  function changeBrand(nextBrand) {
    const validBrand = brandOptions.some((option) => option.brand === nextBrand)
      ? nextBrand
      : "";
    mechanismSelectionRef.current = null;
    setBrand(validBrand);
    setSelectedModel(null);
    setWall("");
    setMechanism("");
    setCompatibilityAttempt(0);
  }

  function submitBrand(event) {
    event.preventDefault();
    if (!brandOptions.some((option) => option.brand === brand)) return;
    setStep(2);
  }

  function changeModel(modelId) {
    const model = findGuidedModel(catalog.models, brand, modelId);
    mechanismSelectionRef.current = null;
    setSelectedModel(model);
    setWall("");
    setMechanism("");
    setCompatibilityAttempt(0);
  }

  function submitModel(event) {
    event.preventDefault();
    const model = findGuidedModel(catalog.models, brand, selectedModel?.id);
    if (!model) return;
    mechanismSelectionRef.current = null;
    setMechanism("");
    setSelectedModel(model);
    setCompatibilityAttempt(0);
    setStep(3);
  }

  function selectWall(nextWall) {
    mechanismSelectionRef.current = null;
    setWall(nextWall);
    setMechanism("");
    setCompatibilityAttempt(0);
  }

  function selectMechanism(nextMechanism) {
    const id = nextSelectionIdRef.current + 1;
    nextSelectionIdRef.current = id;
    mechanismSelectionRef.current = {
      id,
      modelId: selectedModel?.id ?? null,
      mechanism: nextMechanism,
      compatibilityAtSelection: compatibility,
    };
    setMechanism(nextMechanism);
    setCompatibilityAttempt(0);
  }

  return (
    <>
      <MetrikaConsent />
      <main
        className="min-h-screen bg-paper text-ink"
        data-guided-selection-page="true"
        data-guided-selection-step={step}
      >
        <div className="mx-auto grid min-h-screen max-w-[1487px] lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="border-b border-line bg-panel px-5 py-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
          <Brand compact />
          <p className="mt-3 max-w-48 text-sm leading-snug text-muted">
            Точный подбор кронштейна и крепежа для вашего телевизора
          </p>

          <ol className="mt-7 grid grid-cols-4 lg:mt-16 lg:block" aria-label="Шаги подбора">
            <RailStep current={step} number={1} title="Марка" total={4} />
            <RailStep current={step} number={2} title="Модель" total={4} />
            <RailStep current={step} number={3} title="Стена" total={4} />
            <RailStep current={step} number={4} title="Кронштейн" total={4} />
          </ol>

          <div className="mt-8 hidden items-start gap-3 text-verified lg:flex lg:pt-56">
            <CheckCircle aria-hidden="true" className="size-10 shrink-0" weight="regular" />
            <p className="text-sm leading-snug">
              Мы проверяем.
              <br />
              Вы монтируете уверенно.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <section className="border-b border-line px-5 py-8 sm:px-10 lg:px-12">
            <p className="font-mono text-xs uppercase tracking-wide text-muted">
              Шаг {step} из 4
            </p>
            <h1 className="mt-2 break-words font-display text-4xl font-extrabold leading-none sm:text-5xl lg:text-6xl">
              {step === 1 && "Сначала выберите марку телевизора"}
              {step === 2 && `Теперь выберите точную модель ${brand}`}
              {step === 3 && "Уточним основание стены"}
              {step === 4 && "Выберем механизм кронштейна"}
            </h1>
            <p className="mt-4 max-w-[900px] break-words text-lg leading-relaxed text-muted sm:text-xl">
              {step === 1 &&
                "Так мы сразу уберём модели других производителей и сократим поиск до подходящей части проверенного каталога."}
              {step === 2 &&
                "Выберите код модели из проверенного списка этой марки. Код можно сверить с шильдиком на задней панели."}
              {step === 3 &&
                "Тип стены влияет на крепёж. Мы сохраним ваш выбор отдельно от проверки VESA и нагрузки."}
              {step === 4 &&
                "Укажите нужную подвижность. Совместимость посчитаем локально по VESA, диагонали и запасу нагрузки."}
            </p>

            <div className="relative z-20 mt-7">
              {step === 1 ? (
                <form data-guided-brand-step="true" onSubmit={submitBrand}>
                  <label className="block font-display text-lg font-bold" htmlFor="guided-tv-brand">
                    Марка телевизора
                  </label>
                  <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative min-w-0">
                      <select
                        autoFocus
                        className="h-[4.4rem] w-full min-w-0 appearance-none rounded-md border-2 border-ink bg-white px-3 pr-10 text-base text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20 sm:px-5 sm:pr-14 sm:text-xl"
                        id="guided-tv-brand"
                        onChange={(event) => changeBrand(event.target.value)}
                        value={brand}
                      >
                        <option value="">Выберите марку</option>
                        {brandOptions.map((option) => (
                          <option key={option.brand} value={option.brand}>
                            {option.brand} — {option.count} {pluralizeRu(option.count, "модель", "модели", "моделей")}
                          </option>
                        ))}
                      </select>
                      <CaretDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-ink sm:right-5 sm:size-6" />
                    </div>
                    <button className="primary-button min-w-0 whitespace-normal break-words lg:w-auto" disabled={!brand} type="submit">
                      Выбрать модель <ArrowRight aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-3 font-mono text-xs text-muted">
                    {brandOptions.length} {pluralizeRu(brandOptions.length, "марка", "марки", "марок")} · {catalog.models.length} {pluralizeRu(catalog.models.length, "проверенная модель", "проверенные модели", "проверенных моделей")}
                  </p>
                </form>
              ) : null}

              {step === 2 ? (
                <form data-guided-model-step="true" onSubmit={submitModel}>
                  <label className="block font-display text-lg font-bold" htmlFor="guided-tv-model">
                    Модель телевизора
                  </label>
                  <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative min-w-0">
                      <select
                        autoFocus
                        className="h-[4.4rem] w-full min-w-0 appearance-none rounded-md border-2 border-ink bg-white px-3 pr-10 text-base text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20 sm:px-5 sm:pr-14 sm:text-xl"
                        id="guided-tv-model"
                        onChange={(event) => changeModel(event.target.value)}
                        value={selectedModel?.id ?? ""}
                      >
                        <option value="">Выберите</option>
                        {modelOptions.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.title}
                          </option>
                        ))}
                      </select>
                      <CaretDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-ink sm:right-5 sm:size-6" />
                    </div>
                    <button className="primary-button min-w-0 whitespace-normal break-words lg:w-auto" disabled={!selectedModel} type="submit">
                      Продолжить с моделью <ArrowRight aria-hidden="true" />
                    </button>
                  </div>
                  <p
                    className="mt-3 font-mono text-xs text-muted"
                    data-guided-model-count={modelOptions.length}
                  >
                    {modelOptions.length} {pluralizeRu(modelOptions.length, "проверенная модель", "проверенные модели", "проверенных моделей")} марки {brand}
                  </p>
                </form>
              ) : null}

              {step === 3 ? (
                <ChoiceGrid
                  label="Выберите тип стены"
                  onChange={selectWall}
                  options={wallOptions}
                  value={wall}
                />
              ) : null}

              {step === 4 ? (
                <ChoiceGrid
                  label="Выберите механизм кронштейна"
                  onChange={selectMechanism}
                  options={mechanisms}
                  value={mechanism}
                />
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-3">
                {step > 1 ? (
                  <button className="secondary-button" onClick={() => setStep(step - 1)} type="button">
                    <ArrowLeft aria-hidden="true" /> Назад
                  </button>
                ) : null}
                {step === 3 ? (
                  <button
                    className="primary-button"
                    disabled={!wall}
                    onClick={() => setStep(4)}
                    type="button"
                  >
                    Выбрать механизм <ArrowRight aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <TrustMark compact />
            </div>
          </section>

          {selectedModel ? (
            <section className="px-5 py-7 sm:px-10 lg:px-12">
              <div className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <div>
                  <p className="font-display text-lg font-bold">Результат для модели</p>
                  <a
                    className="mt-2 block font-display text-3xl font-bold text-verified hover:underline"
                    href={modelHref(selectedModel)}
                  >
                    {selectedModel.title}
                  </a>
                  <div className="mt-5">
                    <ModelFacts detailed model={selectedModel} />
                  </div>
                </div>

                <div data-guided-model-illustration="true">
                  <h2 className="font-display text-lg font-bold">
                    Как крепление соединяет телевизор со стеной
                  </h2>
                  <picture className="contents">
                    <source srcSet="/assets/images/mount-wall-system.avif" type="image/avif" />
                    <source srcSet="/assets/images/mount-wall-system.webp" type="image/webp" />
                    <img
                      alt="Система крепления телевизора: VESA-пластина, кронштейн, анкер и стена"
                      className="mt-4 aspect-[1.77/1] w-full object-contain"
                      decoding="async"
                      height="791"
                      loading="lazy"
                      src="/assets/images/mount-wall-system.png"
                      width="1400"
                    />
                  </picture>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-md border border-line bg-white/70 p-4 text-sm leading-relaxed">
                <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-verified" />
                <p>
                  <strong>Проверка по официальным данным производителя:</strong>{" "}
                  VESA {selectedModel.vesa_width_mm}×{selectedModel.vesa_height_mm}, масса {selectedModel.weight_kg} кг ({modelWeightSuffix(selectedModel)}) и диагональ {selectedModel.diagonal_inches}″ подтверждены. Тип стены используется только как пометка для последующего подбора крепежа.
                </p>
              </div>

              {step === 4 ? (
                <CompatibilityResult
                  availableOfferMountIds={availableOfferMountIds}
                  compatibility={compatibility}
                  matches={compatible}
                  model={selectedModel}
                  onRetry={() => setCompatibilityAttempt((attempt) => attempt + 1)}
                />
              ) : null}

              <p className="mt-6 font-mono text-xs text-muted">
                Источник данных: {selectedModel.source_label} · Дата проверки: {selectedModel.checked_at.split("-").reverse().join(".")}
              </p>
            </section>
          ) : null}
          </div>
        </div>
      </main>
    </>
  );
}

function RailStep({ current, number, title, total }) {
  const active = current === number;
  const done = current > number;
  return (
    <li className="relative flex items-center gap-4 pb-8 last:pb-0 lg:pb-24">
      <span
        aria-current={active ? "step" : undefined}
        className={`relative z-10 flex size-[clamp(44px,2.75rem,60px)] shrink-0 items-center justify-center rounded-full border text-lg font-bold ${active ? "border-action bg-action text-white" : done ? "border-verified bg-verified text-white" : "border-line bg-paper text-muted"}`}
      >
        {done ? <CheckCircle aria-hidden="true" className="size-6" weight="fill" /> : number}
      </span>
      <span className={`hidden text-base font-semibold sm:block ${active ? "text-action" : "text-muted"}`}>
        {title}
      </span>
      {number < total ? (
        <span className="absolute left-5 top-11 h-px w-[calc(100%-2.75rem)] bg-line lg:top-11 lg:h-[calc(100%-2.75rem)] lg:w-px" aria-hidden="true" />
      ) : null}
    </li>
  );
}

function ChoiceGrid({ label, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-3 md:grid-cols-3">
        {options.map(({ id, title, description, Icon }) => (
          <label
            className={`group cursor-pointer rounded-md border-2 p-5 transition focus-within:ring-2 focus-within:ring-action ${value === id ? "border-action bg-white" : "border-line bg-white/60 hover:border-ink"}`}
            key={id}
          >
            <input
              checked={value === id}
              className="sr-only"
              name={label}
              onChange={() => onChange(id)}
              type="radio"
              value={id}
            />
            <Icon aria-hidden="true" className={`size-9 ${value === id ? "text-action" : "text-ink"}`} weight="regular" />
            <span className="mt-4 block font-display text-xl font-bold">{title}</span>
            <span className="mt-1 block text-sm leading-snug text-muted">{description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CompatibilityResult({
  availableOfferMountIds = new Set(),
  compatibility,
  matches,
  model,
  onRetry,
}) {
  if (compatibility.status === "idle") {
    return (
      <p className="mt-7 text-muted" data-guided-compatibility-state="idle">
        Выберите механизм — после этого появятся подходящие варианты.
      </p>
    );
  }
  if (compatibility.status === "loading") {
    return (
      <p className="mt-7 text-muted" data-guided-compatibility-state="loading">
        Проверяем каталог кронштейнов…
      </p>
    );
  }
  if (compatibility.status === "error") {
    return (
      <div
        className="mt-7 rounded-md border border-danger p-4 text-danger"
        data-guided-compatibility-state="error"
        role="alert"
      >
        <p>{compatibility.error}</p>
        <button
          className="secondary-button mt-4 border-danger text-danger hover:bg-danger hover:text-white"
          onClick={onRetry}
          type="button"
        >
          Повторить проверку
        </button>
      </div>
    );
  }
  if (!matches.length) {
    return (
      <div
        className="mt-7 border-t-2 border-ink pt-5"
        data-guided-compatibility-state="empty"
      >
        <p className="font-display text-2xl font-bold">
          В проверенном каталоге пока нет подходящего варианта
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Попробуйте другой механизм или откройте характеристики телевизора,
          чтобы сверить VESA и нагрузку вручную.
        </p>
        <a className="secondary-button mt-4" href={modelHref(model)}>
          Характеристики телевизора <ArrowRight aria-hidden="true" />
        </a>
      </div>
    );
  }

  const rankedMatches = rankCompatibilityMatches(matches, availableOfferMountIds);
  const shortlist = rankedMatches.slice(0, 3);
  const remaining = rankedMatches.slice(3);
  const verifiedCount = rankedMatches.filter(
    (item) => item.fit_status === "verified-fit",
  ).length;
  const conditionalCount = rankedMatches.length - verifiedCount;
  const remainingSections = [
    {
      id: "verified",
      title: "Полностью проверены",
      items: remaining.filter((item) => item.fit_status === "verified-fit"),
    },
    {
      id: "conditional",
      title: "Нужно сверить диагональ",
      items: remaining.filter((item) => item.fit_status !== "verified-fit"),
    },
  ]
    .filter((section) => section.items.length)
    .map((section) => ({
      ...section,
      groups: groupCatalogItemsByBrand(section.items, (item) => item.mount.brand),
    }));

  return (
    <div
      className="mt-7 border-t-2 border-ink pt-5"
      data-guided-compatibility-state="success"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-bold">
            Найдено вариантов: {matches.length}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Полностью проверено: {verifiedCount}
            {conditionalCount ? ` · Нужна сверка диагонали: ${conditionalCount}` : ""}.
            Сначала показываем варианты с полной проверкой и более высокой
            технической оценкой. При одинаковой оценке выше варианты с доступной
            точной карточкой Маркета.
          </p>
        </div>
        <a className="text-sm font-semibold text-technical underline underline-offset-4" href={modelHref(model)}>
          Характеристики телевизора
        </a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-result-shortlist="true">
        {shortlist.map((match) => (
          <CompatibilityCard
            key={match.mount.id}
            match={match}
            marketCardAvailable={availableOfferMountIds.has(match.mount.id)}
            placement="featured_result"
          />
        ))}
      </div>

      {remaining.length ? (
        <details className="group mt-4 border-y border-line" data-result-catalog="collapsed">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
            <span>
              Показать ещё {remaining.length} {variantWord(remaining.length)} по брендам
            </span>
            <CaretDown aria-hidden="true" className="size-5 shrink-0 text-action transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-line pb-3">
            {remainingSections.map((section) => (
              <section className="border-b border-line py-5 last:border-b-0" key={section.id}>
                <h3 className={`font-mono text-xs uppercase ${section.id === "verified" ? "text-verified" : "text-action"}`}>
                  {section.title}: {section.items.length}
                </h3>
                {section.groups.map((group) => (
                  <div className="mt-5 first:mt-3" key={group.brand}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h4 className="font-display text-2xl font-extrabold">{group.brand}</h4>
                      <span className="font-mono text-xs uppercase text-muted">
                        Кронштейнов: {group.items.length}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {group.items.map((match) => (
                        <CompatibilityCard
                          compact
                          key={match.mount.id}
                          match={match}
                          marketCardAvailable={availableOfferMountIds.has(match.mount.id)}
                          placement="compatibility_result"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function CompatibilityCard({
  compact = false,
  marketCardAvailable = false,
  match,
  placement,
}) {
  const { mount, reasons = [], warnings = [], fit_status: fitStatus } = match;
  const verified = fitStatus === "verified-fit";

  return (
    <article
      className={`flex flex-col border bg-white ${compact ? "border-line p-4" : "border-ink p-5"}`}
      data-fit-status={fitStatus}
      data-market-card-available={marketCardAvailable ? "true" : "false"}
      data-result-tier={placement}
    >
      <p className={`font-mono text-[0.68rem] uppercase ${verified ? "text-verified" : "text-action"}`}>
        {verified
          ? "VESA, нагрузка и диагональ проверены"
          : "VESA и нагрузка совпали — проверьте диагональ"}
      </p>
      <h3 className="mt-2 font-display text-xl font-bold">
        <MountDetailLink href={mountHref(mount)} placement={placement}>
          {mount.title}
        </MountDetailLink>
      </h3>
      {marketCardAvailable ? (
        <p className="mt-2 text-xs font-semibold text-technical">
          На момент проверки есть точная карточка на Маркете
        </p>
      ) : null}
      <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
        {reasons.slice(0, compact ? 2 : 3).map((reason) => (
          <li className="flex gap-2" key={reason}>
            <CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" weight="fill" />
            <span>{reason}</span>
          </li>
        ))}
        {warnings.slice(0, 2).map((warning) => (
          <li className="flex gap-2 text-action" key={warning}>
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{warning}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4">
        <MountDetailLink
          className={compact ? "secondary-button" : "primary-button"}
          href={mountHref(mount)}
          placement={placement}
        >
          Проверить кронштейн <ArrowRight aria-hidden="true" />
        </MountDetailLink>
      </div>
    </article>
  );
}

export function rankCompatibilityMatches(matches, availableOfferMountIds = new Set()) {
  return (Array.isArray(matches) ? matches : [])
    .map((match, index) => ({ match, index }))
    .sort((left, right) => {
      const leftFitRank = left.match.fit_status === "verified-fit" ? 0 : 1;
      const rightFitRank = right.match.fit_status === "verified-fit" ? 0 : 1;
      if (leftFitRank !== rightFitRank) return leftFitRank - rightFitRank;

      const leftScore = Number.isFinite(left.match.score) ? left.match.score : null;
      const rightScore = Number.isFinite(right.match.score) ? right.match.score : null;
      if (leftScore !== null && rightScore !== null && leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      const leftOfferRank = availableOfferMountIds.has(left.match.mount.id) ? 0 : 1;
      const rightOfferRank = availableOfferMountIds.has(right.match.mount.id) ? 0 : 1;
      if (leftOfferRank !== rightOfferRank) return leftOfferRank - rightOfferRank;
      return left.index - right.index;
    })
    .map(({ match }) => match);
}

function variantWord(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "вариантов";
  if (mod10 === 1) return "вариант";
  if (mod10 >= 2 && mod10 <= 4) return "варианта";
  return "вариантов";
}
