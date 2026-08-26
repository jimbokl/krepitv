import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Info,
  ListChecks,
  Printer,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { ModelSearch } from "./ModelSearch.jsx";
import { MountDetailLink } from "./MountDetailLink.jsx";
import {
  calculateTvZoneSocketPlan,
  loadFreshModelAffiliateOffers,
  mountHref,
} from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
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

export function TvZoneSocketCalculator({
  compatibilityEdges = [],
  models = [],
  mounts = [],
  search = [],
}) {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [resultValues, setResultValues] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [modelQuery, setModelQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelAffiliateOffers, setModelAffiliateOffers] = useState([]);

  useEffect(() => {
    let active = true;
    setModelAffiliateOffers([]);
    if (!selectedModel?.id) return () => {
      active = false;
    };

    loadFreshModelAffiliateOffers({ modelId: selectedModel.id })
      .then((offers) => {
        if (active) setModelAffiliateOffers(offers);
      })
      .catch(() => {
        if (active) setModelAffiliateOffers([]);
      });

    return () => {
      active = false;
    };
  }, [selectedModel?.id]);

  const shortlistedMounts = useMemo(
    () => rankSocketMountMatches({
      compatibilityEdges,
      model: selectedModel,
      modelAffiliateOffers,
      mounts,
    }),
    [compatibilityEdges, modelAffiliateOffers, mounts, selectedModel],
  );

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function selectSearchItem(item) {
    setSelectedModel(models.find((model) => model.id === item?.id) ?? null);
  }

  function submitModel(item) {
    const model = models.find((candidate) => candidate.id === item?.id) ?? null;
    setSelectedModel(model);
    if (model) setModelQuery(model.title);
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
      setResultValues({ ...values });
      emitResultCompleted(window, {
        toolId: "tv_zone_socket_calculator",
        resultType: "socket_plan",
      });
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setResultValues(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт");
      setStatus("error");
    }
  }

  return (
    <section className="border-y-2 border-ink py-7" data-analytics-tool="tv_zone_socket_calculator" id="карта-розеток">
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
                label="Сдвиг блока по горизонтали"
                max="250"
                min="-250"
                name="socketHorizontalOffset"
                onChange={update}
                step="0.1"
                value={values.socketHorizontalOffset}
              />
              <NumberField
                hint="Плюс — вверх, минус — вниз от центра ТВ."
                label="Сдвиг блока по вертикали"
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
                  label="Сдвиг пластины по горизонтали"
                  max="250"
                  min="-250"
                  name="plateHorizontalOffset"
                  onChange={update}
                  step="0.1"
                  value={values.plateHorizontalOffset}
                />
                <NumberField
                  hint="Плюс — вверх, минус — вниз от центра ТВ."
                  label="Сдвиг пластины по вертикали"
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
        {result ? (
          <TvZoneSocketResult
            modelQuery={modelQuery}
            onModelChange={setModelQuery}
            onModelSelect={selectSearchItem}
            onModelSubmit={submitModel}
            result={result}
            search={search}
            selectedModel={selectedModel}
            shortlistedMounts={shortlistedMounts}
            values={resultValues}
          />
        ) : null}
      </div>
    </section>
  );
}

export function TvZoneSocketResult({
  modelQuery = "",
  onModelChange = () => {},
  onModelSelect = () => {},
  onModelSubmit = () => {},
  result,
  search = [],
  selectedModel = null,
  shortlistedMounts = [],
  values = initialValues,
}) {
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

      <TvZoneDiagram result={result} values={values} />

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

      <SocketMountContinuation
        modelQuery={modelQuery}
        onModelChange={onModelChange}
        onModelSelect={onModelSelect}
        onModelSubmit={onModelSubmit}
        search={search}
        selectedModel={selectedModel}
        shortlistedMounts={shortlistedMounts}
      />
    </div>
  );
}

