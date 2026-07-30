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
import { calculateTvZoneSocketPlan } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { formatNumber } from "./ModelFacts.jsx";

const initialValues = {
  diagonal: "55",
  screenCenterHeight: "114.2",
  plateWidth: "45",
  plateHeight: "20",
  plateHorizontalOffset: "0",
  plateVerticalOffset: "0",
  socketWidth: "14",
  socketHeight: "8",
  socketHorizontalOffset: "35",
  socketVerticalOffset: "0",
  serviceMargin: "2",
  requiredDepth: "3.5",
  wallClearance: "5",
  poweredDevices: "4",
  sparePowerModules: "1",
  ethernetModules: "1",
  antennaModules: "1",
};

export function TvZoneSocketCalculator() {
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
      const plan = await calculateTvZoneSocketPlan(
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
    <section className="border-y-2 border-ink py-7" id="карта-розеток">
      <div className="grid gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Расчёт в браузере
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Карта розеток ТВ-зоны
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Проверьте, скрыт ли блок экраном, не попадает ли под пластину и
              хватает ли глубины для вилок до отделки стены.
            </p>
          </div>
        </div>

        <form className="grid gap-5" onSubmit={submit}>
          <fieldset>
            <legend className="font-display text-xl font-bold">Экран и настенная пластина</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                hint="Активная область 16:9, без рамки."
                label="Диагональ экрана"
                max="150"
                min="19"
                name="diagonal"
                onChange={update}
                unit="дюймы"
                value={values.diagonal}
              />
              <NumberField
                hint="От чистого пола. Возьмите из монтажной карты."
                label="Высота центра экрана"
                max="350"
                name="screenCenterHeight"
                onChange={update}
                step="0.1"
                value={values.screenCenterHeight}
              />
              <NumberField
                hint="По фактической пластине кронштейна."
                label="Ширина пластины"
                max="300"
                min="0.1"
                name="plateWidth"
                onChange={update}
                step="0.1"
                value={values.plateWidth}
              />
              <NumberField
                hint="По фактической пластине кронштейна."
                label="Высота пластины"
                max="300"
                min="0.1"
                name="plateHeight"
                onChange={update}
                step="0.1"
                value={values.plateHeight}
              />
            </div>
          </fieldset>

          <fieldset className="border-t border-line pt-4">
            <legend className="font-display text-xl font-bold">Розеточный блок</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField
                hint="Внешний габарит рамки, а не подрозетника."
                label="Ширина блока"
                max="300"
                min="0.1"
                name="socketWidth"
                onChange={update}
                step="0.1"
                value={values.socketWidth}
              />
              <NumberField
                hint="Внешний габарит рамки."
                label="Высота блока"
                max="300"
                min="0.1"
                name="socketHeight"
                onChange={update}
                step="0.1"
                value={values.socketHeight}
              />
              <NumberField
                hint="Плюс — вправо, минус — влево от центра ТВ."
                label="Смещение блока по горизонтали"
                max="250"
                min="-250"
                name="socketHorizontalOffset"
                onChange={update}
                step="0.1"
                value={values.socketHorizontalOffset}
              />
              <NumberField
                hint="Плюс — вверх, минус — вниз от центра ТВ."
                label="Смещение блока по вертикали"
                max="250"
                min="-250"
                name="socketVerticalOffset"
                onChange={update}
                step="0.1"
                value={values.socketVerticalOffset}
              />
            </div>
          </fieldset>

          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Проверяем ТВ-зону…" : "Проверить розетки и кронштейн"}
            <ArrowRight aria-hidden="true" />
          </button>

          <details className="group border-y border-line py-4">
            <summary className="cursor-pointer font-display text-lg font-bold marker:text-action">
              Уточнить глубину, смещение пластины и состав блока
            </summary>
            <div className="mt-4 hidden gap-6 group-open:grid">
              <fieldset>
                <legend className="font-display text-xl font-bold">Глубина подключения</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <NumberField
                    hint="От стены до крайней точки вилки и изгиба кабеля."
                    label="Нужная глубина"
                    max="50"
                    name="requiredDepth"
                    onChange={update}
                    step="0.1"
                    value={values.requiredDepth}
                  />
                  <NumberField
                    hint="Фактический минимум от стены до корпуса ТВ."
                    label="Зазор до корпуса"
                    max="50"
                    name="wallClearance"
                    onChange={update}
                    step="0.1"
                    value={values.wallClearance}
                  />
                  <NumberField
                    hint="Свободная зона вокруг контура пластины."
                    label="Сервисный зазор"
                    max="50"
                    name="serviceMargin"
                    onChange={update}
                    step="0.1"
                    value={values.serviceMargin}
                  />
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  hint="Плюс — вправо, минус — влево от центра ТВ."
                  label="Смещение пластины по горизонтали"
                  max="250"
                  min="-250"
                  name="plateHorizontalOffset"
                  onChange={update}
                  step="0.1"
                  value={values.plateHorizontalOffset}
                />
                <NumberField
                  hint="Плюс — вверх, минус — вниз от центра ТВ."
                  label="Смещение пластины по вертикали"
                  max="250"
                  min="-250"
                  name="plateVerticalOffset"
                  onChange={update}
                  step="0.1"
                  value={values.plateVerticalOffset}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <NumberField
                  hint="Телевизор, приставка, саундбар и другие потребители."
                  label="Питаемые устройства"
                  max="16"
                  name="poweredDevices"
                  onChange={update}
                  unit="шт."
                  value={values.poweredDevices}
                />
                <NumberField
                  hint="Свободные силовые места сверх списка устройств."
                  label="Запасные силовые"
                  max="16"
                  name="sparePowerModules"
                  onChange={update}
                  unit="шт."
                  value={values.sparePowerModules}
                />
                <NumberField
                  hint="Только если проводная сеть действительно нужна."
                  label="Ethernet-модули"
                  max="16"
                  name="ethernetModules"
                  onChange={update}
                  unit="шт."
                  value={values.ethernetModules}
                />
                <NumberField
                  hint="Для антенного или кабельного ввода по проекту."
                  label="ТВ-вводы"
                  max="16"
                  name="antennaModules"
                  onChange={update}
                  unit="шт."
                  value={values.antennaModules}
                />
              </div>
              <button className="secondary-button justify-self-start" disabled={status === "loading"} type="submit">
                Пересчитать с уточнениями <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </details>
        </form>
      </div>

      <div aria-live="polite" className="mt-7" role="status">
        {error ? (
          <p className="flex items-start gap-3 border border-danger p-4 text-danger">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" weight="fill" />
            {error}
          </p>
        ) : null}
        {result ? <TvZoneSocketResult result={result} /> : null}
      </div>
    </section>
  );
}

