import { ArrowRight, Calculator, Info, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { calculateVesaScrewLength } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

function formatMm(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

export function engagementGroups(groups) {
  return (groups ?? []).filter((group) => (
    Number.isFinite(group.engagement_min_mm)
    && Number.isFinite(group.engagement_max_mm)
  ));
}

export function ScrewLengthCalculator({ groups, requiresSpacerMeasurement = false }) {
  const eligibleGroups = engagementGroups(groups);
  const [values, setValues] = useState({
    plate: "",
    washers: "0",
    spacer: requiresSpacerMeasurement ? "" : "0",
  });
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (!eligibleGroups.length) return null;

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResults([]);
    setStatus("loading");

    const plate = Number(values.plate);
    const washers = Number(values.washers);
    const spacer = Number(values.spacer);
    if (!values.plate.trim() || !Number.isFinite(plate) || plate <= 0) {
      setError("Измерьте толщину металлической планки кронштейна и введите значение больше нуля.");
      setStatus("error");
      return;
    }
    if (!Number.isFinite(washers) || washers < 0) {
      setError("Толщина шайб должна быть неотрицательным числом.");
      setStatus("error");
      return;
    }
    if (!Number.isFinite(spacer) || spacer < 0 || (requiresSpacerMeasurement && spacer <= 0)) {
      setError(
        requiresSpacerMeasurement
          ? "Руководство требует дополнительную деталь: измерьте её фактическую толщину и введите значение больше нуля."
          : "Толщина проставки должна быть неотрицательным числом.",
      );
      setStatus("error");
      return;
    }

    try {
      const calculated = await Promise.all(eligibleGroups.map(async (group) => ({
        group,
        plan: await calculateVesaScrewLength({
          engagementMin: group.engagement_min_mm,
          engagementMax: group.engagement_max_mm,
          plate,
          washers,
          spacer,
        }),
      })));
      setResults(calculated);
      setStatus("ready");
      emitResultCompleted(window, {
        toolId: "vesa_screw_length_calculator",
        resultType: "screw_length_range",
        resultCount: calculated.length,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось рассчитать диапазон длины.");
      setStatus("error");
    }
  }

  return (
    <section
      aria-labelledby="screw-length-calculator-title"
      className="mt-5 border-t border-ink pt-5"
      data-screw-length-calculator="true"
    >
      <div className="flex items-start gap-3">
        <Calculator aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-action" />
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-action">
            Расчёт без округления
          </p>
          <h3 className="mt-1 font-display text-2xl font-extrabold" id="screw-length-calculator-title">
            Диапазон полной длины винта
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Паспорт задаёт глубину зацепления внутри телевизора. Добавьте только
            измеренные детали снаружи корпуса: планку, шайбы и обязательную проставку.
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-3">
          <MillimeterField
            hint="Измерьте штангенциркулем или возьмите из чертежа кронштейна."
            label="Толщина планки"
            name="plate"
            onChange={update}
            required
            value={values.plate}
          />
          <MillimeterField
            hint="Сумма всех шайб на одном винте; если их нет — 0."
            label="Толщина шайб"
            name="washers"
            onChange={update}
            value={values.washers}
          />
          <MillimeterField
            hint={requiresSpacerMeasurement
              ? "Измерьте пакет именно у проверяемой точки; если сверху и снизу он разный, считайте их отдельно."
              : "Если проставка не используется — 0."}
            label={requiresSpacerMeasurement
              ? "Обязательные детали у точки"
              : "Толщина проставки"}
            name="spacer"
            onChange={update}
            required={requiresSpacerMeasurement}
            value={values.spacer}
          />
        </div>
        <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
          {status === "loading" ? "Рассчитываем…" : "Рассчитать диапазон"}
          <ArrowRight aria-hidden="true" />
        </button>
      </form>

      <div aria-live="polite" className="mt-5" role="status">
        {error ? (
          <p className="flex items-start gap-3 border border-danger p-4 text-sm text-danger">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" weight="fill" />
            {error}
          </p>
        ) : null}
        {results.length ? (
          <div className="border-y border-ink" data-screw-length-results="true">
            {results.map(({ group, plan }) => (
              <div className="grid gap-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={group.location}>
                <div>
                  <p className="font-mono text-[0.68rem] uppercase text-muted">{group.location}</p>
                  <p className="mt-1 text-sm text-muted">
                    {group.quantity} шт. · {group.thread} · внешний пакет {formatMm(plan.external_stack_thickness_mm)} мм
                  </p>
                </div>
                <p className="font-display text-2xl font-extrabold text-verified">
                  {formatMm(plan.total_length_min_mm)}–{formatMm(plan.total_length_max_mm)} мм
                </p>
              </div>
            ))}
            <p className="flex gap-3 border-t border-line py-4 text-sm leading-relaxed text-muted">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
              <span>
                Это допустимый непрерывный диапазон, а не выбранный товарный размер.
                Не округляйте винт вверх: фактическая длина должна находиться внутри
                диапазона, а резьба и обязательные детали — совпадать с паспортом.
                Если внешний пакет отличается между точками VESA, повторите расчёт
                для каждой точки и не используйте один размер для всех винтов.
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MillimeterField({ hint, label, name, onChange, required = false, value }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <span className="input-control flex items-center gap-2">
        <input
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent outline-none"
          inputMode="decimal"
          max="100"
          min={required ? "0.1" : "0"}
          onChange={(event) => onChange(name, event.target.value)}
          required={required}
          step="0.1"
          type="number"
          value={value}
        />
        <span className="text-muted">мм</span>
      </span>
      <span className="text-xs font-normal leading-relaxed text-muted">{hint}</span>
    </label>
  );
}