function TvZoneDiagram({ result, values }) {
  const diagram = buildTvZoneDiagram(result, values);
  const conflict = result.socket_overlaps_service_zone;

  return (
    <figure
      className="mt-6 min-w-0 overflow-hidden border border-ink bg-white p-3 sm:p-5"
      data-tv-zone-diagram="true"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-action">
            Схема в масштабе
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold">Экран, пластина и блок розеток</h3>
        </div>
        <span className={`font-mono text-xs uppercase ${conflict ? "text-danger" : "text-verified"}`}>
          {conflict ? "Есть пересечение" : "Пересечения нет"}
        </span>
      </div>

      <svg
        aria-labelledby="tv-zone-diagram-title tv-zone-diagram-description"
        className="mt-4 block h-auto w-full max-w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={diagram.viewBox}
      >
        <title id="tv-zone-diagram-title">Масштабная схема ТВ-зоны</title>
        <desc id="tv-zone-diagram-description">
          Контур экрана, настенная пластина, сервисная зона и розеточный блок.
          При пересечении стрелка показывает рассчитанное направление минимального сдвига.
        </desc>
        <defs>
          <pattern height="16" id="socket-conflict-hatch" patternUnits="userSpaceOnUse" width="16" patternTransform="rotate(45)">
            <line stroke="#b42318" strokeWidth="5" x1="0" x2="0" y1="0" y2="16" />
          </pattern>
          <marker id="socket-shift-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#b42318" />
          </marker>
        </defs>
        <rect fill="#f3f1ec" height="620" width="1000" x="0" y="0" />
        <rect
          fill="#fff"
          stroke="#171717"
          strokeWidth="5"
          {...diagram.screen}
        />
        <rect
          fill="#e8e3d9"
          opacity="0.65"
          stroke="#d97706"
          strokeDasharray="14 10"
          strokeWidth="4"
          {...diagram.serviceZone}
        />
        <rect
          fill="#171717"
          opacity="0.86"
          {...diagram.plate}
        />
        <rect
          fill={conflict ? "url(#socket-conflict-hatch)" : "#d8f3e4"}
          stroke={conflict ? "#b42318" : "#137a46"}
          strokeWidth="5"
          {...diagram.socket}
        />
        {diagram.shiftedSocket ? (
          <rect
            fill="none"
            stroke="#137a46"
            strokeDasharray="12 8"
            strokeWidth="4"
            {...diagram.shiftedSocket}
          />
        ) : null}
        {diagram.arrow ? (
          <line
            markerEnd="url(#socket-shift-arrow)"
            stroke="#b42318"
            strokeLinecap="round"
            strokeWidth="7"
            {...diagram.arrow}
          />
        ) : null}
      </svg>

      <figcaption className="mt-3 grid gap-2 text-xs leading-relaxed text-muted sm:grid-cols-2 lg:grid-cols-4">
        <DiagramLegend swatch="border-ink bg-white" text="Контур экрана" />
        <DiagramLegend swatch="bg-ink" text="Пластина кронштейна" />
        <DiagramLegend swatch="border-action bg-[#e8e3d9]" text="Сервисная зона" />
        <DiagramLegend
          swatch={conflict ? "border-danger bg-danger/15" : "border-verified bg-verified/15"}
          text={conflict ? "Блок пересекает зону" : "Блок вне зоны"}
        />
      </figcaption>
      {diagram.arrow && result.minimum_shift_cm != null ? (
        <p className="mt-3 font-mono text-xs font-semibold text-danger">
          Минимальный сдвиг: {formatNumber(result.minimum_shift_cm)} см {result.shift_direction}.
          Пунктиром показано расчётное положение после сдвига.
        </p>
      ) : null}
    </figure>
  );
}

function DiagramLegend({ swatch, text }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className={`size-4 shrink-0 border-2 ${swatch}`} />
      <span>{text}</span>
    </span>
  );
}

function SocketMountContinuation({
  modelQuery,
  onModelChange,
  onModelSelect,
  onModelSubmit,
  search,
  selectedModel,
  shortlistedMounts,
}) {
  return (
    <section className="relative z-20 mt-8 border-t-2 border-ink pt-7" data-socket-mount-continuation="true">
      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Следующая проверка</p>
          <h3 className="mt-2 font-display text-3xl font-bold">Подберите кронштейн по точной модели</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Сначала свяжем план розеток с точными VESA, массой и диагональю телевизора.
            На Маркет отсюда не отправляем: каждый вариант открывается во внутренней карточке проверки.
          </p>
        </div>
        <ModelSearch
          buttonLabel="Показать кронштейны"
          compact
          onChange={onModelChange}
          onSelect={onModelSelect}
          onSubmit={onModelSubmit}
          placeholder="Введите модель полностью"
          search={search}
          value={modelQuery}
        />
      </div>

      {selectedModel ? (
        <SocketMountShortlist model={selectedModel} matches={shortlistedMounts} />
      ) : null}
    </section>
  );
}

