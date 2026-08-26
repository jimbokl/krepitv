import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Info,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateTvDimensionsPlan } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { formatNumber } from "./ModelFacts.jsx";
import { ModelSearch } from "./ModelSearch.jsx";

const modeCopy = {
  diagonal: {
    label: "По диагонали",
    description: "Ширина и высота активной области 16:9.",
    button: "Рассчитать размеры",
  },
  measured: {
    label: "По замерам",
    description: "Диагональ и пропорции фактического прямоугольника.",
    button: "Определить диагональ",
  },
  niche: {
    label: "Для ниши",
    description: "Максимальная стандартная диагональ с зазором.",
    button: "Подобрать размер",
  },
};

const initialValues = {
  diagonal: "55",
  compareDiagonal: "65",
  measuredWidth: "121.8",
  measuredHeight: "68.5",
  nicheWidth: "130",
  nicheHeight: "80",
  gap: "2",
};

export function TvDimensionsCalculator({ models = [], search = [] }) {
  const [mode, setMode] = useState("diagonal");
  const [values, setValues] = useState(initialValues);
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [modelQuery, setModelQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [result, setResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const requiredValues = mode === "diagonal"
    ? [values.diagonal, ...(compareEnabled ? [values.compareDiagonal] : [])]
    : mode === "measured"
      ? [values.measuredWidth, values.measuredHeight]
      : [values.nicheWidth, values.nicheHeight, values.gap];
  const canCalculate = status !== "loading" && requiredValues.every((value) => value !== "");

  function resetResult() {
    setResult(null);
    setCompareResult(null);
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

  function calculationValues(requestedMode = mode, diagonal = values.diagonal) {
    return {
      mode: requestedMode,
      diagonal: Number(diagonal),
      measuredWidth: Number(values.measuredWidth),
      measuredHeight: Number(values.measuredHeight),
      nicheWidth: Number(values.nicheWidth),
      nicheHeight: Number(values.nicheHeight),
      gap: Number(values.gap),
      exactCaseWidth: requestedMode === "niche" && selectedModel
        ? selectedModel.width_mm / 10
        : 0,
      exactCaseHeight: requestedMode === "niche" && selectedModel
        ? selectedModel.height_mm / 10
        : 0,
    };
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const [plan, comparison] = await Promise.all([
        calculateTvDimensionsPlan(calculationValues()),
        mode === "diagonal" && compareEnabled
          ? calculateTvDimensionsPlan(calculationValues("diagonal", values.compareDiagonal))
          : Promise.resolve(null),
      ]);
      setResult(plan);
      setCompareResult(comparison);
      emitResultCompleted(window, {
        toolId: "tv_dimensions_calculator",
        resultType: `${mode}_plan`,
      });
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setCompareResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section
      className="border-y-2 border-ink py-7"
      data-analytics-tool="tv_dimensions_calculator"
      data-tv-dimensions-calculator="true"
      id="калькулятор-размеров"
    >
      <div className="grid gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Бесплатно · без регистрации
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Калькулятор размеров
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Рассчитайте экран, восстановите диагональ по рулетке или проверьте нишу.
              Все значения остаются в браузере.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <fieldset>
            <legend className="font-display text-xl font-bold">Что уже известно</legend>
            <div className="mt-3 grid gap-px border border-ink bg-ink lg:grid-cols-3">
              {Object.entries(modeCopy).map(([value, copy]) => (
                <ModeChoice
                  checked={mode === value}
                  description={copy.description}
                  key={value}
                  label={copy.label}
                  onChange={() => changeMode(value)}
                  value={value}
                />
              ))}
            </div>
          </fieldset>

          {mode === "niche" ? (
            <div className="relative z-20 mt-5">
              <p className="mb-2 text-sm font-medium">Проверить корпус точной модели — необязательно</p>
              <ModelSearch
                buttonLabel="Использовать модель"
                compact
                emptyMessage="Модели пока нет в проверенной базе — расчёт ниши всё равно доступен."
                onChange={(value) => {
                  setModelQuery(value);
                  setSelectedModel(null);
                  resetResult();
                }}
                onSelect={selectSearchItem}
                onSubmit={submitModel}
                placeholder="Например, Samsung QE55Q70DAUXRU"
                resultLabel={(item) => {
                  const model = models.find((candidate) => candidate.id === item.id);
                  return model ? `${formatNumber(model.width_mm / 10)} × ${formatNumber(model.height_mm / 10)} см` : "Проверенная модель";
                }}
                search={search}
                value={modelQuery}
              />
              {selectedModel ? (
                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-3 border-l-2 border-verified pl-4 text-sm"
                  data-tv-dimensions-exact-model="true"
                >
                  <span>
                    <strong>{selectedModel.title}</strong> · корпус {formatNumber(selectedModel.width_mm / 10)} × {formatNumber(selectedModel.height_mm / 10)} см
                  </span>
                  <button
                    className="font-semibold text-action underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                    onClick={() => {
                      setModelQuery("");
                      setSelectedModel(null);
                      resetResult();
                    }}
                    type="button"
                  >
                    Убрать модель
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <form className="mt-5" onSubmit={submit}>
            <div className="grid gap-4" data-tv-dimensions-mode={mode}>
              {mode === "diagonal" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label="Диагональ телевизора"
                      max="150"
                      min="19"
                      onChange={(value) => update("diagonal", value)}
                      step="1"
                      unit="дюймы"
                      value={values.diagonal}
                    />
                    <NumberField
                      disabled={!compareEnabled}
                      label="Сравнить с диагональю"
                      max="150"
                      min="19"
                      onChange={(value) => update("compareDiagonal", value)}
                      required={compareEnabled}
                      step="1"
                      unit="дюймы"
                      value={values.compareDiagonal}
                    />
                  </div>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-medium">
                    <input
                      checked={compareEnabled}
                      className="size-5 accent-action"
                      onChange={(event) => {
                        setCompareEnabled(event.target.checked);
                        resetResult();
                      }}
                      type="checkbox"
                    />
                    Показать два экрана в одном масштабе
                  </label>
                </>
              ) : null}

              {mode === "measured" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Измеренная ширина"
                    max="400"
                    min="20"
                    onChange={(value) => update("measuredWidth", value)}
                    step="0.1"
                    unit="см"
                    value={values.measuredWidth}
                  />
                  <NumberField
                    label="Измеренная высота"
                    max="400"
                    min="10"
                    onChange={(value) => update("measuredHeight", value)}
                    step="0.1"
                    unit="см"
                    value={values.measuredHeight}
                  />
                </div>
              ) : null}

              {mode === "niche" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    label="Ширина ниши"
                    max="1000"
                    min="30"
                    onChange={(value) => update("nicheWidth", value)}
                    step="0.1"
                    unit="см"
                    value={values.nicheWidth}
                  />
                  <NumberField
                    label="Высота ниши"
                    max="500"
                    min="20"
                    onChange={(value) => update("nicheHeight", value)}
                    step="0.1"
                    unit="см"
                    value={values.nicheHeight}
                  />
                  <NumberField
                    label="Зазор с каждой стороны"
                    max="50"
                    min="0"
                    onChange={(value) => update("gap", value)}
                    step="0.5"
                    unit="см"
                    value={values.gap}
                  />
                </div>
              ) : null}

              <button
                className="primary-button justify-self-start disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canCalculate}
                type="submit"
              >
                {status === "loading" ? "Рассчитываем…" : modeCopy[mode].button}
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {error ? (
        <p className="mt-6 flex gap-3 border border-danger p-4 text-danger" role="alert">
          <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <div aria-atomic="true" aria-live="polite" role="status">
        {result ? (
          <DimensionsResult
            compareResult={compareResult}
            mode={mode}
            result={result}
            selectedModel={selectedModel}
          />
        ) : null}
      </div>
    </section>
  );
}

function DimensionsResult({ compareResult, mode, result, selectedModel }) {
  const metrics = mode === "niche"
    ? [
        ["Рекомендуемая диагональ", `${formatNumber(result.recommended_standard_diagonal_inches)}″`],
        ["Полезная область", `${formatNumber(result.usable_width_cm)} × ${formatNumber(result.usable_height_cm)} см`],
        ["Экран 16:9", `${formatNumber(result.screen_width_cm)} × ${formatNumber(result.screen_height_cm)} см`],
      ]
    : mode === "measured"
      ? [
          ["Диагональ", `${formatNumber(result.diagonal_inches)}″`],
          ["Диагональ в см", `${formatNumber(result.diagonal_cm)} см`],
          ["Пропорция", `${formatNumber(result.measured_aspect_ratio)} : 1`],
        ]
      : [
          ["Диагональ в см", `${formatNumber(result.diagonal_cm)} см`],
          ["Ширина экрана", `${formatNumber(result.screen_width_cm)} см`],
          ["Высота экрана", `${formatNumber(result.screen_height_cm)} см`],
        ];

  return (
    <section
      className="mt-7 border-t-2 border-ink pt-7"
      data-tv-dimensions-result={mode}
    >
      <div className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1.15fr)] lg:items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-verified">
            Расчёт готов
          </p>
          <dl className="mt-3 divide-y divide-line border-y-2 border-ink">
            {metrics.map(([label, value]) => (
              <div className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline" key={label}>
                <dt className="font-mono text-xs uppercase text-muted">{label}</dt>
                <dd className="font-display text-3xl font-extrabold text-verified">{value}</dd>
              </div>
            ))}
            {compareResult ? (
              <div className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
                <dt className="font-mono text-xs uppercase text-muted">
                  Второй экран {formatNumber(compareResult.diagonal_inches)}″
                </dt>
                <dd className="font-display text-2xl font-extrabold">
                  {formatNumber(compareResult.screen_width_cm)} × {formatNumber(compareResult.screen_height_cm)} см
                </dd>
              </div>
            ) : null}
          </dl>

          {mode === "niche" && selectedModel && result.exact_case_fits !== null ? (
            <div className={`mt-5 border-l-2 pl-4 ${result.exact_case_fits ? "border-verified" : "border-danger"}`}>
              <p className="flex items-center gap-2 font-display text-xl font-bold">
                {result.exact_case_fits ? (
                  <CheckCircle aria-hidden="true" className="size-6 text-verified" weight="fill" />
                ) : (
                  <WarningCircle aria-hidden="true" className="size-6 text-danger" weight="fill" />
                )}
                {result.exact_case_fits ? "Корпус модели помещается" : "Корпус модели не помещается"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {selectedModel.title}: запас по ширине {formatSigned(result.exact_case_horizontal_delta_cm)},
                по высоте {formatSigned(result.exact_case_vertical_delta_cm)}.
              </p>
            </div>
          ) : null}
        </div>

        <DimensionsDiagram compareResult={compareResult} mode={mode} result={result} />
      </div>

      <p className="mt-6 flex max-w-4xl gap-3 border-l-2 border-action pl-4 text-sm leading-relaxed text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
        <span>
          {result.warnings.join(" ")} До покупки сверьте паспортную ширину и высоту корпуса,
          если место ограничено.
        </span>
      </p>

      <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-5 text-sm font-semibold" aria-label="Продолжить проверку телевизора">
        <a className="text-action underline underline-offset-4" href="/televizor-na-stene/">Примерить на стене</a>
        <a className="text-action underline underline-offset-4" href="/rasstoyanie-do-televizora-i-diagonal/">Проверить расстояние</a>
        <a className="text-action underline underline-offset-4" href="/modeli/">Найти точную модель</a>
      </nav>
    </section>
  );
}

function DimensionsDiagram({ compareResult, mode, result }) {
  const sceneWidth = mode === "niche"
    ? result.usable_width_cm
    : Math.max(result.screen_width_cm, compareResult?.screen_width_cm ?? 0);
  const sceneHeight = mode === "niche"
    ? result.usable_height_cm
    : Math.max(result.screen_height_cm, compareResult?.screen_height_cm ?? 0);
  const scale = Math.min(540 / sceneWidth, 250 / sceneHeight);
  const toBox = (width, height) => ({
    width: width * scale,
    height: height * scale,
    x: 320 - (width * scale) / 2,
    y: 145 - (height * scale) / 2,
  });
  const screen = toBox(result.screen_width_cm, result.screen_height_cm);
  const comparison = compareResult
    ? toBox(compareResult.screen_width_cm, compareResult.screen_height_cm)
    : null;
  const boundary = mode === "niche"
    ? toBox(result.usable_width_cm, result.usable_height_cm)
    : null;

  return (
    <figure className="min-w-0 border-2 border-ink bg-white p-4" data-tv-dimensions-diagram="true">
      <svg
        aria-labelledby="tv-dimensions-diagram-title tv-dimensions-diagram-description"
        className="block h-auto w-full"
        role="img"
        viewBox="0 0 640 320"
      >
        <title id="tv-dimensions-diagram-title">Размер телевизора в масштабе</title>
        <desc id="tv-dimensions-diagram-description">
          {mode === "niche"
            ? "Активная область рекомендованного телевизора внутри полезной области ниши"
            : compareResult
              ? "Два активных экрана с разными диагоналями в одном масштабе"
              : "Активная область экрана с рассчитанной шириной и высотой"}
        </desc>
        <rect className="fill-paper stroke-line" height="318" width="638" x="1" y="1" />
        <line className="stroke-line" strokeDasharray="5 5" x1="320" x2="320" y1="20" y2="270" />
        <line className="stroke-line" strokeDasharray="5 5" x1="40" x2="600" y1="145" y2="145" />
        {boundary ? (
          <rect
            className="fill-none stroke-technical"
            height={boundary.height}
            strokeDasharray="8 6"
            strokeWidth="3"
            width={boundary.width}
            x={boundary.x}
            y={boundary.y}
          />
        ) : null}
        {comparison ? (
          <rect
            className="fill-none stroke-technical"
            height={comparison.height}
            strokeDasharray="8 6"
            strokeWidth="3"
            width={comparison.width}
            x={comparison.x}
            y={comparison.y}
          />
        ) : null}
        <rect
          className="fill-ink stroke-action"
          height={screen.height}
          strokeWidth="3"
          width={screen.width}
          x={screen.x}
          y={screen.y}
        />
        <text className="fill-white font-mono text-lg" textAnchor="middle" x="320" y="151">
          {formatNumber(result.diagonal_inches)}″ · {formatNumber(result.screen_width_cm)} × {formatNumber(result.screen_height_cm)} см
        </text>
        <text className="fill-muted font-mono text-sm" textAnchor="middle" x="320" y="298">
          {mode === "niche" ? "пунктир — полезная область ниши" : comparison ? "пунктир — второй экран" : "активная область экрана"}
        </text>
      </svg>
      <figcaption className="mt-3 text-sm leading-relaxed text-muted">
        Масштаб общий внутри схемы. Толщина и рамка корпуса не показаны.
      </figcaption>
    </figure>
  );
}

function ModeChoice({ checked, description, label, onChange, value }) {
  return (
    <label className="flex min-h-28 min-w-0 cursor-pointer gap-3 bg-paper p-4 transition has-[:checked]:bg-white">
      <input
        checked={checked}
        className="mt-1 size-5 shrink-0 accent-action"
        name="tv-dimensions-mode"
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span className="min-w-0">
        <strong className="block break-words font-display text-xl">{label}</strong>
        <span className="mt-1 block break-words text-sm leading-relaxed text-muted">{description}</span>
      </span>
    </label>
  );
}

function NumberField({ disabled = false, label, max, min, onChange, required = true, step, unit, value }) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${disabled ? "opacity-50" : ""}`}>
      <span className="field-label">{formatFieldLabel(label, unit)}</span>
      <input
        aria-label={`${label}, ${unit}`}
        className="input-control"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function formatSigned(value) {
  const formatted = `${formatNumber(Math.abs(value))} см`;
  return value < 0 ? `не хватает ${formatted}` : `${formatted}`;
}
