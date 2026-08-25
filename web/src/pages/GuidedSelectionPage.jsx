import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowsClockwise, ArrowsVertical, CaretDown, CheckCircle, Info, PushPin, Ruler } from "@phosphor-icons/react";
import { Brand } from "../components/Brand.jsx";
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { InstallationKitResult } from "../components/installation-kit/InstallationKitResult.jsx";
import { KitOutcomePreview } from "../components/installation-kit/KitOutcomePreview.jsx";
import { KitStepRail } from "../components/installation-kit/KitStepRail.jsx";
import { MountChoiceStep } from "../components/installation-kit/MountChoiceStep.jsx";
import { PlacementCableStep } from "../components/installation-kit/PlacementCableStep.jsx";
import { WallProfileStep } from "../components/installation-kit/WallProfileStep.jsx";
import { MetrikaConsent } from "../components/MetrikaConsent.jsx";
import { ModelFacts } from "../components/ModelFacts.jsx";
import { MountDetailLink } from "../components/MountDetailLink.jsx";
import { TrustMark } from "../components/TrustMark.jsx";
import { useCompatibility } from "../hooks/useCompatibility.js";
import { useInstallationKit } from "../hooks/useInstallationKit.js";
import { selectAffiliateOffer } from "../lib/affiliateOffer.mjs";
import { modelHref, mountHref } from "../lib/catalog.js";
import { groupCatalogItemsByBrand } from "../lib/catalogGroups.mjs";
import { canAdvance, createInstallationKitState, getCompletedSteps, installationKitModelIdFromSearch, installationKitReducer } from "../lib/installationKitState.js";
import { modelWeightSuffix } from "../lib/modelWeight.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { pluralizeRu } from "../lib/russianGrammar.js";

const mechanisms = [
  { id: "fixed", title: "Без регулировки", description: "Минимальное расстояние до стены", Icon: PushPin },
  { id: "tilt", title: "С наклоном", description: "Можно изменить вертикальный угол", Icon: ArrowsVertical },
  { id: "full-motion", title: "Поворотный", description: "Выдвижение, наклон и поворот", Icon: ArrowsClockwise },
];

const STEP_COPY = {
  1: ["Сначала выберите марку телевизора", "Так мы исключим модели других производителей и оставим только точную часть проверенного каталога."],
  2: ["Теперь выберите точную модель", "Полный код можно сверить с шильдиком на задней панели. Похожая модель не считается заменой."],
  3: ["Как устроена стена", "Материал основания влияет только на секцию настенного крепежа и не подменяет проверку VESA."],
  4: ["Как должен двигаться телевизор", "Выберите механизм. Совместимость проверим локально по VESA, диагонали и нагрузке с запасом."],
  5: ["Выберите проверенный кронштейн", "В финал допускаются только варианты со статусом verified-fit. Условные совпадения не продаём."],
  6: ["Задайте высоты и подключения", "Получите персональную карту высот, кабельный план, инструменты и последовательность монтажа."],
};

export function getGuidedBrandOptions(models) {
  const counts = new Map();
  for (const model of models) {
    if (typeof model?.brand !== "string" || !model.brand.trim()) continue;
    counts.set(model.brand, (counts.get(model.brand) ?? 0) + 1);
  }
  return Array.from(counts, ([brand, count]) => ({ brand, count })).sort(
    (left, right) => right.count - left.count || left.brand.localeCompare(right.brand, "ru-RU"),
  );
}

export function getGuidedModelOptions(models, brand) {
  if (typeof brand !== "string" || !brand) return [];
  return models
    .filter((model) => model?.brand === brand && typeof model.id === "string" && typeof model.title === "string")
    .sort((left, right) => left.title.localeCompare(right.title, "ru-RU", { numeric: true, sensitivity: "base" }));
}

export function findGuidedModel(models, brand, modelId) {
  return models.find((model) => model?.id === modelId && model.brand === brand) ?? null;
}

export function verifiedCompatibilityMatches(matches) {
  return (Array.isArray(matches) ? matches : []).filter(
    (item) => item?.compatible === true && item.fit_status === "verified-fit",
  );
}

export function revealGuidedStep(heading) {
  if (!heading) return false;
  const stepContent = heading.closest?.('[data-guided-step-content="true"]') ?? heading;
  stepContent.scrollIntoView?.({ block: "start" });
  heading.focus?.({ preventScroll: true });
  return true;
}