export function SocketMountShortlist({ matches, model }) {
  if (!matches.length) {
    return (
      <p className="mt-5 border border-line bg-white/60 p-4 text-sm leading-relaxed text-muted">
        Для {model.title} в проверенном графе пока нет полностью подтверждённых вариантов.
        Используйте карточку модели и не заменяйте точную проверку общим размером диагонали.
      </p>
    );
  }

  return (
    <div className="mt-6" data-socket-mount-shortlist={matches.length}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ink pb-3">
        <h3 className="font-display text-2xl font-bold">До трёх проверенных вариантов для {model.title}</h3>
        <span className="font-mono text-xs uppercase text-muted">
          Оффер влияет только при равной технической оценке
        </span>
      </div>
      <div className="grid gap-4 pt-4 lg:grid-cols-3">
        {matches.map(({ edge, hasFreshOffer, mount }) => (
          <article className="flex min-w-0 flex-col border border-line bg-white/70 p-4" key={mount.id}>
            <p className="font-mono text-[0.68rem] uppercase text-verified">
              Совместимость подтверждена
            </p>
            <h4 className="mt-1 break-words font-display text-xl font-bold">{mount.title}</h4>
            <dl className="mt-3 grid gap-2 border-y border-line py-3 text-sm">
              <ShortlistFact label="Механизм" value={mechanismLabel(mount.mechanism)} />
              <ShortlistFact label="Нагрузка" value={`до ${formatNumber(mount.max_load_kg)} кг`} />
              <ShortlistFact label="От стены" value={formatDistance(mount)} />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              VESA, нагрузка и диагональ подтверждены графом совместимости.
              Геометрию пластины и доступ к разъёмам всё равно сверьте по изделию.
            </p>
            {hasFreshOffer ? (
              <p className="mt-3 font-mono text-[0.68rem] uppercase text-technical">
                Есть свежая точная карточка Маркета
              </p>
            ) : null}
            <MountDetailLink
              className="secondary-button mt-auto"
              href={mountHref(mount)}
              placement="compatibility_result"
            >
              Проверить карточку <ArrowRight aria-hidden="true" />
            </MountDetailLink>
            <span className="sr-only">Техническая оценка {edge.score}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function ShortlistFact({ label, value }) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold">{value}</dd>
    </div>
  );
}

export function rankSocketMountMatches({
  compatibilityEdges,
  model,
  modelAffiliateOffers = [],
  mounts,
  limit = 3,
}) {
  if (
    !model?.id ||
    !Array.isArray(compatibilityEdges) ||
    !Array.isArray(modelAffiliateOffers) ||
    !Array.isArray(mounts) ||
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    return [];
  }

  const mountById = new Map(mounts.map((mount) => [mount.id, mount]));
  const offerMountIds = new Set(
    modelAffiliateOffers
      .filter((offer) => offer?.model_id === model.id && typeof offer?.entity_id === "string")
      .map((offer) => offer.entity_id),
  );
  const seenMountIds = new Set();

  return compatibilityEdges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) =>
      edge?.tv_id === model.id &&
      edge?.compatible === true &&
      edge?.fit_status === "verified-fit" &&
      Number.isFinite(edge?.score) &&
      typeof edge?.mount_id === "string" &&
      mountById.has(edge.mount_id),
    )
    .filter(({ edge }) => {
      if (seenMountIds.has(edge.mount_id)) return false;
      seenMountIds.add(edge.mount_id);
      return true;
    })
    .map(({ edge, index }) => ({
      edge,
      hasFreshOffer: offerMountIds.has(edge.mount_id),
      index,
      mount: mountById.get(edge.mount_id),
    }))
    .sort((left, right) =>
      right.edge.score - left.edge.score ||
      Number(right.hasFreshOffer) - Number(left.hasFreshOffer) ||
      left.index - right.index,
    )
    .slice(0, limit)
    .map(({ index: _index, ...match }) => match);
}

export function buildTvZoneDiagram(result, values) {
  const screen = centeredRect(
    requiredNumber(result?.screen_width_cm, "Ширина экрана"),
    requiredNumber(result?.screen_height_cm, "Высота экрана"),
    0,
    0,
  );
  const plate = centeredRect(
    requiredNumber(values?.plateWidth, "Ширина пластины"),
    requiredNumber(values?.plateHeight, "Высота пластины"),
    requiredNumber(values?.plateHorizontalOffset, "Сдвиг пластины по горизонтали", true),
    requiredNumber(values?.plateVerticalOffset, "Сдвиг пластины по вертикали", true),
  );
  const socket = centeredRect(
    requiredNumber(values?.socketWidth, "Ширина блока"),
    requiredNumber(values?.socketHeight, "Высота блока"),
    requiredNumber(values?.socketHorizontalOffset, "Сдвиг блока по горизонтали", true),
    requiredNumber(values?.socketVerticalOffset, "Сдвиг блока по вертикали", true),
  );
  const serviceMargin = requiredNumber(values?.serviceMargin, "Сервисный зазор", true);
  const serviceZone = expandRect(plate, serviceMargin);
  const direction = shiftVector(result?.shift_direction);
  const shiftDistance = Number(result?.minimum_shift_cm);
  const shiftedSocket = direction && Number.isFinite(shiftDistance) && shiftDistance > 0
    ? translateRect(socket, direction.x * shiftDistance, direction.y * shiftDistance)
    : null;
  const rects = [screen, serviceZone, socket, ...(shiftedSocket ? [shiftedSocket] : [])];
  const unpaddedBounds = rects.reduce((bounds, rect) => ({
    left: Math.min(bounds.left, rect.left),
    right: Math.max(bounds.right, rect.right),
    bottom: Math.min(bounds.bottom, rect.bottom),
    top: Math.max(bounds.top, rect.top),
  }), { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity });
  const domainWidth = unpaddedBounds.right - unpaddedBounds.left;
  const domainHeight = unpaddedBounds.top - unpaddedBounds.bottom;
  const domainPadding = Math.max(4, Math.max(domainWidth, domainHeight) * 0.06);
  const bounds = expandRect(unpaddedBounds, domainPadding);
  const viewport = { width: 1000, height: 620, padding: 44 };
  const scale = Math.min(
    (viewport.width - viewport.padding * 2) / (bounds.right - bounds.left),
    (viewport.height - viewport.padding * 2) / (bounds.top - bounds.bottom),
  );
  const drawnWidth = (bounds.right - bounds.left) * scale;
  const drawnHeight = (bounds.top - bounds.bottom) * scale;
  const offsetX = (viewport.width - drawnWidth) / 2;
  const offsetY = (viewport.height - drawnHeight) / 2;

  function mapPoint(point) {
    return {
      x: roundSvg(offsetX + (point.x - bounds.left) * scale),
      y: roundSvg(offsetY + (bounds.top - point.y) * scale),
    };
  }

  function mapRect(rect) {
    const topLeft = mapPoint({ x: rect.left, y: rect.top });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: roundSvg((rect.right - rect.left) * scale),
      height: roundSvg((rect.top - rect.bottom) * scale),
    };
  }

  const currentCenter = mapPoint(rectCenter(socket));
  const shiftedCenter = shiftedSocket ? mapPoint(rectCenter(shiftedSocket)) : null;

  return {
    arrow: shiftedCenter ? {
      x1: currentCenter.x,
      y1: currentCenter.y,
      x2: shiftedCenter.x,
      y2: shiftedCenter.y,
    } : null,
    plate: mapRect(plate),
    screen: mapRect(screen),
    serviceZone: mapRect(serviceZone),
    shiftedSocket: shiftedSocket ? mapRect(shiftedSocket) : null,
    socket: mapRect(socket),
    viewBox: `0 0 ${viewport.width} ${viewport.height}`,
  };
}

