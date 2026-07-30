import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Info,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateTurnClearance } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { formatNumber } from "./ModelFacts.jsx";

const INITIAL_VALUES = {
  tvWidth: "123",
  vesaOffset: "0",
  targetAngle: "90",
  availableExtension: "50",
  safetyClearance: "3",
};

export function TurnClearanceCalculator() {
  const [values, setValues] = useState(INITIAL_VALUES);
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
      const plan = await calculateTurnClearance({
        tvWidth: Number(values.tvWidth),
        vesaOffset: Number(values.vesaOffset),
        targetAngle: Number(values.targetAngle),
        availableExtension: Number(values.availableExtension),
        safetyClearance: Number(values.safetyClearance),
      });
      setResult(plan);
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section className="border-y-2 border-ink py-7" id="калькулятор-поворота">
      <div className="grid gap-7 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Расчёт в браузере
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Хватит ли вылета для поворота на 90°
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Проверяем только зазор до стены по геометрии корпуса: ширине,
              положению VESA и вылету до оси. Паспортный предел механизма
              проверяется отдельно.
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <NumberField
              help="Измерьте весь корпус, а не только экран."
              label="Ширина телевизора"
              max="300"
              min="20"
              name="tvWidth"
              onChange={update}
              step="0.1"
              value={values.tvWidth}
            />
            <NumberField
              help="Если центр VESA совпадает с центром корпуса — оставьте 0."
              label="Смещение VESA"
              max="100"
              min="0"
              name="vesaOffset"
              onChange={update}
              step="0.1"
              value={values.vesaOffset}
            />
            <NumberField
              help="Обычно проверяют 45°, 60° или 90°."
              label="Нужный поворот"
              max="90"
              min="1"
              name="targetAngle"
              onChange={update}
              step="1"
              unit="градусы"
              value={values.targetAngle}
            />
            <NumberField
              help="Именно от стены до вертикальной оси шарнира."
              label="Вылет кронштейна"
              max="150"
              min="1"
              name="availableExtension"
              onChange={update}
              step="0.1"
              value={values.availableExtension}
            />
            <NumberField
              help="Запас на корпус, кабели и неточность замера."
              label="Безопасный зазор"
              max="20"
              min="0"
              name="safetyClearance"
              onChange={update}
              step="0.1"
              value={values.safetyClearance}
            />
          </div>
          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Считаем геометрию…" : "Проверить зазор"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </div>

      {error ? (
        <p className="mt-5 border border-danger p-4 text-danger" role="alert">{error}</p>
      ) : null}

      <div aria-atomic="true" aria-live="polite" role="status">
        {result ? <TurnResult result={result} /> : null}
      </div>
    </section>
  );
}

function TurnResult({ result }) {
  const success = result.will_clear_wall;
  const margin = result.clearance_margin_cm;
  const marginValue = formatMargin(Math.abs(margin), !success);

  return (
    <div className="mt-7 border-t border-ink pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {success ? (
            <CheckCircle aria-hidden="true" className="mt-0.5 size-10 shrink-0 text-verified" weight="fill" />
          ) : (
            <WarningCircle aria-hidden="true" className="mt-0.5 size-10 shrink-0 text-danger" weight="fill" />
          )}
          <div>
            <p className={`font-display text-3xl font-bold ${success ? "text-verified" : "text-danger"}`}>
              {success ? "Зазора до стены хватит" : "Экран упрётся в стену"}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
              {success
                ? `Расчётный запас составляет ${formatMargin(Math.max(0, margin))}.`
                : `Не хватает ${marginValue} вылета до оси поворота.`}
            </p>
          </div>
        </div>
        <a className="secondary-button shrink-0" href="/podbor/">
          Проверить VESA и нагрузку <ArrowRight aria-hidden="true" />
        </a>
      </div>

      <dl className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
        <ResultMetric
          label="Нужный вылет"
          value={`${formatNumber(result.minimum_extension_cm)} см`}
        />
        <ResultMetric
          label="Предел угла по зазору"
          value={`${formatNumber(result.maximum_clearance_angle_degrees)}°`}
        />
        <ResultMetric
          label={success ? "Запас вылета" : "Дефицит вылета"}
          tone={success ? "verified" : "danger"}
          value={marginValue}
        />
      </dl>

      <div className="mt-5 flex gap-3 text-sm leading-relaxed text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
        <div>
          <p>
            Модель использует консервативную проекцию половины корпуса плюс смещение VESA:
            вылет ≥ рабочая полуширина × sin(угол) + зазор. Проверьте, что производитель
            указывает расстояние именно до оси конечного шарнира, а кабели и ручки не
            выступают за корпус. Даже при достаточном зазоре фактический угол не может
            превышать паспортный предел механизма. Расчёт не подтверждает прочность
            стены и кронштейна.
          </p>
          {result.warnings?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {result.warnings.map((warning) => <li key={warning}>{warning}.</li>)}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatMargin(value, showSmallDeficit = false) {
  if (showSmallDeficit && value < 0.1) return "менее 0,1 см";
  return `${formatNumber(value)} см`;
}

function NumberField({ help, label, max, min, name, onChange, step, unit = "см", value }) {
  const helpId = `${name}-help`;
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span className="field-label">{formatFieldLabel(label, unit)}</span>
      <input
        aria-describedby={helpId}
        aria-label={`${label}, ${unit}`}
        className="input-control"
        inputMode="decimal"
        max={max}
        min={min}
        onChange={(event) => onChange(name, event.target.value)}
        required
        step={step}
        type="number"
        value={value}
      />
      <span className="text-xs font-normal leading-relaxed text-muted" id={helpId}>{help}</span>
    </label>
  );
}

function ResultMetric({ label, tone = "ink", value }) {
  const toneClass = {
    danger: "text-danger",
    ink: "text-ink",
    verified: "text-verified",
  }[tone];

  return (
    <div className="bg-paper p-5">
      <dt className="font-mono text-xs uppercase text-muted">{label}</dt>
      <dd className={`mt-1 font-display text-4xl font-bold ${toneClass}`}>{value}</dd>
    </div>
  );
}