export function shouldRevealInstallationKitResult(status, revision, revealedRevision) {
  return status === "ready" && revision > 0 && revision !== revealedRevision;
}

export function GuidedSelectionPage({ catalog }) {
  const queryModelId = installationKitModelIdFromSearch(window.location.search);
  const initialModel = catalog.models.find((model) => model.id === queryModelId) ?? null;
  const [state, dispatch] = useReducer(installationKitReducer, { model: initialModel }, createInstallationKitState);
  const [compatibilityAttempt, setCompatibilityAttempt] = useState(0);
  const emittedRevisionRef = useRef(-1);
  const revealedRevisionRef = useRef(-1);
  const resultRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const previousStepRef = useRef(state.step);
  const brandOptions = useMemo(() => getGuidedBrandOptions(catalog.models), [catalog.models]);
  const modelOptions = useMemo(() => getGuidedModelOptions(catalog.models, state.brand), [catalog.models, state.brand]);
  const selectedModel = useMemo(() => findGuidedModel(catalog.models, state.brand, state.modelId), [catalog.models, state.brand, state.modelId]);
  const compatibility = useCompatibility(selectedModel && state.mechanism ? selectedModel : null, catalog.mounts, state.mechanism ?? "any", compatibilityAttempt);
  const compatible = useMemo(() => rankCompatibilityMatches(verifiedCompatibilityMatches(compatibility.matches)), [compatibility.matches]);
  const selectedMatch = compatible.find((match) => match.mount.id === state.mountId) ?? null;
  const selectedMount = selectedMatch?.mount ?? null;
  const modelPortPassport = catalog.modelPorts?.models?.find((passport) => passport.model_id === selectedModel?.id) ?? null;
  const wallFixingRecommendation = catalog.wallFixingSystems?.exact_recommendations?.find(
    (item) => item.mount_id === selectedMount?.id && item.wall_profile === state.wallProfile,
  ) ?? null;
  const kitValues = useMemo(() => (
    selectedModel && selectedMount && state.placement && state.cables
      ? { model: selectedModel, mount: selectedMount, requestedMechanism: state.mechanism, wallProfile: state.wallProfile, placement: state.placement, cables: state.cables, modelPortPassport, wallFixingRecommendation }
      : null
  ), [modelPortPassport, selectedModel, selectedMount, state.cables, state.mechanism, state.placement, state.wallProfile, wallFixingRecommendation]);
  const kit = useInstallationKit(kitValues, state.revision);
  const affiliateOffer = selectedMount ? selectAffiliateOffer(catalog.affiliateOffers, { entityId: selectedMount.id, entityKind: "mount", pagePath: mountHref(selectedMount) }) : null;

  useEffect(() => {
    if (kit.status !== "ready" || emittedRevisionRef.current === state.revision) return;
    emittedRevisionRef.current = state.revision;
    emitResultCompleted(window, {
      toolId: "installation_kit",
      resultType: kit.plan.overall_status,
      resultCount: kit.plan.section_order?.length ?? 7,
      modelId: selectedModel.id,
      mountId: selectedMount.id,
    });
  }, [kit, selectedModel, selectedMount, state.revision]);

  useEffect(() => {
    if (previousStepRef.current === state.step) return;
    previousStepRef.current = state.step;
    revealGuidedStep(stepHeadingRef.current);
  }, [state.step]);

  useEffect(() => {
    if (!shouldRevealInstallationKitResult(kit.status, state.revision, revealedRevisionRef.current)) return;
    revealedRevisionRef.current = state.revision;
    revealGuidedStep(resultRef.current);
  }, [kit.status, state.revision]);

  const [heading, description] = STEP_COPY[state.step];
  function advance(event) {
    event?.preventDefault();
    dispatch({ type: "advance" });
  }

  return (
    <>
      <MetrikaConsent />
      <main className="min-h-screen bg-paper text-ink" data-guided-selection-page="true" data-guided-selection-step={state.step} data-kit-shell="true">
        <div className="mx-auto grid min-h-screen max-w-[1487px] lg:grid-cols-[16.5rem_minmax(0,1fr)]">
          <aside className="border-b border-line bg-panel px-5 py-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
            <Brand compact />
            <p className="mt-3 max-w-48 text-sm leading-snug text-muted">Полный монтажный комплект для точной модели телевизора</p>
            <div className="mt-5 flex items-center gap-3 border-y border-line py-3 font-mono text-[0.68rem] uppercase leading-relaxed text-muted" data-kit-ruler="true">
              <Ruler aria-hidden="true" className="size-5 shrink-0 text-action" />
              Шесть проверяемых шагов
            </div>
            <KitStepRail current={state.step} completed={getCompletedSteps(state)} onStep={(step) => dispatch({ type: "go-to-step", value: step })} />
            <div className="mt-8 hidden items-start gap-3 text-verified lg:flex lg:pt-24"><CheckCircle aria-hidden="true" className="size-9 shrink-0" /><p className="text-sm leading-snug">Каждый точный совет<br />подтверждён источником.</p></div>
          </aside>

          <div className="min-w-0">
            <section className="border-b border-line px-5 py-8 sm:px-10 lg:px-12" data-guided-step-content="true">
              <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Монтажный комплект" }]} />
              <p className="font-mono text-xs uppercase tracking-wide text-muted">Шаг {state.step} из 6</p>
              <h1 className="mt-2 break-words font-display text-4xl font-extrabold leading-none outline-none sm:text-5xl lg:text-6xl" ref={stepHeadingRef} tabIndex={-1}>{heading}{state.step === 2 && state.brand ? ` ${state.brand}` : ""}</h1>
              <p className="mt-4 max-w-[900px] text-lg leading-relaxed text-muted">{description}</p>
              <div className={state.step === 1 ? "mt-7 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)] xl:gap-12" : "mt-7"}>
                <div className="relative z-20 min-w-0">
                  {state.step === 1 ? <BrandStep brand={state.brand} brandOptions={brandOptions} catalogSize={catalog.models.length} onChange={(value) => dispatch({ type: "set-brand", value })} onSubmit={advance} /> : null}
                  {state.step === 2 ? <ModelStep brand={state.brand} modelId={state.modelId} modelOptions={modelOptions} onChange={(value) => dispatch({ type: "set-model", value })} onSubmit={advance} /> : null}
                  {state.step === 3 ? <WallProfileStep onChange={(value) => dispatch({ type: "set-wall-profile", value })} value={state.wallProfile} /> : null}
                  {state.step === 4 ? <ChoiceGrid label="Механизм кронштейна" onChange={(value) => dispatch({ type: "set-mechanism", value })} options={mechanisms} value={state.mechanism} /> : null}
                  {state.step === 5 ? <MountChoiceStep compatibility={compatibility} matches={compatible} onChange={(value) => dispatch({ type: "set-mount", value })} onRetry={() => setCompatibilityAttempt((value) => value + 1)} value={state.mountId} /> : null}
                  {state.step === 6 ? <PlacementCableStep onSubmit={({ placement, cables }) => { dispatch({ type: "set-placement", value: placement }); dispatch({ type: "set-cables", value: cables }); }} /> : null}
                </div>
                {state.step === 1 ? <KitOutcomePreview /> : null}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  {state.step > 1 ? <button className="secondary-button" onClick={() => dispatch({ type: "back" })} type="button"><ArrowLeft aria-hidden="true" />Назад</button> : null}
                  {state.step >= 3 && state.step < 6 ? <button className="primary-button" disabled={!canAdvance(state)} onClick={advance} type="button">Продолжить <ArrowRight aria-hidden="true" /></button> : null}
                </div>
                <TrustMark compact />
              </div>
            </section>
            {selectedModel ? <ModelSummary model={selectedModel} /> : null}
            {state.step === 6 ? <section className="px-5 pb-12 outline-none sm:px-10 lg:px-12" ref={resultRef} tabIndex={-1}>{kit.status === "loading" ? <p className="mt-7 text-muted">Собираем семь секций локально в браузере…</p> : null}{kit.status === "error" ? <p className="mt-7 border border-danger p-4 text-danger" role="alert">{kit.error}</p> : null}{kit.status === "ready" ? <InstallationKitResult model={selectedModel} mount={selectedMount} offer={affiliateOffer} plan={kit.plan} /> : null}</section> : null}
          </div>
        </div>
      </main>
    </>
  );
}