function centeredRect(width, height, centerX, centerY) {
  return {
    left: centerX - width / 2,
    right: centerX + width / 2,
    bottom: centerY - height / 2,
    top: centerY + height / 2,
  };
}

function expandRect(rect, margin) {
  return {
    left: rect.left - margin,
    right: rect.right + margin,
    bottom: rect.bottom - margin,
    top: rect.top + margin,
  };
}

function translateRect(rect, x, y) {
  return {
    left: rect.left + x,
    right: rect.right + x,
    bottom: rect.bottom + y,
    top: rect.top + y,
  };
}

function rectCenter(rect) {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.bottom + rect.top) / 2,
  };
}

function requiredNumber(value, label, allowZero = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || (!allowZero && number <= 0)) {
    throw new TypeError(`${label}: требуется конечное ${allowZero ? "число" : "положительное число"}`);
  }
  return number;
}

function shiftVector(direction) {
  return {
    "влево": { x: -1, y: 0 },
    "вправо": { x: 1, y: 0 },
    "вниз": { x: 0, y: -1 },
    "вверх": { x: 0, y: 1 },
  }[direction] ?? null;
}

function roundSvg(value) {
  return Math.round(value * 100) / 100;
}

function mechanismLabel(value) {
  return {
    fixed: "фиксированный",
    tilt: "наклонный",
    "full-motion": "поворотно-выдвижной",
  }[value] ?? value;
}

function formatDistance(mount) {
  return mount.wall_distance_min_mm === mount.wall_distance_max_mm
    ? `${formatNumber(mount.wall_distance_min_mm)} мм`
    : `${formatNumber(mount.wall_distance_min_mm)}–${formatNumber(mount.wall_distance_max_mm)} мм`;
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
