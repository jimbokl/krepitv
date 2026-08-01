import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Broadcast,
  Info,
  Laptop,
  SlidersHorizontal,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateTvTrafficTask } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const sourceRegistry = {
  "microsoft-multiple-displays": {
    label: "Microsoft: экраны Windows",
    url: "https://support.microsoft.com/ru-RU/Windows/Hardware/Display-Graphics/how-to-use-multiple-monitors-in-windows",
  },
  "microsoft-wireless-display": {
    label: "Microsoft: беспроводной дисплей",
    url: "https://support.microsoft.com/ru-RU/Windows/Hardware/Display-Graphics/screen-mirroring-and-projecting-to-your-pc-or-wireless-display",
  },
  "apple-mac-tv-display": {
    label: "Apple: телевизор как дисплей Mac",
    url: "https://support.apple.com/ru-ru/guide/mac-help/mchlp1206/mac",
  },
  "apple-mac-airplay": {
    label: "Apple: AirPlay с Mac",
    url: "https://support.apple.com/ru-ru/guide/mac-help/mchld7e543a0/mac",
  },
  "vesa-displayport": {
    label: "VESA: DisplayPort через USB-C",
    url: "https://www.displayport.org/faq/",
  },
  "samsung-channel-setup": {
    label: "Samsung: эфирные и кабельные каналы",
    url: "https://www.samsung.com/ru/support/tv-audio-video/where-can-i-find-free-channels-on-my-samsung-tv/",
  },
  "lg-channel-autotune": {
    label: "LG: настройка цифровых каналов",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413221090",
  },
  "rtrs-digital-terrestrial": {
    label: "РТРС: цифровое эфирное ТВ",
    url: "https://plus.rtrs.ru/info/",
  },
  "sony-picture-settings": {
    label: "Sony: базовая настройка изображения",
    url: "https://www.sony.ru/electronics/support/articles/00190409",
  },
  "sony-hdr-picture-mode": {
    label: "Sony: режим изображения для HDR",
    url: "https://www.sony.ru/electronics/support/articles/00133796",
  },
  "samsung-picture-menu-availability": {
    label: "Samsung: доступность настроек изображения",
    url: "https://www.samsung.com/ru/support/tv-audio-video/menu-item-in-image-settings-has-greyed-out/",
  },
  "samsung-picture-test": {
    label: "Samsung: встроенный тест изображения",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-run-test-image-on-samsung-tv/",
  },
  "samsung-game-mode": {
    label: "Samsung: игровой режим",
    url: "https://www.samsung.com/ru/support/tv-audio-video/smart-tv-game-mode-turn-on/",
  },
};

const sourceAliases = {
  "apple-mac-tv": "apple-mac-tv-display",
  "lg-digital-channels": "lg-channel-autotune",
  "rtrs-dtv": "rtrs-digital-terrestrial",
  "sony-picture-guide": "sony-picture-settings",
  "samsung-picture-settings": "samsung-picture-menu-availability",
  "samsung-adaptive-picture": "samsung-picture-menu-availability",
};

