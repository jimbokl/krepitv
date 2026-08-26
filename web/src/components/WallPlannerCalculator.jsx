import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  Info,
  Printer,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateWallScenePlan, modelHref } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import {
  buildWallSceneSvg,
  describeWallSceneFurniture,
  plannerInputsForModel,
} from "../lib/wallScenePlan.mjs";
import { formatNumber } from "./ModelFacts.jsx";
import { ModelSearch } from "./ModelSearch.jsx";
import { WallPlannerDiagram } from "./WallPlannerDiagram.jsx";

const initialValues = {
  diagonal: "55",
  wallWidth: "420",
  wallHeight: "270",
  centerX: "210",
  centerY: "145",
  furnitureWidth: "180",
  furnitureHeight: "55",
  eyeLine: "110",
};

const examplePlan = {
  dimension_source: "manual-16:9",
  diagonal_inches: 55,
  screen_width_cm: 121.8,
  screen_height_cm: 68.5,
  wall_width_cm: 420,
  wall_height_cm: 270,
  effective_center_x_cm: 210,
  effective_center_y_cm: 145,
  left_clearance_cm: 149.1,
  right_clearance_cm: 149.1,
  top_clearance_cm: 90.8,
  bottom_clearance_cm: 110.8,
  furniture_width_cm: 180,
  furniture_height_cm: 55,
  furniture_gap_cm: 55.8,
  furniture_overlap_cm: 0,
  eye_line_height_cm: 110,
  eye_line_delta_cm: 35,
  center_was_clamped: false,
  warnings: [],
};

const wallPlannerExamples = [
  {
    diagonal: 43,
    height: 53.5,
    title: "Компактный экран",
    width: 95.2,
    copy: "Корпус около 95 × 54 см оставляет широкие боковые поля.",
  },
  {
    diagonal: 55,
    height: 68.5,
    title: "Средний экран",
    width: 121.8,
    copy: "Экран 16:9 около 122 × 69 см — это демонстрация, не готовая отметка.",
  },
  {
    diagonal: 65,
    height: 80.9,
    title: "Большой экран",
    width: 144,
    copy: "Корпус около 144 × 81 см заметно меняет пропорции той же стены.",
  },
];