function BrandStep({ brand, brandOptions, catalogSize, onChange, onSubmit }) {
  return <form data-guided-brand-step="true" onSubmit={onSubmit}><label className="block font-display text-lg font-bold" htmlFor="guided-tv-brand">Марка телевизора</label><div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"><Select id="guided-tv-brand" onChange={onChange} value={brand}><option value="">Выберите марку</option>{brandOptions.map((option) => <option key={option.brand} value={option.brand}>{option.brand} — {option.count} {pluralizeRu(option.count, "модель", "модели", "моделей")}</option>)}</Select><button className="primary-button" disabled={!brand} type="submit">Выбрать модель <ArrowRight aria-hidden="true" /></button></div><p className="mt-3 font-mono text-xs text-muted">{brandOptions.length} {pluralizeRu(brandOptions.length, "марка", "марки", "марок")} · {catalogSize} проверенных моделей</p></form>;
}

function ModelStep({ brand, modelId, modelOptions, onChange, onSubmit }) {
  return <form data-guided-model-step="true" onSubmit={onSubmit}><label className="block font-display text-lg font-bold" htmlFor="guided-tv-model">Модель телевизора</label><div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"><Select id="guided-tv-model" onChange={onChange} value={modelId ?? ""}><option value="">Выберите</option>{modelOptions.map((model) => <option key={model.id} value={model.id}>{model.title}</option>)}</Select><button className="primary-button" disabled={!modelId} type="submit">Проверить стену <ArrowRight aria-hidden="true" /></button></div><p className="mt-3 font-mono text-xs text-muted" data-guided-model-count={modelOptions.length}>{modelOptions.length} проверенных моделей марки {brand}</p></form>;
}

