import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Info,
  Lightning,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateTvEnergyPlan } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const sources = {
  "samsung-tv-energy-fiche": {
    label: "Samsung: энергетическая карточка телевизора",
    url: "https://images.samsung.com/is/content/samsung/p6/common/energylabel/common-energylabel-ue65ru7022kxxh-productfiche.pdf",
  },
  "lg-tv-energy-spec": {
    label: "LG: мощность телевизора в спецификации",
    url: "https://www.lg.com/ru/televisions/lg-55EC930V-oled-televisions",
  },
};

const initialValues = {
  activePowerW: "",
  hoursPerDay: "",
  standbyPowerW: "",
  tariffRubPerKwh: "",
};

function localPlanError() {
  return new Error("Локальный модуль вернул неполный или неподдерживаемый расчёт");
}

function finiteNonNegative(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw localPlanError();
  }
  return value;
}

function optionalFiniteNonNegative(value) {
  return value == null ? null : finiteNonNegative(value);
}

function boundedTextArray(value, maximum) {
  if (!Array.isArray(value) || value.length > maximum) throw localPlanError();
  return value.map((item) => {
    if (typeof item !== "string" || !item.trim()) throw localPlanError();
    return item.trim();
  });
}

export function normalizeTvEnergyPlan(rawPlan) {
  if (!rawPlan || typeof rawPlan !== "object" || Array.isArray(rawPlan)) {
    throw localPlanError();
  }
  if (!Array.isArray(rawPlan.source_ids)) throw localPlanError();
  const sourceIds = [...new Set(rawPlan.source_ids)];
  if (
    sourceIds.length !== 2
    || sourceIds.some((sourceId) => !Object.hasOwn(sources, sourceId))
  ) {
    throw localPlanError();
  }
  if (typeof rawPlan.privacy !== "string" || !rawPlan.privacy.trim()) {
    throw localPlanError();
  }

  const normalized = {
    active_power_w: finiteNonNegative(rawPlan.active_power_w),
    hours_per_day: finiteNonNegative(rawPlan.hours_per_day),
    standby_power_w: finiteNonNegative(rawPlan.standby_power_w),
    tariff_rub_per_kwh: optionalFiniteNonNegative(rawPlan.tariff_rub_per_kwh),
    active_daily_kwh: finiteNonNegative(rawPlan.active_daily_kwh),
    standby_daily_kwh: finiteNonNegative(rawPlan.standby_daily_kwh),
    total_daily_kwh: finiteNonNegative(rawPlan.total_daily_kwh),
    monthly_kwh: finiteNonNegative(rawPlan.monthly_kwh),
    annual_kwh: finiteNonNegative(rawPlan.annual_kwh),
    monthly_cost_rub: optionalFiniteNonNegative(rawPlan.monthly_cost_rub),
    annual_cost_rub: optionalFiniteNonNegative(rawPlan.annual_cost_rub),
    assumptions: boundedTextArray(rawPlan.assumptions, 4),
    warnings: boundedTextArray(rawPlan.warnings, 3),
    source_ids: sourceIds,
    privacy: rawPlan.privacy.trim(),
  };
  const hasTariff = normalized.tariff_rub_per_kwh !== null;
  if (hasTariff !== (normalized.monthly_cost_rub !== null && normalized.annual_cost_rub !== null)) {
    throw localPlanError();
  }
  return normalized;
}

