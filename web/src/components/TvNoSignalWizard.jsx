import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Broadcast,
  CheckCircle,
  Info,
  PlugsConnected,
  TelevisionSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateTvNoSignal } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const sourceOptions = [
  ["hdmi", "Приставка, консоль или компьютер", "Устройство подключено к HDMI"],
  ["terrestrial", "Эфирная антенна", "Антенный кабель подключён прямо к телевизору"],
  ["cable-box", "Приставка кабельного оператора", "Внешняя приставка подключена к телевизору по HDMI"],
  ["satellite", "Спутниковое ТВ", "Тарелка и отдельный приёмник"],
  ["unknown", "Не знаю", "Сначала определим, кто показывает сообщение"],
];

const officialSources = {
  "samsung-hdmi": [
    "Samsung: проверка HDMI",
    "https://www.samsung.com/ru/support/tv-audio-video/no-signal-while-connect-devices-through-hdmi/",
  ],
  "sony-hdmi": [
    "Sony: устранение неполадок HDMI",
    "https://www.sony.ru/electronics/support/articles/00298459",
  ],
  "samsung-channel-setup": [
    "Samsung: настройка телеканалов",
    "https://www.samsung.com/ru/support/tv-audio-video/where-can-i-find-free-channels-on-my-samsung-tv/",
  ],
  "rtrs-dtv": [
    "РТРС: настройка цифрового ТВ",
    "https://plus.rtrs.ru/info/",
  ],
};

const resultCopy = {
  "action-plan": {
    className: "text-verified",
    kicker: "План проверки готов",
    label: "Начните с одного безопасного действия",
    viewState: "success",
  },
  "unknown-source": {
    className: "text-technical",
    kicker: "Сначала определим источник",
    label: "Причину пока нельзя подтвердить",
    viewState: "unknown-source",
  },
  "needs-service": {
    className: "text-action",
    kicker: "Обычную проверку останавливаем",
    label: "Нужна проверка самого телевизора",
    viewState: "needs-service",
  },
  "provider-path": {
    className: "text-technical",
    kicker: "Проверьте линию оператора",
    label: "Телевизор и выбранный вход уже отделены от проблемы",
    viewState: "provider-path",
  },
};

const resultTypes = {
  "action-plan": "success_plan",
  "unknown-source": "unknown_source_plan",
  "needs-service": "needs_service_plan",
  "provider-path": "provider_path_plan",
};