function Select({ children, id, onChange, value }) {
  return <div className="relative min-w-0"><select className="h-[4.4rem] w-full appearance-none rounded-md border-2 border-ink bg-white px-3 pr-10 text-base outline-none focus:border-action focus:ring-2 focus:ring-action sm:px-5 sm:text-xl" id={id} onChange={(event) => onChange(event.target.value)} value={value}>{children}</select><CaretDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2" /></div>;
}

function ChoiceGrid({ label, options, value, onChange }) {
  return <fieldset><legend className="sr-only">{label}</legend><div className="grid gap-3 md:grid-cols-3">{options.map(({ id, title, description, Icon }) => <label className={`cursor-pointer rounded-md border-2 bg-white p-5 focus-within:ring-2 focus-within:ring-action ${value === id ? "border-action" : "border-line hover:border-ink"}`} key={id}><input checked={value === id} className="sr-only" name={label} onChange={() => onChange(id)} type="radio" /><Icon aria-hidden="true" className={`size-9 ${value === id ? "text-action" : "text-ink"}`} /><strong className="mt-4 block font-display text-xl">{title}</strong><span className="mt-1 block text-sm text-muted">{description}</span></label>)}</div></fieldset>;
}

function ModelSummary({ model }) {
  return <section className="px-5 py-7 sm:px-10 lg:px-12"><div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]"><div><p className="font-display text-lg font-bold">Выбранная модель</p><a className="mt-2 block font-display text-3xl font-bold text-verified hover:underline" href={modelHref(model)}>{model.title}</a><div className="mt-5"><ModelFacts detailed model={model} /></div></div><div className="flex items-start gap-3 border border-line bg-white/70 p-4 text-sm leading-relaxed"><Info aria-hidden="true" className="size-6 shrink-0 text-verified" /><p><strong>Паспортная проверка:</strong> VESA {model.vesa_width_mm}×{model.vesa_height_mm}, масса {model.weight_kg} кг ({modelWeightSuffix(model)}) и диагональ {model.diagonal_inches}″. Точные винты, порты и геометрия выводятся только при отдельном источнике.</p></div></div></section>;
}

