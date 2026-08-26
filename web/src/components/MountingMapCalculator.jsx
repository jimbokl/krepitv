import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Info,
  ListChecks,
  Printer,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateMountingMap } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { formatNumber } from "./ModelFacts.jsx";

const initialValues = {
  diagonal: "55",
  eyeHeight: "110",
  viewingDistance: "250",
  viewingAngle: "0",
  furnitureHeight: "70",
  clearance: "10",
  vesaVerticalOffset: "0",
  wallPlateOffset: "0",
};

export function MountingMapCalculator() {
  const [values, setValues] = useState(initialValues);
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
      const plan = await calculateMountingMap(
        Object.fromEntries(
          Object.entries(values).map(([name, value]) => [name, Number(value)]),
        ),
      );
      setResult(plan);
      emitResultCompleted(window, {
        toolId: "mounting_map_calculator",
        resultType: "mounting_map",
      });
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section className="border-y-2 border-ink py-7" data-analytics-tool="mounting_map_calculator" id="монтажная-карта">
      <div className="grid gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Расчёт в браузере
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Монтажная карта до сверления
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Получите пять контрольных высот от пола. Смещения VESA и пластины
              возьмите из инструкции телевизора и кронштейна.
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField
              hint="Для экрана 16:9 без учёта рамки."
              label="Диагональ экрана"
              max="150"
              min="19"
              name="diagonal"
              onChange={update}
              unit="дюймы"
              value={values.diagonal}
            />
            <NumberField
              hint="В привычной позе просмотра."
              label="Высота глаз"
              max="220"
              min="50"
              name="eyeHeight"
              onChange={update}
              value={values.eyeHeight}
            />
            <NumberField
              hint="От глаз до плоскости экрана."
              label="До экрана"
              max="1000"
              min="30"
              name="viewingDistance"
              onChange={update}
              value={values.viewingDistance}
            />
            <label className="grid content-start gap-2 text-sm font-medium">
              Вертикальный угол
              <select
                aria-label="Вертикальный угол просмотра"
                className="input-control"
                onChange={(event) => update("viewingAngle", event.target.value)}
                value={values.viewingAngle}
              >
                <option value="-5">5° ниже глаз</option>
                <option value="0">Прямо, 0°</option>
                <option value="5">5° выше глаз</option>
              </select>
              <span className="text-xs font-normal leading-relaxed text-muted">
                Сравните несколько положений.
              </span>
            </label>
            <NumberField
              hint="До верхней поверхности."
              label="Высота мебели"
              max="200"
              name="furnitureHeight"
              onChange={update}
              value={values.furnitureHeight}
            />
            <NumberField
              hint="Запас между мебелью и экраном."
              label="Зазор над мебелью"
              max="100"
              name="clearance"
              onChange={update}
              value={values.clearance}
            />
            <NumberField
              hint="Плюс — VESA выше центра корпуса."
              label="Смещение центра VESA"
              max="75"
              min="-75"
              name="vesaVerticalOffset"
              onChange={update}
              step="0.1"
              value={values.vesaVerticalOffset}
            />
            <NumberField
              hint="Плюс — линия пластины выше VESA."
              label="Смещение линии пластины"
              max="100"
              min="-100"
              name="wallPlateOffset"
              onChange={update}
              step="0.1"
              value={values.wallPlateOffset}
            />
          </div>
          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Строим карту…" : "Рассчитать монтажную карту"}
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
        {result ? <MountingMapResult result={result} /> : null}
      </div>
    </section>
  );
}

function MountingMapResult({ result }) {
  const steps = [
    `Отметьте горизонталь центра экрана на высоте ${formatNumber(result.center_height_cm)} см от чистого пола.`,
    `Перенесите центр VESA на высоту ${formatNumber(result.vesa_center_height_cm)} см с учётом знака смещения.`,
    `По инструкции кронштейна отметьте контрольную линию пластины на высоте ${formatNumber(result.wall_plate_reference_height_cm)} см.`,
    "Сверьте материал и состояние основания, проверьте скрытую проводку и трубы подходящим прибором.",
    "Координаты отверстий переносите только по штатному шаблону или самой пластине кронштейна.",
    "После навешивания проверьте уровень, доступ к разъёмам и свободный запас кабелей во всём диапазоне движения.",
  ];

  return (
    <div className="border-t border-ink pt-6" data-print-map>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <CheckCircle aria-hidden="true" className="size-12 shrink-0 text-verified" weight="fill" />
          <div>
            <h3 className="font-display text-3xl font-bold text-verified">
              Контрольные высоты рассчитаны
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Экран 16:9: {formatNumber(result.screen_width_cm)} × {formatNumber(result.screen_height_cm)} см.
            </p>
          </div>
        </div>
        <button className="secondary-button print:hidden" onClick={() => window.print()} type="button">
          <Printer aria-hidden="true" /> Распечатать карту
        </button>
      </div>

      <div className="mt-6 grid border border-line sm:grid-cols-2 lg:grid-cols-5">
        <ResultMetric label="Нижний край" value={`${formatNumber(result.bottom_height_cm)} см`} />
        <ResultMetric label="Центр экрана" value={`${formatNumber(result.center_height_cm)} см`} />
        <ResultMetric label="Верхний край" value={`${formatNumber(result.top_height_cm)} см`} />
        <ResultMetric label="Центр VESA" value={`${formatNumber(result.vesa_center_height_cm)} см`} />
        <ResultMetric label="Линия пластины" value={`${formatNumber(result.wall_plate_reference_height_cm)} см`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks aria-hidden="true" className="size-7 text-action" />
            <h3 className="font-display text-2xl font-bold">Порядок переноса на стену</h3>
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
            Что означает результат
          </p>
          <p className="mt-3">
            Это карта контрольных горизонталей, а не схема сверления. Она не определяет
            тип анкеров, несущую способность стены, скрытые коммуникации и точные отверстия.
          </p>
          {result.adjusted_for_furniture ? (
            <p className="mt-3 text-danger">
              Центр экрана поднят, чтобы сохранить заданный зазор над мебелью.
            </p>
          ) : null}
          {result.warnings?.map((warning) => (
            <p className="mt-3" key={warning}>{warning}</p>
          ))}
          <a
            className="mt-4 inline-flex font-semibold text-action underline underline-offset-4"
            href="/rozetki-pod-televizor-na-stene/"
          >
            Проверить розетки и кронштейн
          </a>
        </aside>
      </div>
    </div>
  );
}

function NumberField({ hint, label, max, min = "0", name, onChange, step = "1", unit = "см", value }) {
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
        step={step}
        type="number"
        value={value}
      />
      <span className="text-xs font-normal leading-relaxed text-muted">{hint}</span>
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