export function WallPlannerCalculator({ models = [], search = [] }) {
  const [mode, setMode] = useState("manual");
  const [modelQuery, setModelQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const moveSequence = useRef(0);

  const requiredNames = ["wallWidth", "wallHeight", "centerX", "centerY", "furnitureWidth", "furnitureHeight", "eyeLine"];
  const canCalculate = status !== "loading"
    && requiredNames.every((name) => values[name] !== "")
    && (mode === "manual" ? values.diagonal !== "" : Boolean(selectedModel));

  function resetResult() {
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    resetResult();
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    resetResult();
  }

  function selectSearchItem(item) {
    const model = models.find((candidate) => candidate.id === item?.id) ?? null;
    setSelectedModel(model);
    resetResult();
  }

  function submitModel(item) {
    const model = models.find((candidate) => candidate.id === item?.id) ?? null;
    setSelectedModel(model);
    if (model) setModelQuery(model.title);
    resetResult();
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const plan = await calculateWallScenePlan(
        plannerInputsForModel(values, mode === "model" ? selectedModel : null),
      );
      setResult(plan);
      setValues((current) => ({
        ...current,
        centerX: String(plan.effective_center_x_cm),
        centerY: String(plan.effective_center_y_cm),
      }));
      emitResultCompleted(window, {
        toolId: "wall_planner",
        resultType: "wall_scene",
      });
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось построить схему");
      setStatus("error");
    }
  }

  async function moveScreen(centerX, centerY) {
    if (!result || status !== "ready") return;
    const sequence = ++moveSequence.current;
    const nextValues = {
      ...values,
      centerX: String(centerX),
      centerY: String(centerY),
    };
    try {
      const plan = await calculateWallScenePlan(
        plannerInputsForModel(nextValues, mode === "model" ? selectedModel : null),
      );
      if (sequence !== moveSequence.current) return;
      setResult(plan);
      setValues((current) => ({
        ...current,
        centerX: String(plan.effective_center_x_cm),
        centerY: String(plan.effective_center_y_cm),
      }));
    } catch {
      // Rust clamps pointer and keyboard coordinates; an unexpected transient
      // error leaves the last valid diagram visible instead of reporting noise.
    }
  }

  function downloadSvg() {
    if (!result) return;
    const svg = buildWallSceneSvg(result, { screenLabel: resultScreenLabel(selectedModel, mode) });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "shema-televizora-na-stene.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="border-y-2 border-ink py-7" data-analytics-tool="wall_planner" id="планировщик-стены">
      <div className="grid gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Бесплатно · всё остаётся в браузере
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Планировщик стены
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Задайте стену и экран. Точная модель использует паспортные габариты,
              ручная диагональ — геометрию 16:9 без рамки.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <fieldset>
            <legend className="font-display text-xl font-bold">Откуда взять размер телевизора</legend>
            <div className="mt-3 grid gap-px border border-ink bg-ink sm:grid-cols-2">
              <ModeChoice
                checked={mode === "manual"}
                description="Быстрый эскиз активной области 16:9."
                label="По диагонали"
                onChange={() => changeMode("manual")}
                value="manual"
              />
              <ModeChoice
                checked={mode === "model"}
                description={`Паспортная ширина и высота из ${models.length} моделей.`}
                label="По точной модели"
                onChange={() => changeMode("model")}
                value="model"
              />
            </div>
          </fieldset>

          {mode === "model" ? (
            <div className="relative z-20 mt-4">
              <ModelSearch
                buttonLabel="Использовать модель"
                compact
                emptyMessage="Модели пока нет в проверенной базе — переключитесь на диагональ."
                onChange={setModelQuery}
                onSelect={selectSearchItem}
                onSubmit={submitModel}
                placeholder="Например, Samsung QE55Q70DAUXRU"
                search={search}
                value={modelQuery}
              />
              {selectedModel ? (
                <p className="mt-2 text-sm text-verified">
                  Взяты паспортные габариты: {formatNumber(selectedModel.width_mm / 10)} × {formatNumber(selectedModel.height_mm / 10)} см.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">Выберите полный код модели из подсказки.</p>
              )}
            </div>
          ) : null}

          <form className="mt-5 grid gap-5" onSubmit={submit}>
            <fieldset>
              <legend className="font-display text-xl font-bold">Стена и экран</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {mode === "manual" ? (
                  <NumberField
                    hint="Активная область 16:9, без рамки."
                    label="Диагональ"
                    max="150"
                    min="19"
                    name="diagonal"
                    onChange={update}
                    unit="дюймы"
                    value={values.diagonal}
                  />
                ) : null}
                <NumberField label="Ширина стены" max="2000" min="100" name="wallWidth" onChange={update} value={values.wallWidth} />
                <NumberField label="Высота стены" max="1000" min="150" name="wallHeight" onChange={update} value={values.wallHeight} />
                <NumberField hint="От левого края стены." label="Центр по горизонтали" max="2000" name="centerX" onChange={update} value={values.centerX} />
                <NumberField hint="От чистого пола." label="Центр по вертикали" max="1000" name="centerY" onChange={update} value={values.centerY} />
              </div>
            </fieldset>

            <details className="border-t border-line pt-4">
              <summary className="flex min-h-12 cursor-pointer items-center font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                Тумба и линия глаз
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <NumberField label="Ширина тумбы" max="1000" name="furnitureWidth" onChange={update} value={values.furnitureWidth} />
                <NumberField label="Высота тумбы" max="300" name="furnitureHeight" onChange={update} value={values.furnitureHeight} />
                <NumberField hint="Только визуальная линия, не рекомендация." label="Высота глаз" max="220" min="50" name="eyeLine" onChange={update} value={values.eyeLine} />
              </div>
            </details>

            <button className="primary-button justify-self-start" disabled={!canCalculate} type="submit">
              {status === "loading" ? "Строим схему…" : "Примерить телевизор на стене"}
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

      <div aria-live="polite" className="mt-7" role="status">
        {error ? (
          <p className="flex items-start gap-3 border border-danger p-4 text-danger">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" weight="fill" />
            <span><strong>Схема не построена.</strong> {error}</span>
          </p>
        ) : null}
        {result ? (
          <WallPlannerResult
            mode={mode}
            model={selectedModel}
            onDownload={downloadSvg}
            onMove={moveScreen}
            result={result}
          />
        ) : (
          <div className="mt-6" data-wall-planner-default="true">
            <WallPlannerDiagram example plan={examplePlan} screenLabel="Телевизор 55″" />
            <p className="mt-3 flex gap-3 text-sm leading-relaxed text-muted">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
              Это демонстрационный пример, а не ваш результат: стена 420 × 270 см,
              экран 55″ и тумба 180 × 55 см.
            </p>
          </div>
        )}
      </div>

      <WallPlannerExamples />
    </section>
  );
}