export function CompatibilityResult({ availableOfferMountIds = new Set(), compatibility, matches, model, onRetry }) {
  if (compatibility.status === "idle" || compatibility.status === "loading") return <p className="mt-7 text-muted" data-guided-compatibility-state={compatibility.status}>{compatibility.status === "loading" ? "Проверяем каталог кронштейнов…" : "Выберите механизм."}</p>;
  if (compatibility.status === "error") return <div className="mt-7 border border-danger p-4 text-danger" data-guided-compatibility-state="error" role="alert"><p>{compatibility.error}</p><button className="secondary-button mt-4" onClick={onRetry} type="button">Повторить проверку</button></div>;
  const ranked = rankCompatibilityMatches(verifiedCompatibilityMatches(matches), availableOfferMountIds);
  if (!ranked.length) return <div className="mt-7"><p>В проверенном каталоге нет подходящего варианта.</p><a className="secondary-button mt-4" href={modelHref(model)}>Характеристики телевизора</a></div>;
  const shortlist = ranked.slice(0, 3);
  const remaining = ranked.slice(3);
  const groups = groupCatalogItemsByBrand(remaining, (item) => item.mount.brand);
  return <div className="mt-7 border-t-2 border-ink pt-5" data-guided-compatibility-state="success"><p className="font-display text-2xl font-bold">Подтверждённых вариантов: {ranked.length}</p><p className="mt-1 text-sm text-muted">Все показанные варианты проверены. При одинаковой технической оценке выше варианты с доступной точной карточкой Маркета.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-result-shortlist="true">{shortlist.map((match) => <CompatibilityCard key={match.mount.id} marketCardAvailable={availableOfferMountIds.has(match.mount.id)} match={match} placement="featured_result" />)}</div>{remaining.length ? <details className="mt-4 border-y border-line" data-result-catalog="collapsed"><summary className="cursor-pointer py-4 font-display text-lg font-bold">Показать ещё {remaining.length} {variantWord(remaining.length)} по брендам</summary><div className="border-t border-line pb-3"><h3 className="py-4 font-mono text-xs uppercase text-verified">Полностью проверены: {remaining.length}</h3>{groups.map((group) => <section className="border-t border-line py-4" key={group.brand}><h4 className="font-display text-2xl font-extrabold">{group.brand}</h4><span className="font-mono text-xs text-muted">Кронштейнов: {group.items.length}</span><div className="mt-3 grid gap-3 md:grid-cols-2">{group.items.map((match) => <CompatibilityCard compact key={match.mount.id} marketCardAvailable={availableOfferMountIds.has(match.mount.id)} match={match} placement="compatibility_result" />)}</div></section>)}</div></details> : null}</div>;
}

function CompatibilityCard({ compact = false, marketCardAvailable, match, placement }) {
  return <article className={`flex flex-col border bg-white ${compact ? "border-line p-4" : "border-ink p-5"}`} data-fit-status={match.fit_status} data-market-card-available={marketCardAvailable ? "true" : "false"} data-result-tier={placement}><p className="font-mono text-[0.68rem] uppercase text-verified">VESA, нагрузка и диагональ проверены</p><h3 className="mt-2 font-display text-xl font-bold"><MountDetailLink href={mountHref(match.mount)} placement={placement}>{match.mount.title}</MountDetailLink></h3>{marketCardAvailable ? <p className="mt-2 text-xs font-semibold text-technical">На момент проверки есть точная карточка на Маркете</p> : null}<ul className="mt-3 space-y-1 text-sm text-muted">{(match.reasons ?? []).slice(0, compact ? 2 : 3).map((reason) => <li key={reason}>✓ {reason}</li>)}</ul><MountDetailLink className={compact ? "secondary-button mt-4" : "primary-button mt-4"} href={mountHref(match.mount)} placement={placement}>Проверить кронштейн <ArrowRight aria-hidden="true" /></MountDetailLink></article>;
}

export function rankCompatibilityMatches(matches, availableOfferMountIds = new Set()) {
  return (Array.isArray(matches) ? matches : []).map((match, index) => ({ match, index })).sort((left, right) => {
    const leftFit = left.match.fit_status === "verified-fit" ? 0 : 1;
    const rightFit = right.match.fit_status === "verified-fit" ? 0 : 1;
    if (leftFit !== rightFit) return leftFit - rightFit;
    const leftScore = Number.isFinite(left.match.score) ? left.match.score : null;
    const rightScore = Number.isFinite(right.match.score) ? right.match.score : null;
    if (leftScore !== null && rightScore !== null && leftScore !== rightScore) return rightScore - leftScore;
    const leftOffer = availableOfferMountIds.has(left.match.mount.id) ? 0 : 1;
    const rightOffer = availableOfferMountIds.has(right.match.mount.id) ? 0 : 1;
    if (leftOffer !== rightOffer) return leftOffer - rightOffer;
    return left.index - right.index;
  }).map(({ match }) => match);
}

function variantWord(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "вариантов";
  if (mod10 === 1) return "вариант";
  if (mod10 >= 2 && mod10 <= 4) return "варианта";
  return "вариантов";
}