export function TvNoSignalWizard() {
  const [source, setSource] = useState("");
  const [tvMenuVisible, setTvMenuVisible] = useState("");
  const [sourcePowered, setSourcePowered] = useState("unknown");
  const [inputMatches, setInputMatches] = useState("unknown");
  const [cableConnected, setCableConnected] = useState("unknown");
  const [receiverMenuVisible, setReceiverMenuVisible] = useState("unknown");
  const [result, setResult] = useState(null);
  const [requestState, setRequestState] = useState("idle");
  const [error, setError] = useState(null);
  const resultHeadingRef = useRef(null);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function invalidateResult() {
    setResult(null);
    setRequestState("idle");
    setError(null);
  }

  function choose(setter, value) {
    setter(value);
    invalidateResult();
  }

  async function runCalculation() {
    if (!source || !tvMenuVisible || requestState === "loading") return;
    setRequestState("loading");
    setError(null);
    setResult(null);

    try {
      const plan = await calculateTvNoSignal({
        source,
        tvMenuVisible,
        sourcePowered,
        inputMatches,
        cableConnected,
        receiverMenuVisible,
      });
      setResult(plan);
      setRequestState("ready");
      emitResultCompleted(window, {
        toolId: "tv_no_signal",
        resultType: resultTypes[plan.status] ?? "unknown_source_plan",
      });
    } catch (caught) {
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : "Не удалось открыть локальный модуль проверки");
    }
  }

  function submit(event) {
    event.preventDefault();
    void runCalculation();
  }

  const showExternalQuestions = tvMenuVisible === "yes"
    && ["hdmi", "cable-box", "satellite"].includes(source);

  return (
    <section
      className="border-y-2 border-ink py-7"
      data-analytics-tool="tv_no_signal"
      data-tv-no-signal-wizard="true"
      id="мастер-проверки-сигнала"
    >
      <div className="grid min-w-0 gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <Broadcast aria-hidden="true" className="size-14 shrink-0 text-action" />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Бесплатно · без регистрации
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Проверка «Нет сигнала»
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Отделим телевизор от HDMI, приставки и антенны. Мастер покажет одну
              следующую проверку, а не будет угадывать поломку.
            </p>
          </div>
        </div>

        <form className="min-w-0" onSubmit={submit}>
          <ChoiceGrid
            columns="sm:grid-cols-2"
            fillLast
            legend="1. Что вы обычно смотрите?"
            name="signal-source"
            onChange={(value) => choose(setSource, value)}
            options={sourceOptions}
            value={source}
          />

          {source ? (
            <div className="mt-7" data-wizard-step="tv-menu">
              <TriStateChoice
                legend="2. Открывается ли меню телевизора или шкала громкости?"
                name="tv-menu-visible"
                onChange={(value) => choose(setTvMenuVisible, value)}
                value={tvMenuVisible}
              />
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Нажмите на пульте кнопку настроек или громкости. Важно увидеть именно
                графику телевизора поверх надписи «Нет сигнала».
              </p>
            </div>
          ) : (
            <p className="mt-5 border-l-2 border-line pl-4 text-sm text-muted" aria-live="polite">
              Далее — проверим, работает ли собственное меню телевизора.
            </p>
          )}

          {source && tvMenuVisible ? (
            <details className="group mt-7 border-y border-line py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                Уточнить наблюдения — необязательно
                <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="space-y-7 pb-5 pt-2">
                {showExternalQuestions ? (
                  <TriStateChoice
                    legend="Приставка, приёмник или другое внешнее устройство включено?"
                    name="source-powered"
                    onChange={(value) => choose(setSourcePowered, value)}
                    value={sourcePowered}
                  />
                ) : null}

                {["hdmi", "cable-box", "satellite"].includes(source) && tvMenuVisible === "yes" ? (
                  <TriStateChoice
                    legend="Выбранный на телевизоре вход совпадает с разъёмом кабеля?"
                    name="input-matches"
                    onChange={(value) => choose(setInputMatches, value)}
                    value={inputMatches}
                  />
                ) : null}

                {source === "terrestrial" && tvMenuVisible === "yes" ? (
                  <TriStateChoice
                    legend="Антенный кабель доступен и плотно подключён к телевизору?"
                    name="cable-connected"
                    onChange={(value) => choose(setCableConnected, value)}
                    value={cableConnected}
                  />
                ) : null}

                {["cable-box", "satellite"].includes(source) && tvMenuVisible === "yes" ? (
                  <TriStateChoice
                    legend="Открывается ли меню или заставка внешней приставки?"
                    name="receiver-menu-visible"
                    onChange={(value) => choose(setReceiverMenuVisible, value)}
                    value={receiverMenuVisible}
                  />
                ) : null}

                {!showExternalQuestions && source !== "terrestrial" ? (
                  <p className="border-l-2 border-technical pl-4 text-sm leading-relaxed text-muted">
                    Дополнительные ответы не нужны: мастер честно начнёт с определения источника.
                  </p>
                ) : null}
              </div>
            </details>
          ) : null}

          <button
            className="primary-button mt-7 min-h-14 w-full sm:w-auto"
            disabled={!source || !tvMenuVisible || requestState === "loading"}
            type="submit"
          >
            {requestState === "loading" ? "Составляем план…" : "Показать следующую проверку"}
            {requestState !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
          </button>

          {requestState === "loading" ? (
            <p className="mt-2 text-sm text-muted" role="status">
              Ответы сохранены. Загружаем локальный модуль проверки.
            </p>
          ) : null}

          {error ? (
            <div className="mt-5 border-2 border-danger p-4" role="alert">
              <div className="flex gap-3">
                <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-danger" />
                <div>
                  <p className="font-semibold text-danger">Не удалось составить план.</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {error}. Выбранные ответы сохранены.
                  </p>
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

      {result ? <NoSignalResult result={result} resultHeadingRef={resultHeadingRef} /> : null}
    </section>
  );
}

function ChoiceGrid({ columns = "sm:grid-cols-3", fillLast = false, legend, name, onChange, options, value }) {
  return (
    <fieldset>
      <legend className="font-display text-xl font-bold">{legend}</legend>
      <div className={`mt-3 grid gap-px border border-ink bg-ink ${columns}`}>
        {options.map(([optionValue, label, description]) => (
          <label
            className={`relative flex min-h-16 cursor-pointer flex-col justify-center bg-paper px-4 py-3 transition focus-within:z-10 focus-within:ring-2 focus-within:ring-action ${fillLast ? "sm:last:col-span-2" : ""} ${
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
            <span className="break-words pr-5 font-display text-lg font-bold peer-checked:text-action">
              {label}
            </span>
            {description ? <span className="mt-1 text-xs leading-relaxed text-muted">{description}</span> : null}
            <span
              aria-hidden="true"
              className="absolute right-3 top-3 size-2 rounded-full border border-ink bg-paper peer-checked:border-action peer-checked:bg-action"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TriStateChoice({ legend, name, onChange, value }) {
  return (
    <ChoiceGrid
      columns="grid-cols-1 sm:grid-cols-3"
      legend={legend}
      name={name}
      onChange={onChange}
      options={[["yes", "Да"], ["no", "Нет"], ["unknown", "Не знаю"]]}
      value={value}
    />
  );
}

function normalizeStep(step, index) {
  if (typeof step === "string") {
    return {
      id: `step-${index + 1}`,
      title: `Проверка ${index + 1}`,
      instruction: step,
      source_ids: [],
      stop_condition: "",
    };
  }
  return {
    id: step.id || `step-${index + 1}`,
    title: step.title || `Проверка ${index + 1}`,
    instruction: step.instruction || "",
    source_ids: Array.isArray(step.source_ids) ? step.source_ids : [],
    stop_condition: step.stop_condition || "",
  };
}

function NoSignalResult({ result, resultHeadingRef }) {
  const copy = resultCopy[result.status] ?? resultCopy["unknown-source"];
  const steps = Array.isArray(result.steps) ? result.steps.map(normalizeStep) : [];
  const primary = steps.find((step) => step.id === result.primary_step_id) ?? steps[0] ?? null;
  const remaining = primary ? steps.filter((step) => step.id !== primary.id) : [];
  const stopConditions = Array.isArray(result.stop_conditions) ? result.stop_conditions : [];

  return (
    <section
      className="mt-8 border-t-2 border-ink pt-7"
      data-engine-status={result.status}
      data-tv-no-signal-result={copy.viewState}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <p className={`font-mono text-xs uppercase tracking-[0.12em] ${copy.className}`}>
            {copy.kicker}
          </p>
          <h2
            className="mt-2 font-display text-4xl font-extrabold leading-none outline-none sm:text-5xl"
            ref={resultHeadingRef}
            tabIndex="-1"
          >
            {result.headline || "Следующая проверка готова"}
          </h2>
          <p className={`mt-3 font-semibold ${copy.className}`}>{copy.label}</p>
          {result.explanation ? (
            <p className="mt-4 max-w-3xl leading-relaxed text-muted">{result.explanation}</p>
          ) : null}
        </div>
        <div className="border-l-2 border-line pl-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Проверка выполнена на устройстве</p>
          <p className="mt-1">Ответы не отправляются на сервер и не требуют регистрации.</p>
        </div>
      </div>

      {primary ? <PlanStep primary step={primary} /> : null}

      {remaining.length ? (
        <details className="group mt-6 border-y border-line py-1">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
            Если не помогло — ещё {remaining.length === 1 ? "одна проверка" : `${remaining.length} проверки`}
            <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <ol className="border-t border-line pb-3">
            {remaining.map((step, index) => (
              <li className="border-b border-line py-5 last:border-b-0" key={step.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
                  Проверка {index + 2}
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold">{step.title}</h3>
                <p className="mt-2 max-w-3xl leading-relaxed text-muted">{step.instruction}</p>
                {step.stop_condition ? (
                  <p className="mt-3 border-l-2 border-technical pl-4 text-sm leading-relaxed">
                    <strong>Остановитесь, если:</strong> {step.stop_condition}
                  </p>
                ) : null}
                <SourceLinks sourceIds={step.source_ids} />
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <div className="mt-6 flex items-start gap-3 border-2 border-ink p-4">
        <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-action" />
        <div>
          <h3 className="font-display text-xl font-bold">Граница безопасной проверки</h3>
          <p className="mt-1 text-sm leading-relaxed">
            Не разбирайте телевизор и не поднимайтесь к антенне на крышу.
          </p>
          {stopConditions.length ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              {stopConditions.map((condition) => <li key={condition}>— {condition}</li>)}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PlanStep({ primary = false, step }) {
  return (
    <article className="mt-7 border-y border-line py-6" data-tv-no-signal-step={step.id}>
      <div className="flex items-start gap-4">
        <CheckCircle aria-hidden="true" className="mt-1 size-8 shrink-0 text-verified" />
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            {primary ? "Сделайте сейчас" : "Следующая проверка"}
          </p>
          <h3 className="mt-2 font-display text-3xl font-bold">{step.title}</h3>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">{step.instruction}</p>
        </div>
      </div>
      {step.stop_condition ? (
        <p className="mt-5 border-l-2 border-technical pl-4 text-sm leading-relaxed">
          <strong>Остановитесь, если:</strong> {step.stop_condition}
        </p>
      ) : null}
      <SourceLinks sourceIds={step.source_ids} />
    </article>
  );
}

function SourceLinks({ sourceIds }) {
  const sources = [...new Set(sourceIds)]
    .map((sourceId) => [sourceId, officialSources[sourceId]])
    .filter(([, source]) => Boolean(source));
  if (!sources.length) return null;

  return (
    <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
      <strong className="text-ink">Основание:</strong>
      {sources.map(([sourceId, source]) => (
        <a
          className="text-technical underline underline-offset-4"
          data-tv-no-signal-source={sourceId}
          href={source[1]}
          key={sourceId}
          rel="noreferrer"
          target="_blank"
        >
          {source[0]}
        </a>
      ))}
    </p>
  );
}

export function TvNoSignalReference() {
  return (
    <section
      className="border-b-2 border-ink py-8"
      data-tv-no-signal-answer="true"
      data-tv-no-signal-reference="true"
    >
      <div className="flex items-start gap-4">
        <Info aria-hidden="true" className="mt-1 size-8 shrink-0 text-technical" />
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-technical">
            Как читать сообщение
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold">
            «Нет сигнала» не называет сломанную деталь
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            Сначала проверьте, кто вывел надпись: сам телевизор или внешняя приставка.
            Затем меняйте только одно условие за раз.
          </p>
        </div>
      </div>

      <div className="mt-6 border-y border-line">
        <ReferenceDetail
          icon={TelevisionSimple}
          sourceIds={[]}
          summary="Телевизор показывает своё меню — переходите к источнику"
        >
          Собственное меню поверх сообщения позволяет продолжить проверку выбранного
          входа или внешнего устройства. Это ещё не диагноз кабеля или телевизора.
        </ReferenceDetail>
        <ReferenceDetail
          icon={PlugsConnected}
          sourceIds={["samsung-hdmi", "sony-hdmi"]}
          summary="HDMI проверяют по одному изменению"
        >
          Сверьте номер входа, питание устройства и прямое соединение. Только затем
          пробуйте другой порт, кабель или источник.
        </ReferenceDetail>
        <ReferenceDetail
          icon={Broadcast}
          sourceIds={["rtrs-dtv", "samsung-channel-setup"]}
          summary="Эфирная антенна — это отдельная ветка"
        >
          Для эфирного цифрового ТВ нужны подключённая антенна, источник TV или DTV и
          поиск каналов. Настройки оператора сюда не переносятся.
        </ReferenceDetail>
        <ReferenceDetail
          icon={WarningCircle}
          sourceIds={[]}
          summary="Спутниковую антенну не регулируют на крыше самостоятельно"
        >
          Безопасно проверить питание приёмника, доступный кабель, погоду и видимые
          препятствия. Фирменные шаги уточняйте у своего оператора, а недоступную
          антенну должен проверять специалист.
        </ReferenceDetail>
      </div>
    </section>
  );
}

function ReferenceDetail({ children, icon: Icon, sourceIds, summary }) {
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-4 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
        <Icon aria-hidden="true" className="size-6 shrink-0 text-action" />
        <span className="min-w-0 flex-1">{summary}</span>
        <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="pb-5 pl-9">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{children}</p>
        <SourceLinks sourceIds={sourceIds} />
      </div>
    </details>
  );
}
