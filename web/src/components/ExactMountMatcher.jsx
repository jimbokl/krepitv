import { useEffect, useId, useMemo, useRef, useState } from "react";
import { findCompatibleMounts } from "../lib/catalog.js";
import { createLatestMatchRequest, modelsForMountScope, mountsForScope } from "../lib/exactMountMatcher.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { modelWeightSuffix } from "../lib/modelWeight.js";
import { CompatibilityResult, verifiedCompatibilityMatches } from "../pages/GuidedSelectionPage.jsx";

const idle = { status: "idle", matches: [], error: null };
const selectClass = "mt-2 min-h-12 w-full min-w-0 rounded-md border-2 border-ink bg-paper px-3 text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:opacity-60";

export function ExactMountMatcher({ models, mounts, affiliateOffers = [], vesa = null, mechanism = "any" }) {
  const id = useId();
  const [brand, setBrand] = useState("");
  const [modelId, setModelId] = useState("");
  const [resultModel, setResultModel] = useState(null);
  const [compatibility, setCompatibility] = useState(idle);
  const request = useRef(createLatestMatchRequest());
  const resultHeading = useRef(null);
  const candidates = useMemo(() => modelsForMountScope(models, vesa), [models, vesa]);
  const scopedMounts = useMemo(() => mountsForScope(mounts, mechanism), [mounts, mechanism]);
  const brands = [...new Set(candidates.map((model) => model.brand))].sort((a, b) => a.localeCompare(b, "ru"));
  const brandModels = candidates.filter((model) => model.brand === brand);
  const selectedModel = brandModels.find((model) => model.id === modelId);
  const availableOfferMountIds = useMemo(() => new Set(affiliateOffers.filter((offer) => offer.entity_kind === "mount").map((offer) => offer.entity_id)), [affiliateOffers]);
  const label = vesa ? `VESA ${vesa[0]}×${vesa[1]}` : "поворотного механизма";

  useEffect(() => () => request.current.invalidate(), []);
  useEffect(() => {
    if (compatibility.status === "ready") resultHeading.current?.focus();
  }, [compatibility]);

  function reset() {
    request.current.invalidate();
    setResultModel(null);
    setCompatibility(idle);
  }
  function changeBrand(value) { reset(); setBrand(value); setModelId(""); }
  function changeModel(value) { reset(); setModelId(value); }
  function submit(event) {
    event.preventDefault();
    if (!selectedModel || compatibility.status === "loading") return;
    const model = selectedModel;
    setResultModel(model);
    setCompatibility({ status: "loading", matches: [], error: null });
    request.current.run(() => findCompatibleMounts(model, scopedMounts, mechanism), (result) => {
      setCompatibility(result);
      if (result.status === "ready") {
        const count = verifiedCompatibilityMatches(result.matches).length;
        emitResultCompleted(window, { toolId: "exact_mount_match", resultType: count ? "compatible_matches" : "no_compatible_matches", resultCount: count, modelId: model.id });
      }
    });
  }

  return (
    <section aria-labelledby={`${id}-title`} className="my-7 border-2 border-ink bg-white px-tool-gutter py-5 sm:p-7 [&_[data-result-shortlist]]:!grid-cols-1 xl:[&_[data-result-shortlist]]:!grid-cols-2 [&_[data-result-catalog]_.grid]:!grid-cols-1 xl:[&_[data-result-catalog]_.grid]:!grid-cols-2 [&_[data-result-tier]]:px-tool-inset sm:[&_[data-result-tier]]:px-5 [&_.primary-button]:px-tool-inset sm:[&_.primary-button]:px-6" data-exact-mount-matcher={vesa ? vesa.join("x") : mechanism} id="точный-подбор">
      <p className="font-mono text-xs uppercase tracking-wide text-action">От размера — к конкретному креплению</p>
      <h2 className="mt-2 max-w-3xl font-display text-3xl font-extrabold sm:text-4xl" id={`${id}-title`}>Какие крепления подходят к вашему ТВ?</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">Выберите полный код модели с наклейки. Проверим крепления для {label}: размеры отверстий, вес с запасом 25% и паспортный диапазон диагонали. Запас — правило нашего подбора, не гарантия монтажа.</p>
      <form className="mt-6" onSubmit={submit} data-analytics-tool="exact_mount_match" data-analytics-events="submit">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="min-w-0 font-semibold" htmlFor={`${id}-brand`}>1. Бренд телевизора
            <select className={selectClass} id={`${id}-brand`} value={brand} onChange={(event) => changeBrand(event.target.value)}><option value="">Выберите бренд</option>{brands.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          </label>
          <label className="min-w-0 font-semibold" htmlFor={`${id}-model`}>2. Модель телевизора
            <select className={selectClass} id={`${id}-model`} disabled={!brand} value={modelId} onChange={(event) => changeModel(event.target.value)}><option value="">{brand ? "Выберите точную модель" : "Сначала выберите бренд"}</option>{brandModels.map((model) => <option key={model.id} value={model.id}>{model.model}</option>)}</select>
          </label>
        </div>
        <button className="primary-button mt-5 max-w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={!selectedModel || compatibility.status === "loading"} type="submit">{compatibility.status === "loading" ? "Проверяем крепления…" : "Проверить крепления"}</button>
      </form>
      <p className="mt-4 text-sm leading-relaxed text-muted">В этом списке — только паспортные модели{vesa ? ` с VESA ${vesa[0]}×${vesa[1]}` : ""}. Не нашли свою? <a className="font-semibold text-technical underline underline-offset-4" href="/vesa/">Проверьте VESA по модели или инструкции</a>. Мы не определяем его по диагонали.</p>
      {compatibility.status === "loading" ? <p className="mt-5 text-muted" role="status">Проверяем каталог локально, данные модели не отправляются.</p> : null}
      {resultModel && compatibility.status !== "loading" ? (
        <div className="mt-6 border-t border-line pt-5" data-exact-mount-result="true">
          <h3 className="font-display text-2xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action" ref={resultHeading} tabIndex={-1}>Результат для {resultModel.title}</h3>
          <p className="mt-2 text-sm text-muted">VESA {resultModel.vesa_width_mm}×{resultModel.vesa_height_mm} мм · {resultModel.weight_kg} кг · {modelWeightSuffix(resultModel)} · {resultModel.diagonal_inches}″</p>
          <CompatibilityResult availableOfferMountIds={availableOfferMountIds} compatibility={compatibility} matches={compatibility.matches} model={resultModel} onRetry={submit} />
          {compatibility.status === "ready" ? <p className="mt-5 border-l-2 border-technical pl-4 text-sm leading-relaxed text-muted">Это проверка крепления к телевизору, не допуск к вашей стене. Перед монтажом отдельно проверьте <a className="text-technical underline underline-offset-4" href="/krepezh-dlya-televizora-na-stenu/">основание и анкеры</a>, длину винтов и доступ к разъёмам.{mechanism === "full-motion" ? <> Для нужного угла дополнительно <a className="text-technical underline underline-offset-4" href="/tipy-kronshteynov/vydvizhnoy/">рассчитайте вылет и зазор</a>: поддержка поворота не означает 90° для любого экрана.</> : null}</p> : null}
        </div>
      ) : null}
      <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer font-semibold text-technical">Как проверяем и откуда данные</summary><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Rust/WASM сверяет точную пару VESA, нагрузку и диапазон диагонали. В рекомендации попадают только варианты со статусом полной паспортной проверки; условные совпадения скрыты. Исходные характеристики и дата проверки доступны в <a className="text-technical underline" href="/modeli/">паспорте телевизора</a> и карточке крепления. <a className="text-technical underline" href="https://www.onkron.ru/articles_inc.php?url=kak-vybrat-kronshteyn-dlya-ustanovki-televizora-na-stenu" rel="noreferrer" target="_blank">Инструкция производителя по выбору</a>.</p></details>
    </section>
  );
}
