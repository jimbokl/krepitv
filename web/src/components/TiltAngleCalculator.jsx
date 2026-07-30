import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Info,
  ListChecks,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateTiltAngle } from "../lib/catalog.js";
import { formatNumber } from "./ModelFacts.jsx";

const INITIAL_VALUES = {
  diagonal: "55",
  screenCenterHeight: "150",
  eyeHeight: "110",
  viewingDistance: "250",
  maximumDownTilt: "15",
  maximumUpTilt: "5",
};

export function TiltAngleCalculator() {
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
      const plan = await calculateTiltAngle(
        Object.fromEntries(
          Object.entries(values).map(([name, value]) => [name, Number(value)]),
        ),
      );
      setResult(plan);
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section className="border-y-2 border-ink py-7" id="калькулятор-наклона">
      <div className="grid gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Расчёт в браузере
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Какой угол наклона нужен
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Сравним высоту центра экрана с уровнем глаз и паспортным диапазоном
              кронштейна. Это геометрия направления экрана, а не назначение высоты.
            </p>
          </div>
        </div>

        <form className="grid gap-5" onSubmit={submit}>
          <fieldset>
            <legend className="font-display text-xl font-bold">Экран и точка просмотра</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                hint="Активная область 16:9, без рамки корпуса."
                label="Диагональ экрана"
                max="150"
                min="19"
                name="diagonal"
                onChange={update}
                unit="дюймы"
                value={values.diagonal}
              />
              <NumberField
                hint="От чистого пола до геометрического центра экрана."
                label="Высота центра экрана"
                max="350"
                name="screenCenterHeight"
                onChange={update}
                step="0.1"
                value={values.screenCenterHeight}
              />
              <NumberField
                hint="Измерьте в обычной позе просмотра."
                label="Высота глаз"
                max="220"
                min="50"
                name="eyeHeight"
                onChange={update}
                step="0.1"
                value={values.eyeHeight}
              />
              <NumberField
                hint="По горизонтали от глаз до плоскости экрана, не до стены."
                label="Расстояние до экрана"
                max="1000"
                min="30"
                name="viewingDistance"
                onChange={update}
                step="0.1"
                value={values.viewingDistance}
              />
            </div>
          </fieldset>

          <fieldset className="border-t border-line pt-4">
            <legend className="font-display text-xl font-bold">Паспортный диапазон кронштейна</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <NumberField
                hint="Обычно в карточке обозначен знаком минус или словом «вниз»."
                label="Максимальный наклон вниз"
                max="90"
                name="maximumDownTilt"
                onChange={update}
                step="0.1"
                unit="градусы"
                value={values.maximumDownTilt}
              />
              <NumberField
                hint="Если наклон вверх не заявлен, укажите 0."
                label="Максимальный наклон вверх"
                max="90"
                name="maximumUpTilt"
                onChange={update}
                step="0.1"
                unit="градусы"
                value={values.maximumUpTilt}
              />
            </div>
          </fieldset>

          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Считаем угол…" : "Рассчитать и проверить диапазон"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </div>

      <div aria-live="polite" className="mt-7" role="status">
        {error ? (
          <p className="flex items-start gap-3 border border-danger p-4 text-danger">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" weight="fill" />
            {error}
          </p>
        ) : null}
        {result ? <TiltAngleResult result={result} /> : null}
      </div>
    </section>
  );
}

