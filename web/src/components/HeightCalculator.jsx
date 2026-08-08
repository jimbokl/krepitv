import { useState } from "react";
import { ArrowRight, Info, Printer, Ruler } from "@phosphor-icons/react";
import { HeightPlanningGuide } from "./HeightPlanningGuide.jsx";
import { HeightPlanDiagram } from "./HeightPlanDiagram.jsx";
import { formatNumber } from "./ModelFacts.jsx";
import { calculateHeight } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

export function HeightCalculator({ model = null }) {
  const mountSelectionHref = model?.id
    ? `/podbor/?model=${encodeURIComponent(model.id)}`
    : "/podbor/";
  const [values, setValues] = useState({
    diagonal: String(model?.diagonal_inches ?? 55),
    eyeHeight: "110",
    viewingDistance: "250",
    viewingAngle: "0",
    furnitureHeight: "70",
    clearance: "10",
  });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const diagonal = Number(model?.diagonal_inches ?? values.diagonal);
      const plan = await calculateHeight({ diagonal_inches: diagonal }, {
        eyeHeight: Number(values.eyeHeight),
        viewingDistance: Number(values.viewingDistance),
        viewingAngle: Number(values.viewingAngle),
        furnitureHeight: Number(values.furnitureHeight),
        clearance: Number(values.clearance),
      });
      setResult(plan);
      emitResultCompleted(window, {
        toolId: "height_calculator",
        resultType: "height_plan",
      });
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section className="py-7" id="калькулятор-высоты">
      <div className="grid gap-7 lg:grid-cols-[25rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <h2 className="font-display text-3xl font-bold">Рассчитать высоту установки</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Укажите положение глаз, расстояние просмотра и мебель под экраном.
              {model ? ` Расчёт выполняется для диагонали ${model.diagonal_inches}″.` : " Диагональ можно задать вручную."}
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {!model ? (
              <NumberField label="Диагональ экрана" max="120" min="10" name="diagonal" onChange={update} unit="дюймы" value={values.diagonal} />
            ) : null}
            <NumberField label="Высота глаз" name="eyeHeight" onChange={update} value={values.eyeHeight} />
            <NumberField label="До экрана" name="viewingDistance" onChange={update} value={values.viewingDistance} />
            <label className="grid gap-2 text-sm font-medium">
              Угол просмотра
              <select
                aria-label="Угол просмотра"
                className="input-control"
                onChange={(event) => update("viewingAngle", event.target.value)}
                value={values.viewingAngle}
              >
                <option value="-5">Ниже уровня глаз</option>
                <option value="0">Прямо</option>
                <option value="5">Выше уровня глаз</option>
              </select>
            </label>
            <NumberField label="Высота мебели" name="furnitureHeight" onChange={update} value={values.furnitureHeight} />
            <NumberField label="Зазор над мебелью" name="clearance" onChange={update} value={values.clearance} />
          </div>
          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Рассчитываем…" : "Рассчитать высоту установки"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </div>

      {error ? <p className="mt-5 border border-danger p-4 text-danger">{error}</p> : null}
      {result ? (
        <div className="mt-6" data-height-plan-result="true">
          <div data-print-map="true">
            <div className="grid gap-4 border-y-2 border-ink py-5 sm:grid-cols-3">
              <ResultMetric label="Центр экрана" value={`${formatNumber(result.center_height_cm)} см`} />
              <ResultMetric label="Нижний край" value={`${formatNumber(result.bottom_height_cm)} см`} />
              <ResultMetric label="Верхний край" value={`${formatNumber(result.top_height_cm)} см`} />
              <p className="flex gap-3 text-sm leading-relaxed text-muted sm:col-span-3">
                <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
                <span>
                  Расчёт использует геометрию экрана 16:9 и заданный угол просмотра. Перед сверлением
                  сопоставьте центр экрана с положением монтажных отверстий конкретной модели.
                  {result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}
                </span>
              </p>
            </div>

            <HeightPlanDiagram result={result} />
            <button
              className="secondary-button mt-4 print:hidden"
              onClick={() => window.print()}
              type="button"
            >
              Распечатать контрольные высоты <Printer aria-hidden="true" />
            </button>
          </div>

          <section className="grid gap-4 border-b-2 border-ink py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-height-next-job="true">
            <div>
              <p className="font-mono text-xs uppercase text-action">Следующий шаг до сверления</p>
              <h3 className="mt-1 font-display text-2xl font-extrabold">Переведите центр экрана в линию пластины</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                Положение отверстий VESA и контрольной линии зависит от точного телевизора и кронштейна.
                Монтажная карта сохранит знак смещения и покажет, какую высоту переносить на стену.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <a className="primary-button" href="/kak-povesit-televizor-na-stenu/">
                Построить монтажную карту <ArrowRight aria-hidden="true" />
              </a>
              <a className="font-semibold text-technical underline underline-offset-4" href={mountSelectionHref}>
                Проверить модель и кронштейн
              </a>
            </div>
          </section>
        </div>
      ) : null}

      {!model ? <HeightPlanningGuide /> : null}
    </section>
  );
}

function NumberField({ label, max, min = "0", name, value, onChange, unit = "см" }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="field-label">{formatFieldLabel(label, unit)}</span>
      <input
        aria-label={`${label}, ${unit}`}
        className="input-control"
        max={max}
        min={min}
        onChange={(event) => onChange(name, event.target.value)}
        required
        step="1"
        type="number"
        value={value}
      />
    </label>
  );
}

function ResultMetric({ label, value }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold text-verified">{value}</p>
    </div>
  );
}
