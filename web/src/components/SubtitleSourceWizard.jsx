import { useEffect, useRef, useState } from "react";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import {
  SUBTITLE_ACCESS,
  SUBTITLE_SOURCES,
  SUBTITLE_TESTS,
  subtitleRoute,
  validSubtitleState,
} from "../lib/subtitleSourceWizard.mjs";

const STORAGE_KEY = "krepitv:subtitle-route:v1";

function initialState() {
  if (typeof window === "undefined") return validSubtitleState(null);
  try {
    return validSubtitleState(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)));
  } catch {
    return validSubtitleState(null);
  }
}

function ChoiceGroup({ legend, options, onChoose, selected }) {
  return (
    <fieldset className="mt-6 border-t border-line pt-5">
      <legend className="px-1 font-display text-xl font-bold">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((item) => (
          <button
            aria-pressed={selected === item.id}
            className={`min-h-12 border-2 px-4 py-3 text-left font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${selected === item.id ? "border-action bg-action text-white" : "border-ink bg-paper hover:bg-white"}`}
            key={item.id}
            onClick={() => onChoose(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SubtitleSourceWizard() {
  const [answers, setAnswers] = useState(initialState);
  const [feedback, setFeedback] = useState("");
  const emitted = useRef(false);
  const result = subtitleRoute(answers);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // The wizard still works when private browsing blocks storage.
    }
  }, [answers]);

  function chooseSource(source) {
    setAnswers({ source, observation: "", access: "" });
    setFeedback("");
  }

  function chooseObservation(observation) {
    setAnswers((current) => ({ ...current, observation, access: "" }));
    setFeedback("");
  }

  function chooseAccess(access) {
    const next = { ...answers, access };
    setAnswers(next);
    setFeedback("");
    const completed = subtitleRoute(next);
    if (completed && !emitted.current) {
      // Only a controlled route label is measured; individual answers stay in this tab.
      emitResultCompleted(window, {
        toolId: "subtitle_source_wizard",
        resultType: `subtitle_${completed.id}`,
      });
      emitted.current = true;
    }
  }

  function startOver() {
    setAnswers(validSubtitleState(null));
    setFeedback("");
  }

  return (
    <section
      aria-labelledby="subtitle-wizard-title"
      className="mt-7 border-2 border-ink bg-white p-5 sm:p-7"
      data-analytics-tool="subtitle_source_wizard"
      data-evidence-guide-tool="true"
      data-subtitle-wizard="true"
      id="instrument"
    >
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Проверка источника · 3 шага</p>
      <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl" id="subtitle-wizard-title">
        Кто показывает субтитры?
      </h3>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Сравните источники изображения и получите безопасный следующий шаг. Мастер не меняет настройки телевизора. Выбранные наблюдения остаются в этой вкладке; аналитика учитывает только тип готового маршрута.
      </p>

      <ChoiceGroup
        legend="1. Где вы видите текст?"
        onChoose={chooseSource}
        options={SUBTITLE_SOURCES}
        selected={answers.source}
      />
      {answers.source ? (
        <ChoiceGroup
          legend="2. Что показала простая проверка?"
          onChoose={chooseObservation}
          options={SUBTITLE_TESTS[answers.source]}
          selected={answers.observation}
        />
      ) : null}
      {answers.observation ? (
        <ChoiceGroup
          legend="3. Нужны ли субтитры другому зрителю?"
          onChoose={chooseAccess}
          options={SUBTITLE_ACCESS}
          selected={answers.access}
        />
      ) : null}

      <div aria-live="polite" className="mt-7 border-t-2 border-ink pt-5" data-subtitle-result="true">
        {result ? (
          <div className="border-l-2 border-action pl-5">
            <p className="font-mono text-xs uppercase text-action">Ваш маршрут · без сброса настроек</p>
            <h4 className="mt-2 font-display text-2xl font-bold">{result.title}</h4>
            <p className="mt-3 max-w-3xl leading-relaxed"><strong>Что сделать:</strong> {result.action}</p>
            <p className="mt-3 max-w-3xl leading-relaxed"><strong>Как проверить:</strong> {result.check}</p>
            <p className="mt-3 max-w-3xl border-l-2 border-technical pl-3 text-sm leading-relaxed">{result.accessibility}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Ниже — таблица без интерактива и прямые ссылки на инструкции производителей. Если меню отличается, ищите руководство по полному коду модели.
            </p>
            <div className="mt-5 flex flex-wrap gap-3" aria-label="Необязательная отметка результата">
              <button className="min-h-12 border-2 border-ink px-4 font-semibold focus-visible:ring-2 focus-visible:ring-action" onClick={() => setFeedback("yes")} type="button">Помогло</button>
              <button className="min-h-12 border-2 border-ink px-4 font-semibold focus-visible:ring-2 focus-visible:ring-action" onClick={() => setFeedback("no")} type="button">Пока нет</button>
            </div>
            {feedback ? (
              <p className="mt-3 text-sm text-muted" data-subtitle-feedback="true">
                {feedback === "yes" ? "Рады, что маршрут помог. Отметка остаётся только в этой вкладке." : "Если проверка не помогла, не угадывайте: сравните другой источник и откройте официальную инструкцию вашей модели. Отметка остаётся только в этой вкладке."}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">Ответ появится после трёх наблюдений. Если проверить источник невозможно, выберите «Не могу» — мастер не станет угадывать.</p>
        )}
      </div>
      <button className="mt-6 text-sm font-semibold text-technical underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-action" onClick={startOver} type="button">Начать проверку заново</button>
    </section>
  );
}