function TiltAngleResult({ result }) {
  const success = result.mount_covers_required_tilt;
  const noTilt = result.required_direction === "без наклона";
  const required = noTilt
    ? "не требуется"
    : `${formatNumber(result.required_tilt_degrees)}° ${result.required_direction}`;
  const available = noTilt
    ? "не требуется"
    : `${formatNumber(result.available_tilt_degrees)}° ${result.required_direction}`;
  const margin = Math.abs(result.tilt_margin_degrees);
  const steps = [
    `Контур экрана: нижний край ${formatNumber(result.screen_bottom_height_cm)} см, центр ${formatNumber(result.screen_center_height_cm)} см, верхний край ${formatNumber(result.screen_top_height_cm)} см от чистого пола.`,
    `Высота глаз ${formatNumber(result.eye_height_cm)} см; перепад до центра экрана ${formatSigned(result.vertical_offset_cm)} см.`,
    noTilt
      ? "Центр экрана находится на уровне глаз: для направления центра наклон не требуется."
      : `Линия к центру требует наклона ${required}.`,
    success
      ? noTilt
        ? "Паспортный диапазон наклона не ограничивает эту геометрию."
        : `Заявленный диапазон даёт запас ${formatNumber(Math.max(0, result.tilt_margin_degrees))}°.`
      : `Не хватает ${formatNumber(margin)}° паспортного диапазона ${result.required_direction}.`,
    "Отдельно сверьте VESA, массу, фиксацию угла, расстояние от стены, кабели и инструкцию точного кронштейна.",
  ];

  return (
    <div className="border-t border-ink pt-6" data-tilt-status={success ? "диапазона-хватает" : "диапазона-не-хватает"}>
      <div className="flex items-start gap-4">
        {success ? (
          <CheckCircle aria-hidden="true" className="size-12 shrink-0 text-verified" weight="fill" />
        ) : (
          <WarningCircle aria-hidden="true" className="size-12 shrink-0 text-danger" weight="fill" />
        )}
        <div>
          <h3 className={`font-display text-3xl font-bold ${success ? "text-verified" : "text-danger"}`}>
            {success
              ? noTilt ? "Наклон центра не требуется" : "Диапазона кронштейна хватит"
              : "Диапазона кронштейна не хватит"}
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            {success
              ? `Требуемое направление: ${required}. Теперь проверьте остальные характеристики точного изделия.`
              : result.screen_clears_floor
                ? `Для этой геометрии нужен больший паспортный наклон ${result.required_direction}.`
                : "Сначала исправьте высоту: нижний край экрана оказался ниже чистого пола."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid border border-line sm:grid-cols-2 lg:grid-cols-4">
        <ResultMetric label="Нужный наклон" tone={success ? "good" : "bad"} value={required} />
        <ResultMetric label="Доступный диапазон" tone={success ? "good" : "bad"} value={available} />
        <ResultMetric
          label={success ? "Запас диапазона" : "Дефицит диапазона"}
          tone={success ? "good" : "bad"}
          value={`${formatNumber(margin)}°`}
        />
        <ResultMetric
          label="Угол линии к центру"
          tone="neutral"
          value={`${formatSigned(result.center_sightline_angle_degrees)}°`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks aria-hidden="true" className="size-7 text-action" />
            <h3 className="font-display text-2xl font-bold">Как читать результат</h3>
          </div>
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {steps.map((step, index) => (
              <li className="flex gap-4 py-3 text-sm leading-relaxed" key={step}>
                <span className="font-mono font-bold text-action">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="border border-line bg-white/70 p-5 text-sm leading-relaxed text-muted">
          <p className="flex items-start gap-3 font-semibold text-ink">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
            Граница расчёта
          </p>
          <p className="mt-4">
            Формула использует прямую от глаз к центру экрана. Она не доказывает,
            что выбранная высота удобна, и не моделирует отражения, позу лёжа или
            изменение расстояния при наклоне корпуса.
          </p>
          <p className="mt-3">
            Линии взгляда к нижнему и верхнему краю: {formatSigned(result.bottom_sightline_angle_degrees)}° и {formatSigned(result.top_sightline_angle_degrees)}°.
          </p>
          {result.warnings?.map((warning) => (
            <p className="mt-3" key={warning}>{warning}.</p>
          ))}
          <a
            className="mt-4 inline-flex font-semibold text-action underline underline-offset-4"
            href="/kak-povesit-televizor-na-stenu/"
          >
            Сначала рассчитать положение экрана
          </a>
        </aside>
      </div>
    </div>
  );
}

function NumberField({ hint, label, max, min = "0", name, onChange, step = "1", unit = "см", value }) {
  const hintId = `${name}-tilt-hint`;
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      {label}, {unit}
      <input
        aria-describedby={hintId}
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
      <span className="text-xs font-normal leading-relaxed text-muted" id={hintId}>{hint}</span>
    </label>
  );
}

function ResultMetric({ label, tone, value }) {
  const color = tone === "bad" ? "text-danger" : tone === "good" ? "text-verified" : "text-ink";
  return (
    <div className="border-b border-line p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="font-mono text-[0.68rem] uppercase text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatSigned(value) {
  const number = Number(value);
  if (Math.abs(number) < 0.05) return "0";
  return `${number > 0 ? "+" : "−"}${formatNumber(Math.abs(number))}`;
}