function TvZoneSocketResult({ result }) {
  const ready = result.ready_for_site_check;
  const shift = result.minimum_shift_cm != null
    ? `Сместите блок минимум на ${formatNumber(result.minimum_shift_cm)} см ${result.shift_direction}.`
    : null;
  const steps = [
    `Отметьте контур экрана: нижний край ${formatNumber(result.screen_bottom_height_cm)} см, верхний край ${formatNumber(result.screen_top_height_cm)} см от чистого пола.`,
    `Отметьте центр настенной пластины на высоте ${formatNumber(result.plate_center_height_cm)} см и перенесите её фактический контур.`,
    `Отметьте центр розеточного блока на высоте ${formatNumber(result.socket_center_height_cm)} см и проверьте его внешний габарит.`,
    shift || "Сохраните заданный сервисный зазор по всему контуру пластины.",
    `Сверьте требуемую глубину подключения ${formatNumber(result.required_depth_cm)} см с фактическим зазором ${formatNumber(result.wall_clearance_cm)} см.`,
    "Перед работами электрик сверяет разъёмы конкретного телевизора, траекторию механизма, скрытые коммуникации и проект электроснабжения.",
  ];

  return (
    <div className="border-t border-ink pt-6" data-print-map data-tv-zone-status={ready ? "готово-к-проверке" : "есть-конфликт"}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          {ready ? (
            <CheckCircle aria-hidden="true" className="size-12 shrink-0 text-verified" weight="fill" />
          ) : (
            <WarningCircle aria-hidden="true" className="size-12 shrink-0 text-danger" weight="fill" />
          )}
          <div>
            <h3 className={`font-display text-3xl font-bold ${ready ? "text-verified" : "text-danger"}`}>
              {ready ? "Явных геометрических конфликтов нет" : "ТВ-зону нужно скорректировать"}
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
              {ready
                ? "Блок скрывается экраном, не входит в сервисную зону пластины и помещается по глубине. Теперь нужны проверка точных изделий и осмотр на месте."
                : shift || "Измените положение или размер элементов и выполните расчёт повторно."}
            </p>
          </div>
        </div>
        <button className="secondary-button print:hidden" onClick={() => window.print()} type="button">
          <Printer aria-hidden="true" /> Распечатать план
        </button>
      </div>

      <div className="mt-6 grid border border-line sm:grid-cols-2 lg:grid-cols-4">
        <ResultMetric
          label="Центр блока от пола"
          tone={result.socket_hidden_by_screen ? "good" : "bad"}
          value={`${formatNumber(result.socket_center_height_cm)} см`}
        />
        <ResultMetric
          label="Зона пластины"
          tone={result.socket_overlaps_service_zone || !result.service_zone_hidden_by_screen ? "bad" : "good"}
          value={result.socket_overlaps_service_zone
            ? "конфликт"
            : result.service_zone_hidden_by_screen ? "свободна" : "вне экрана"}
        />
        <ResultMetric
          label="Запас по глубине"
          tone={result.plug_fits_depth ? "good" : "bad"}
          value={`${formatNumber(result.depth_margin_cm)} см`}
        />
        <ResultMetric
          label="Модулей в блоке"
          tone="neutral"
          value={formatNumber(result.total_modules)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks aria-hidden="true" className="size-7 text-action" />
            <h3 className="font-display text-2xl font-bold">План переноса на стену</h3>
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
            Предварительный состав блока
          </p>
          <dl className="mt-4 grid gap-2">
            <ModuleRow label="Силовые модули" value={result.power_modules} />
            <ModuleRow label="Ethernet" value={result.ethernet_modules} />
            <ModuleRow label="ТВ-вводы" value={result.antenna_modules} />
          </dl>
          <p className="mt-4">
            Это геометрическая проверка, а не проект электрики. Тип проводки,
            защиту, совместимые механизмы и монтаж определяет специалист.
          </p>
          {result.warnings?.map((warning) => (
            <p className="mt-3" key={warning}>{warning}</p>
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
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span className="field-label">{formatFieldLabel(label, unit)}</span>
      <input
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
      <span className="text-xs font-normal leading-relaxed text-muted">{hint}</span>
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

function ModuleRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-b-0">
      <dt>{label}</dt>
      <dd className="font-mono font-bold text-ink">{formatNumber(value)}</dd>
    </div>
  );
}