export function TvEnergyCalculator() {
  const [values, setValues] = useState(initialValues);
  const [requestState, setRequestState] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultHeadingRef = useRef(null);
  const requestGenerationRef = useRef(0);
  const canSubmit = values.activePowerW !== ""
    && values.hoursPerDay !== ""
    && values.standbyPowerW !== "";

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function update(name, value) {
    requestGenerationRef.current += 1;
    setValues((current) => ({ ...current, [name]: value }));
    setRequestState("idle");
    setResult(null);
    setError(null);
  }

  async function runCalculation() {
    if (!canSubmit || requestState === "loading") return;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setRequestState("loading");
    setResult(null);
    setError(null);
    try {
      const rawPlan = await calculateTvEnergyPlan({
        activePowerW: Number(values.activePowerW),
        hoursPerDay: Number(values.hoursPerDay),
        standbyPowerW: Number(values.standbyPowerW),
        tariffRubPerKwh: values.tariffRubPerKwh === ""
          ? undefined
          : Number(values.tariffRubPerKwh),
      });
      const plan = normalizeTvEnergyPlan(rawPlan);
      if (generation !== requestGenerationRef.current) return;
      setResult(plan);
      setRequestState("ready");
      emitResultCompleted(window, {
        toolId: "tv_energy_calculator",
        resultType: plan.tariff_rub_per_kwh == null ? "energy_plan" : "energy_cost_plan",
      });
    } catch (caught) {
      if (generation !== requestGenerationRef.current) return;
      setResult(null);
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
    }
  }

  async function submit(event) {
    event.preventDefault();
    await runCalculation();
  }

  return (
    <section className="border-y-2 border-ink py-7" data-tv-energy-calculator="true" id="калькулятор">
      <div className="grid min-w-0 gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row">
          <Lightning aria-hidden="true" className="size-12 shrink-0 text-action sm:size-14" />
          <div className="min-w-[min(12rem,100%)] flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Расчёт локально в браузере</p>
            <h2 className="mt-2 hyphens-auto font-display text-[min(2.25rem,12vw)] font-bold leading-none [overflow-wrap:normal]">
              Расход электричества телевизора
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Возьмите активную и ожидающую мощность из паспорта, спецификации или энергетической карточки точной модели. Фактический расход зависит от яркости, режима изображения и контента.
            </p>
          </div>
        </div>

        <form aria-busy={requestState === "loading"} className="min-w-0" onSubmit={submit}>
          <fieldset disabled={requestState === "loading"}>
            <legend className="font-display text-xl font-bold">Мощность и время работы</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <EnergyField
                label="Активная мощность"
                max="2000"
                min="1"
                name="activePowerW"
                onChange={update}
                step="0.1"
                unit="Вт"
                value={values.activePowerW}
              />
              <EnergyField
                label="Работа в сутки"
                max="24"
                min="0"
                name="hoursPerDay"
                onChange={update}
                step="0.1"
                unit="часов"
                value={values.hoursPerDay}
              />
              <EnergyField
                label="Мощность в ожидании"
                max="20"
                min="0"
                name="standbyPowerW"
                onChange={update}
                step="0.01"
                unit="Вт"
                value={values.standbyPowerW}
              />
              <EnergyField
                label="Ваш тариф — необязательно"
                max="1000"
                min="0.01"
                name="tariffRubPerKwh"
                onChange={update}
                required={false}
                step="0.01"
                unit="₽/кВт·ч"
                value={values.tariffRubPerKwh}
              />
            </div>
          </fieldset>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Ответы и числа остаются в браузере; свободный ввод и отправка данных отсутствуют.
          </p>
          <button
            className="primary-button mt-5 min-h-14 w-full sm:w-auto"
            disabled={!canSubmit || requestState === "loading"}
            type="submit"
          >
            {requestState === "loading" ? "Считаем расход…" : "Рассчитать расход"}
            {requestState !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
          </button>
          {requestState === "loading" ? (
            <p className="mt-2 text-sm text-muted" role="status">Числа сохранены. Загружаем локальный модуль.</p>
          ) : null}
          {error ? (
            <div className="mt-5 border-2 border-danger p-4" role="alert">
              <p className="flex items-start gap-3 font-semibold text-danger">
                <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
                {error}. Введённые числа сохранены.
              </p>
              <button
                className="secondary-button mt-4 min-h-12"
                disabled={requestState === "loading"}
                onClick={() => void runCalculation()}
                type="button"
              >
                Повторить
              </button>
            </div>
          ) : null}
        </form>
      </div>

      {result ? <EnergyResult result={result} resultHeadingRef={resultHeadingRef} /> : null}
    </section>
  );
}

function EnergyField({ label, max, min, name, onChange, required = true, step, unit, value }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium">
      <span className="field-label">{label}, {unit}</span>
      <input
        aria-label={`${label}, ${unit}`}
        className="input-control min-w-0"
        max={max}
        min={min}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function EnergyResult({ result, resultHeadingRef }) {
  const hasCost = result.monthly_cost_rub !== null;
  return (
    <section className="mt-8 border-t-2 border-ink pt-7" data-tv-energy-result="success">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Расчёт готов</p>
      <h2
        className="mt-2 hyphens-auto font-display text-[min(2.25rem,12vw)] font-extrabold leading-tight outline-none [overflow-wrap:normal] focus-visible:ring-2 focus-visible:ring-action"
        ref={resultHeadingRef}
        tabIndex={-1}
      >
        Потребление по введённому режиму
      </h2>

      <div className="mt-6 grid gap-px border border-ink bg-ink sm:grid-cols-3">
        <EnergyMetric label="За сутки" value={`${formatValue(result.total_daily_kwh, 4)} кВт·ч`} />
        <EnergyMetric label="За 30 дней" value={`${formatValue(result.monthly_kwh, 3)} кВт·ч`} />
        <EnergyMetric label="За 365 дней" value={`${formatValue(result.annual_kwh, 2)} кВт·ч`} />
      </div>

      {hasCost ? (
        <div className="mt-px grid gap-px border border-ink bg-ink sm:grid-cols-2">
          <EnergyMetric label="Стоимость за 30 дней" value={`${formatValue(result.monthly_cost_rub, 2)} ₽`} />
          <EnergyMetric label="Стоимость за 365 дней" value={`${formatValue(result.annual_cost_rub, 2)} ₽`} />
        </div>
      ) : null}

      <details className="group mt-6 border-y border-line py-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Вклад работы и ожидания
          <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
          <EnergyMetric label="Работа за сутки" value={`${formatValue(result.active_daily_kwh, 4)} кВт·ч`} />
          <EnergyMetric label="Ожидание за сутки" value={`${formatValue(result.standby_daily_kwh, 4)} кВт·ч`} />
        </div>
      </details>

      <details className="group mt-5 border-y border-line py-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Допущения и ограничения
          <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div className="space-y-3 border-t border-line pb-5 pt-4">
          {[...result.assumptions, ...result.warnings].map((item) => (
            <p className="flex gap-3 text-sm leading-relaxed text-muted" key={item}>
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-technical" />
              {item}
            </p>
          ))}
          <p className="text-sm leading-relaxed text-muted">{result.privacy}</p>
        </div>
      </details>

      <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Источники расчёта">
        {result.source_ids.map((sourceId) => (
          <a
            className="text-technical underline underline-offset-4"
            data-tv-energy-source={sourceId}
            href={sources[sourceId].url}
            key={sourceId}
            rel="noreferrer"
            target="_blank"
          >
            {sources[sourceId].label}
          </a>
        ))}
      </nav>

      <p className="mt-6">
        <a className="font-semibold text-action underline underline-offset-4" href="/televizor-sam-vyklyuchaetsya/">
          Телевизор меняет режим питания сам? Открыть безопасную диагностику <ArrowRight aria-hidden="true" className="inline size-4" />
        </a>
      </p>
    </section>
  );
}

function EnergyMetric({ label, value }) {
  return (
    <div className="min-w-0 bg-paper p-4">
      <p className="font-mono text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 font-display text-[clamp(1.75rem,5vw,2.5rem)] font-bold leading-tight text-verified [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function formatValue(value, maximumFractionDigits) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}