export function WallPlannerResult({ mode, model, onDownload, onMove, result }) {
  const screenLabel = resultScreenLabel(model, mode);
  const furnitureFact = describeWallSceneFurniture(result);
  const furnitureValue = furnitureFact.measurementCm == null
    ? furnitureFact.value
    : `${formatNumber(furnitureFact.measurementCm)} см`;

  return (
    <div className="border-t border-ink pt-6" data-wall-planner-result="true">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <CheckCircle aria-hidden="true" className="size-12 shrink-0 text-verified" weight="fill" />
          <div>
            <h3 className="font-display text-3xl font-bold text-verified">Схема готова</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {screenLabel}: {formatNumber(result.screen_width_cm)} × {formatNumber(result.screen_height_cm)} см.
              {result.dimension_source === "exact-model" ? " Использованы габариты точной модели." : " Использована геометрия 16:9."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 print:hidden">
          <button className="secondary-button" onClick={onDownload} type="button">
            <DownloadSimple aria-hidden="true" /> Скачать SVG
          </button>
          <button className="secondary-button" onClick={() => window.print()} type="button">
            <Printer aria-hidden="true" /> Печать
          </button>
        </div>
      </div>

      <div className="mt-6 grid border border-line sm:grid-cols-2 lg:grid-cols-4">
        <ResultMetric label="Слева" value={`${formatNumber(result.left_clearance_cm)} см`} />
        <ResultMetric label="Справа" value={`${formatNumber(result.right_clearance_cm)} см`} />
        <ResultMetric label="Сверху" value={`${formatNumber(result.top_clearance_cm)} см`} />
        <ResultMetric label="Снизу" value={`${formatNumber(result.bottom_clearance_cm)} см`} />
      </div>

      <div className="mt-6" data-print-map>
        <WallPlannerDiagram interactive onMove={onMove} plan={result} screenLabel={screenLabel} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-px border border-ink bg-ink sm:grid-cols-3">
          <SmallFact label="Центр от левого края" value={`${formatNumber(result.effective_center_x_cm)} см`} />
          <SmallFact label="Центр от пола" value={`${formatNumber(result.effective_center_y_cm)} см`} />
          <SmallFact
            danger={furnitureFact.kind === "overlap"}
            label={furnitureFact.label}
            value={furnitureValue}
          />
        </div>
        <aside className="border border-line bg-white p-5 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Что означает линия глаз</p>
          <p className="mt-2">
            Центр экрана отличается от неё на {formatNumber(Math.abs(result.eye_line_delta_cm))} см.
            Это визуальная отметка, не готовая рекомендация по высоте.
          </p>
          {result.center_was_clamped ? (
            <p className="mt-3 text-danger">Центр автоматически сдвинут, чтобы весь экран остался внутри стены.</p>
          ) : null}
          {result.warnings?.map((warning) => <p className="mt-3" key={warning}>{warning}</p>)}
        </aside>
      </div>

      <section className="mt-7 grid gap-4 border-t-2 border-ink pt-6 print:hidden sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-wall-planner-next-job="true">
        <div>
          <p className="font-mono text-xs uppercase text-action">Следующая точная проверка</p>
          <h3 className="mt-1 font-display text-2xl font-extrabold">Переведите эскиз в монтажные данные</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Отдельные инструменты проверяют комфортную высоту, положение пластины и ТВ-зону.
            Планировщик не назначает анкеры и не подтверждает несущую способность стены.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 sm:max-w-[28rem] sm:justify-end">
          {model ? <a className="primary-button" href={modelHref(model)}>Открыть точную модель <ArrowRight aria-hidden="true" /></a> : null}
          <a className="font-semibold text-technical underline underline-offset-4" href="/na-kakoy-vysote-veshat-televizor/">Проверить высоту</a>
          <a className="font-semibold text-technical underline underline-offset-4" href="/kak-povesit-televizor-na-stenu/">Построить монтажную карту</a>
          <a className="font-semibold text-technical underline underline-offset-4" href="/rozetki-pod-televizor-na-stene/">Проверить ТВ-зону</a>
        </div>
      </section>
    </div>
  );
}

function WallPlannerExamples() {
  return (
    <section className="mt-10 border-y-2 border-ink py-7" data-wall-planner-answer="true">
      <p className="font-mono text-xs uppercase text-action">Сначала физический размер, потом монтаж</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold">Сравните телевизор со стеной в одном масштабе</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Диагональ сама по себе не показывает, сколько места займёт корпус. Ниже одна и та же
        стена 420 × 270 см с тремя экранами; в своём расчёте используйте реальные размеры.
      </p>
      <div className="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3" data-wall-planner-static-examples="true">
        {wallPlannerExamples.map((example) => {
          const screenX = (420 - example.width) / 2;
          const screenY = 270 - (145 + example.height / 2);
          return (
            <article className="bg-paper p-4" data-wall-planner-example={example.diagonal} key={example.diagonal}>
              <p className="font-mono text-xs uppercase text-action">Одна стена · {example.diagonal}″</p>
              <h3 className="mt-1 font-display text-xl font-extrabold">{example.title}</h3>
              <svg
                aria-label={`Пример телевизора ${example.diagonal} дюймов на стене 420 на 270 сантиметров`}
                className="mt-4 block h-auto w-full bg-white"
                role="img"
                viewBox="0 0 420 270"
              >
                <rect className="fill-white stroke-ink" height="268" width="418" x="1" y="1" />
                <line className="stroke-technical" strokeDasharray="6 5" x1="1" x2="419" y1="160" y2="160" />
                <rect className="fill-line stroke-ink" height="54" width="180" x="120" y="215" />
                <rect
                  className="fill-ink stroke-action"
                  height={example.height}
                  width={example.width}
                  x={screenX}
                  y={screenY}
                />
              </svg>
              <p className="mt-3 text-sm leading-relaxed text-muted">{example.copy}</p>
            </article>
          );
        })}
      </div>
      <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted">
        Схема проверяет геометрию, но не прочность стены и не назначает крепёж.
        Высоту, точки сверления, розетки и основание проверяйте отдельными инструментами.
      </p>
    </section>
  );
}

function ModeChoice({ checked, description, label, onChange, value }) {
  return (
    <label className={`min-h-24 cursor-pointer bg-paper p-4 transition focus-within:ring-2 focus-within:ring-action focus-within:ring-inset ${checked ? "text-ink" : "text-muted"}`}>
      <span className="flex items-center gap-3 font-display text-lg font-bold">
        <input checked={checked} className="size-5 accent-action" name="wall-planner-mode" onChange={onChange} type="radio" value={value} />
        {label}
      </span>
      <span className="mt-2 block pl-8 text-sm leading-relaxed">{description}</span>
    </label>
  );
}

function NumberField({ hint, label, max, min = "0", name, onChange, value, unit = "см" }) {
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span className="field-label">{formatFieldLabel(label, unit)}</span>
      <input
        aria-label={`${label}, ${unit}`}
        className="input-control"
        max={max}
        min={min}
        onChange={(event) => onChange(name, event.target.value)}
        required
        step="0.1"
        type="number"
        value={value}
      />
      {hint ? <span className="text-xs font-normal leading-relaxed text-muted">{hint}</span> : null}
    </label>
  );
}

function ResultMetric({ label, value }) {
  return (
    <div className="border-b border-line p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="font-mono text-[0.68rem] uppercase text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-verified">{value}</p>
    </div>
  );
}

function SmallFact({ danger = false, label, value }) {
  return (
    <div className="bg-paper p-4">
      <p className="font-mono text-[0.68rem] uppercase text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${danger ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function resultScreenLabel(model, mode) {
  return mode === "model" && model ? model.title : "Телевизор по диагонали";
}