const configs = {
  "laptop-to-tv": {
    Icon: Laptop,
    kicker: "Подключение без перебора кабелей",
    title: "Мастер ноутбук → телевизор",
    description: "Выберите систему и предполагаемый путь. Мастер отделит полноценный HDMI от USB-C без видеовыхода и беспроводной протокол от общей надписи Wi-Fi.",
    buttonLabel: "Показать способ подключения",
    loadingLabel: "Проверяем видеовыход и режим экрана…",
    toolId: "laptop_tv_connection",
    primary: {
      legend: "1. Какая система на ноутбуке?",
      options: [
        ["windows", "Windows", "Win + P, Win + K и проверка Miracast"],
        ["macos", "macOS", "Дисплеи, видеокабель или AirPlay"],
        ["other", "Другая система", "Нужна инструкция точной модели"],
        ["unknown", "Не знаю", "Сначала определим систему и порты"],
      ],
    },
    secondary: {
      legend: "2. Как хотите подключить?",
      options: [
        ["hdmi", "HDMI", "Полноразмерный видеовыход на ноутбуке"],
        ["usb-c", "USB-C", "Только с подтверждённым видеовыходом"],
        ["wireless", "Без провода", "Miracast или AirPlay должны быть на обоих устройствах"],
        ["unknown", "Не знаю", "Сначала сверим разъёмы и функции"],
      ],
    },
    tertiary: {
      defaultValue: "mirror",
      legend: "Что должно быть на телевизоре?",
      options: [
        ["mirror", "Повтор экрана"],
        ["extend", "Второй рабочий стол"],
        ["video", "Фильм или презентация"],
        ["game", "Игра"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: ({ secondary }) => secondary === "wireless"
        ? "Поддержка Miracast или AirPlay подтверждена у телевизора?"
        : "Видеовыход через этот разъём подтверждён в паспорте ноутбука?",
      show: ({ secondary }) => ["usb-c", "wireless"].includes(secondary),
    },
    referenceSourceIds: [
      "microsoft-wireless-display",
      "apple-mac-tv-display",
      "apple-mac-airplay",
      "vesa-displayport",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Изображение раньше было, а теперь пропало? Открыть диагностику «Нет сигнала»",
    },
  },
  "digital-channels": {
    Icon: Broadcast,
    kicker: "Поиск каналов без потери источника",
    title: "Мастер настройки цифровых каналов",
    description: "Сначала отделим эфирную антенну от кабельного оператора и внешней приставки. Только после этого появится подходящий порядок поиска.",
    buttonLabel: "Составить план настройки",
    loadingLabel: "Разделяем источник и устройство настройки…",
    toolId: "digital_channel_setup",
    primary: {
      legend: "1. Откуда приходят каналы?",
      options: [
        ["antenna", "Эфирная антенна", "Комнатная, наружная или общедомовая сеть"],
        ["cable", "Кабельный оператор", "Коаксиальный кабель прямо в телевизор"],
        ["provider-box", "Приставка оператора", "HDMI или AV от отдельной коробки"],
        ["satellite", "Спутниковая приставка", "Список каналов хранит приёмник"],
        ["unknown", "Не знаю", "Проследим подключённый кабель"],
      ],
    },
    secondary: {
      legend: "2. Где открывается список каналов?",
      options: [
        ["built-in", "В меню телевизора", "Используется встроенный тюнер"],
        ["external", "В меню приставки", "Нужен её пульт и инструкция"],
        ["unknown", "Не знаю", "Сначала определим устройство"],
      ],
    },
    tertiary: {
      defaultValue: "first-setup",
      legend: "Что происходит сейчас?",
      options: [
        ["first-setup", "Настраиваю впервые"],
        ["zero-channels", "Поиск находит 0 каналов"],
        ["some-missing", "Пропали отдельные каналы"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Доступный антенный или операторский кабель подключён плотно?",
      show: ({ primary, secondary }) => secondary === "built-in" && ["antenna", "cable"].includes(primary),
    },
    referenceSourceIds: [
      "samsung-channel-setup",
      "lg-channel-autotune",
      "rtrs-digital-terrestrial",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Каналы уже работали и внезапно исчезли? Открыть диагностику сигнала",
    },
  },
  "picture-setup": {
    Icon: SlidersHorizontal,
    kicker: "Обратимая настройка без чужих цифр",
    title: "Мастер настройки изображения",
    description: "Получите базовый режим под комнату и контент, затем меняйте один параметр за раз. Сервис не выдаёт универсальные числа за профессиональную калибровку.",
    buttonLabel: "Получить план настройки",
    loadingLabel: "Собираем обратимый порядок сравнения…",
    toolId: "picture_setup",
    primary: {
      legend: "1. Что вы настраиваете?",
      options: [
        ["everyday", "Обычный просмотр", "ТВ, приложения и смешанный контент"],
        ["movie", "Фильмы и сериалы", "Спокойная обработка и постоянный свет"],
        ["sports", "Спорт", "Отдельная проверка движения"],
        ["game", "Игры", "Задержка управления важнее украшений"],
      ],
    },
    secondary: {
      legend: "2. Как обычно освещена комната?",
      options: [
        ["dark", "Темно", "Вечерний просмотр"],
        ["mixed", "Освещение меняется", "Обычная гостиная"],
        ["bright", "Светло", "Дневной свет и отражения"],
      ],
    },
    tertiary: {
      defaultValue: "baseline",
      legend: "Что хотите исправить?",
      options: [
        ["baseline", "Нужна базовая настройка"],
        ["too-dark", "Слишком темно"],
        ["too-bright", "Слишком ярко"],
        ["unnatural", "Неестественные цвета"],
        ["motion", "Рывки или «мыльная опера»"],
        ["lag", "Задержка в игре"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Телевизор подтверждает, что сейчас воспроизводится HDR?",
      show: () => true,
    },
    referenceSourceIds: [
      "sony-picture-settings",
      "samsung-picture-menu-availability",
      "samsung-picture-test",
      "samsung-game-mode",
      "sony-hdr-picture-mode",
    ],
    next: {
      href: "/rasstoyanie-do-televizora-i-diagonal/",
      label: "Проверить расстояние просмотра и диагональ",
    },
  },
};

const statusCopy = {
  ready: ["Маршрут готов", "Условия подтверждены", "text-verified"],
  "needs-check": ["План проверки", "Нужно подтвердить один признак", "text-technical"],
  "no-direct-path": ["Маршрут остановлен", "Совместимость не подтверждена", "text-action"],
  "provider-path": ["Источник определён", "Настройка выполняется на приставке", "text-technical"],
  "reversible-baseline": ["План готов", "Изменения можно вернуть", "text-verified"],
};

export function TvTrafficTaskWizard({ task }) {
  const config = configs[task];
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [tertiary, setTertiary] = useState(config?.tertiary.defaultValue ?? "");
  const [detail, setDetail] = useState(config?.detail.defaultValue ?? "unknown");
  const [requestState, setRequestState] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultHeadingRef = useRef(null);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  const resultSources = useMemo(() => {
    if (!result) return [];
    const ids = new Set(
      result.steps.flatMap((step) => step.source_ids.map((id) => sourceAliases[id] ?? id)),
    );
    return [...ids].flatMap((id) => sourceRegistry[id] ? [{ id, ...sourceRegistry[id] }] : []);
  }, [result]);

  if (!config) return null;
  const Icon = config.Icon;
  const detailVisible = config.detail.show({ primary, secondary });

  function invalidate() {
    setRequestState("idle");
    setResult(null);
    setError(null);
  }

  function choose(setter, value) {
    setter(value);
    invalidate();
  }

  async function runCalculation() {
    if (!primary || !secondary) return;
    setRequestState("loading");
    setError(null);
    try {
      const plan = await calculateTvTrafficTask({
        task,
        primary,
        secondary,
        tertiary,
        detail: detailVisible ? detail : "unknown",
      });
      setResult(plan);
      setRequestState("ready");
      emitResultCompleted(window, {
        toolId: config.toolId,
        resultType: `${plan.status.replaceAll("-", "_")}_plan`,
      });
    } catch (caught) {
      setResult(null);
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : "Не удалось составить план");
    }
  }

  async function submit(event) {
    event.preventDefault();
    await runCalculation();
  }

  return (
    <section
      className="border-y-2 border-ink py-7"
      data-tv-traffic-task={task}
      id="мастер"
    >
      <div className="grid min-w-0 gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-wrap items-start gap-4">
          <Icon aria-hidden="true" className="size-[min(3.5rem,18vw)] shrink-0 text-action" />
          <div className="min-w-[min(12rem,100%)] flex-1 [overflow-wrap:anywhere]">
            <p className="font-mono text-[min(0.75rem,4.5vw)] uppercase tracking-[0.12em] text-action">
              {config.kicker}
            </p>
            <h2 className="mt-2 font-display text-[min(2.25rem,14vw)] font-bold leading-none">
              {config.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {config.description}
            </p>
          </div>
        </div>

        <form className="min-w-0" onSubmit={submit}>
          <ChoiceGrid
            columns="sm:grid-cols-2"
            legend={config.primary.legend}
            name={`${task}-primary`}
            onChange={(value) => choose(setPrimary, value)}
            options={config.primary.options}
            value={primary}
          />

          {primary ? (
            <div className="mt-7" data-wizard-step="secondary">
              <ChoiceGrid
                columns="sm:grid-cols-2"
                legend={config.secondary.legend}
                name={`${task}-secondary`}
                onChange={(value) => choose(setSecondary, value)}
                options={config.secondary.options}
                value={secondary}
              />
            </div>
          ) : (
            <p className="mt-5 border-l-2 border-line pl-4 text-sm text-muted" aria-live="polite">
              Далее — уточним источник или способ подключения.
            </p>
          )}

          {primary && secondary ? (
            <details className="group mt-7 border-y border-line py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                Уточнить задачу — необязательно
                <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="space-y-7 pb-5 pt-2">
                <ChoiceGrid
                  columns="sm:grid-cols-3"
                  legend={config.tertiary.legend}
                  name={`${task}-tertiary`}
                  onChange={(value) => choose(setTertiary, value)}
                  options={config.tertiary.options}
                  value={tertiary}
                />
                {detailVisible ? (
                  <TriStateChoice
                    legend={config.detail.legend({ primary, secondary })}
                    name={`${task}-detail`}
                    onChange={(value) => choose(setDetail, value)}
                    value={detail}
                  />
                ) : null}
              </div>
            </details>
          ) : null}

          <button
            className="primary-button mt-7 min-h-14 w-full sm:w-auto"
            disabled={!primary || !secondary || requestState === "loading"}
            type="submit"
          >
            {requestState === "loading" ? config.loadingLabel : config.buttonLabel}
            {requestState !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
          </button>

          {requestState === "loading" ? (
            <p className="mt-2 text-sm text-muted" role="status">
              Ответы сохранены. Загружаем локальный модуль.
            </p>
          ) : null}

          {error ? (
            <div className="mt-5 border-2 border-danger p-4" role="alert">
              <div className="flex gap-3">
                <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-danger" />
                <div>
                  <p className="font-semibold text-danger">Не удалось составить план.</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{error}. Выбранные ответы сохранены.</p>
                </div>
              </div>
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

      {result ? (
        <TrafficTaskResult
          config={config}
          result={result}
          resultHeadingRef={resultHeadingRef}
          sources={resultSources}
          task={task}
        />
      ) : null}
    </section>
  );
}

function ChoiceGrid({ columns = "sm:grid-cols-3", legend, name, onChange, options, value }) {
  return (
    <fieldset>
      <legend className="font-display text-xl font-bold">{legend}</legend>
      <div className={`mt-3 grid gap-px border border-ink bg-ink ${columns}`}>
        {options.map(([optionValue, label, description]) => (
          <label
            className={`relative flex min-h-16 cursor-pointer flex-col justify-center bg-paper px-4 py-3 transition focus-within:z-10 focus-within:ring-2 focus-within:ring-action ${
              value === optionValue ? "bg-white text-ink" : "hover:bg-white/70"
            }`}
            key={optionValue}
          >
            <input
              checked={value === optionValue}
              className="peer sr-only"
              name={name}
              onChange={() => onChange(optionValue)}
              type="radio"
              value={optionValue}
            />
            <span className="font-display text-lg font-bold [overflow-wrap:anywhere] peer-checked:text-action">{label}</span>
            {description ? <span className="mt-1 text-xs leading-relaxed text-muted">{description}</span> : null}
            <span className="absolute right-3 top-3 size-2 rounded-full border border-ink bg-paper peer-checked:border-action peer-checked:bg-action" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TriStateChoice({ legend, name, onChange, value }) {
  return (
    <ChoiceGrid
      columns="grid-cols-3"
      legend={legend}
      name={name}
      onChange={onChange}
      options={[
        ["yes", "Да"],
        ["no", "Нет"],
        ["unknown", "Не знаю"],
      ]}
      value={value}
    />
  );
}

function TrafficTaskResult({ config, result, resultHeadingRef, sources, task }) {
  const [kicker, statusLabel, statusClassName] = statusCopy[result.status] ?? statusCopy["needs-check"];
  return (
    <section
      className="mt-8 border-t-2 border-ink pt-7"
      data-tv-traffic-result={result.status}
      data-tv-traffic-result-task={task}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">{kicker}</p>
          <h2
            className="mt-2 font-display text-4xl font-extrabold leading-tight outline-none focus-visible:ring-2 focus-visible:ring-action"
            ref={resultHeadingRef}
            tabIndex={-1}
          >
            {result.headline}
          </h2>
          <p className="mt-3 max-w-4xl leading-relaxed text-muted">{result.explanation}</p>
        </div>
        <div className="border-l-2 border-line pl-5">
          <p className="font-mono text-xs uppercase text-muted">Статус</p>
          <p className={`mt-2 font-display text-2xl font-bold ${statusClassName}`}>{statusLabel}</p>
        </div>
      </div>

      <ol className="mt-7 divide-y divide-line border-y-2 border-ink">
        {result.steps.map((step, index) => (
          <li className="grid gap-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]" key={step.id}>
            <span className="font-display text-3xl font-extrabold text-action" aria-hidden="true">{index + 1}</span>
            <div>
              <h3 className="font-display text-2xl font-bold">{step.title}</h3>
              <p className="mt-2 leading-relaxed">{step.instruction}</p>
              <p className="mt-3 border-l-2 border-technical pl-4 text-sm leading-relaxed text-muted">
                Стоп-условие: {step.stop_condition}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {task === "picture-setup" ? <PictureCheckPatterns /> : null}

      <details className="group mt-7 border-y border-line py-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Ограничения результата
          <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div className="space-y-3 pb-5 pt-1">
          {result.warnings.map((warning) => (
            <p className="flex gap-3 text-sm leading-relaxed text-muted" key={warning}>
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-technical" />
              {warning}
            </p>
          ))}
          <p className="text-sm leading-relaxed text-muted">{result.privacy}</p>
        </div>
      </details>

      {sources.length ? (
        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Источники результата">
          {sources.map((source) => (
            <a
              className="text-technical underline underline-offset-4"
              data-tv-traffic-source={source.id}
              href={source.url}
              key={source.id}
              rel="noreferrer"
              target="_blank"
            >
              {source.label}
            </a>
          ))}
        </nav>
      ) : null}

      <p className="mt-6">
        <a className="font-semibold text-action underline underline-offset-4" href={config.next.href}>
          {config.next.label} <ArrowRight aria-hidden="true" className="inline size-4" />
        </a>
      </p>
    </section>
  );
}

function PictureCheckPatterns() {
  const shades = ["opacity-5", "opacity-10", "opacity-20", "opacity-30", "opacity-40", "opacity-50", "opacity-60", "opacity-70", "opacity-80", "opacity-90"];
  return (
    <section className="mt-8 border-t border-line pt-6" data-picture-check-patterns="true">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Локальные тест-паттерны</p>
      <h3 className="mt-2 font-display text-3xl font-extrabold">Сравните, не копируя чужие числа</h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        Откройте страницу на телевизоре или выведите её тем же способом, который настраиваете. Паттерны помогают сравнить режимы, но не измеряют точность панели.
      </p>
      <div className="mt-5 grid gap-px border border-ink bg-ink lg:grid-cols-3">
        <figure className="bg-paper p-4">
          <figcaption className="font-display text-xl font-bold">Ступени серого</figcaption>
          <div className="mt-4 grid h-40 grid-cols-5 border border-line bg-white" aria-label="Десять ступеней серого">
            {shades.map((opacity) => <span className={`bg-ink ${opacity}`} key={opacity} />)}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">Соседние ступени должны различаться; точное число уровней зависит от всей цепочки.</p>
        </figure>
        <figure className="bg-paper p-4">
          <figcaption className="font-display text-xl font-bold">Чёрно-белая сетка</figcaption>
          <svg className="mt-4 block h-40 w-full border border-line bg-white text-ink" role="img" viewBox="0 0 10 8" aria-label="Чередующаяся чёрно-белая сетка для проверки резкости">
            {Array.from({ length: 80 }, (_, index) => {
              const x = index % 10;
              const y = Math.floor(index / 10);
              return (x + y) % 2 === 0 ? <rect fill="currentColor" height="1" key={index} width="1" x={x} y={y} /> : null;
            })}
          </svg>
          <p className="mt-3 text-xs leading-relaxed text-muted">Ищите лишние светлые контуры; меняйте только резкость или аналогичный параметр.</p>
        </figure>
        <figure className="bg-paper p-4">
          <figcaption className="font-display text-xl font-bold">Равномерное поле</figcaption>
          <div className="mt-4 h-40 border border-line bg-line" aria-label="Равномерное нейтральное поле" />
          <p className="mt-3 text-xs leading-relaxed text-muted">Смотрите с обычного места. Фото телефона, компрессия и углы обзора могут создавать ложные пятна.</p>
        </figure>
      </div>
    </section>
  );
}

export function TvTrafficTaskReference({ task }) {
  const config = configs[task];
  if (!config) return null;
  return (
    <section className="border-b-2 border-ink py-7" data-tv-traffic-reference={task}>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Проверено 1 августа 2026</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold">Откуда взяты шаги</h2>
      <p className="mt-3 max-w-4xl leading-relaxed text-muted">
        Мастер использует только совпадающие безопасные действия из официальных инструкций. Точные названия меню, поддержка протокола, тюнера или режима всегда проверяются по модели.
      </p>
      <nav className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники мастера">
        {config.referenceSourceIds.map((id) => (
          <a
            className="text-technical underline underline-offset-4"
            data-tv-traffic-reference-source={id}
            href={sourceRegistry[id].url}
            key={id}
            rel="noreferrer"
            target="_blank"
          >
            {sourceRegistry[id].label}
          </a>
        ))}
      </nav>
    </section>
  );
}
