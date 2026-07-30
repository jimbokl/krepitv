import { useState } from "react";
import { ArrowRight, Info, Monitor } from "@phosphor-icons/react";
import { formatNumber } from "./ModelFacts.jsx";
import { calculateViewingGeometry } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";

const MODES = {
  "diagonal-to-distance": {
    inputLabel: "Диагональ экрана",
    inputUnit: "дюймы",
    min: "19",
    max: "150",
    initialValue: "55",
    buttonLabel: "Рассчитать расстояние",
  },
  "distance-to-diagonal": {
    inputLabel: "Расстояние до экрана",
    inputUnit: "см",
    min: "30",
    max: "1000",
    initialValue: "250",
    buttonLabel: "Подобрать диагональ",
  },
};

export function ViewingDistanceCalculator() {
  const [mode, setMode] = useState("diagonal-to-distance");
  const [values, setValues] = useState({
    "diagonal-to-distance": MODES["diagonal-to-distance"].initialValue,
    "distance-to-diagonal": MODES["distance-to-diagonal"].initialValue,
  });
  const [horizontalAngle, setHorizontalAngle] = useState("36");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const settings = MODES[mode];

  function changeMode(nextMode) {
    setMode(nextMode);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const geometry = await calculateViewingGeometry(
        mode,
        Number(values[mode]),
        Number(horizontalAngle),
      );
      setResult(geometry);
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section className="py-7" id="калькулятор-расстояния">
      <div className="grid gap-7 lg:grid-cols-[25rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Monitor aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <h2 className="font-display text-3xl font-bold">Расстояние и диагональ телевизора</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Выберите, что уже известно. Калькулятор свяжет диагональ экрана 16:9 с
              расстоянием через выбранный горизонтальный угол обзора.
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">
              Что рассчитать
              <select
                aria-label="Что рассчитать"
                className="input-control"
                onChange={(event) => changeMode(event.target.value)}
                value={mode}
              >
                <option value="diagonal-to-distance">Расстояние по диагонали</option>
                <option value="distance-to-diagonal">Диагональ по расстоянию</option>
              </select>
            </label>
            <ViewingNumberField
              label={settings.inputLabel}
              max={settings.max}
              min={settings.min}
              onChange={(value) =>
                setValues((current) => ({ ...current, [mode]: value }))
              }
              unit={settings.inputUnit}
              value={values[mode]}
            />
            <ViewingNumberField
              label="Горизонтальный угол"
              max="60"
              min="20"
              onChange={setHorizontalAngle}
              unit="градусы"
              value={horizontalAngle}
            />
          </div>
          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Рассчитываем…" : settings.buttonLabel}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </div>

      {error ? <p className="mt-5 border border-danger p-4 text-danger" role="alert">{error}</p> : null}
      <div aria-atomic="true" aria-live="polite" role="status">
        {result ? (
          <div className="mt-6 grid gap-4 border-y-2 border-ink py-5 sm:grid-cols-2 lg:grid-cols-4">
            <ResultMetric label="Диагональ" value={`${formatNumber(result.diagonal_inches)}″`} />
            <ResultMetric label="До экрана" value={`${formatNumber(result.viewing_distance_cm)} см`} />
            <ResultMetric label="Ширина экрана" value={`${formatNumber(result.screen_width_cm)} см`} />
            <ResultMetric label="Высота экрана" value={`${formatNumber(result.screen_height_cm)} см`} />
            <p className="flex gap-3 text-sm leading-relaxed text-muted sm:col-span-2 lg:col-span-4">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
              <span>
                Геометрия: расстояние = ширина экрана / (2 × tan(угол / 2)). Это ориентир
                для планировки комнаты, а не медицинская рекомендация. Проверьте комфорт
                на привычном контенте перед покупкой и монтажом.
                {result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ViewingNumberField({ label, max, min, onChange, unit, value }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="field-label">{formatFieldLabel(label, unit)}</span>
      <input
        aria-label={`${label}, ${unit}`}
        className="input-control"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
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
