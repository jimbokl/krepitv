import { useRef, useState } from "react";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { INTENT_TOOLS } from "../lib/intentTools.mjs";

export function IntentDecisionTool({ guide, pageId }) {
  const config = INTENT_TOOLS[pageId];
  const [stepIndex, setStepIndex] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const completedChoices = useRef(new Set());
  if (!config || !guide) return null;

  const toolId = `intent_${pageId.replaceAll("-", "_")}`;
  const step = stepIndex === null ? null : guide.steps[stepIndex];

  function chooseStep(index) {
    setStepIndex(index);
    setOutcome(null);
  }

  function complete(value) {
    if (!step) return;
    setOutcome(value);
    const choiceKey = `${stepIndex}:${value}`;
    if (!completedChoices.current.has(choiceKey)) {
      completedChoices.current.add(choiceKey);
      emitResultCompleted(window, { toolId, resultType: "checked" });
    }
  }

  return (
    <section
      aria-labelledby={`${pageId}-decision-title`}
      className="mt-7 border-2 border-ink bg-white p-5 sm:p-7"
      data-analytics-tool={toolId}
      data-evidence-guide-tool="true"
      data-intent-tool={pageId}
      id="instrument"
    >
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Интерактивная проверка</p>
      <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl" id={`${pageId}-decision-title`}>
        {config.title}
      </h3>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Выберите наблюдение, выполните безопасный шаг и отметьте результат. Выбранные ответы не передаются — мы учитываем только факт использования инструмента.
      </p>

      <fieldset className="mt-7">
        <legend className="font-display text-xl font-bold">1. Что происходит?</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {guide.steps.map((item, index) => (
            <button
              aria-pressed={stepIndex === index}
              className={`min-h-14 border-2 px-4 py-3 text-left font-display font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                stepIndex === index ? "border-action bg-action text-white" : "border-ink bg-paper hover:bg-white"
              }`}
              key={item.label}
              onClick={() => chooseStep(index)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      {step ? (
        <div className="mt-6 border-l-2 border-action pl-5" data-intent-step="true">
          <p className="font-mono text-xs uppercase text-action">Безопасный первый шаг</p>
          <h4 className="mt-2 font-display text-xl font-bold">{step.title}</h4>
          <p className="mt-2 max-w-3xl leading-relaxed text-muted">{step.body}</p>
        </div>
      ) : null}

      {step ? (
        <fieldset className="mt-7 border-t border-line pt-6">
          <legend className="font-display text-xl font-bold">2. {config.question}</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              aria-pressed={outcome === "yes"}
              className={`min-h-12 border-2 px-5 py-2 font-display font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                outcome === "yes" ? "border-action bg-action text-white" : "border-ink bg-paper hover:bg-white"
              }`}
              onClick={() => complete("yes")}
              type="button"
            >
              Да
            </button>
            <button
              aria-pressed={outcome === "no"}
              className={`min-h-12 border-2 px-5 py-2 font-display font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                outcome === "no" ? "border-action bg-action text-white" : "border-ink bg-paper hover:bg-white"
              }`}
              onClick={() => complete("no")}
              type="button"
            >
              Нет или не удалось проверить
            </button>
          </div>
        </fieldset>
      ) : null}

      <div aria-live="polite" className="mt-6 border-t-2 border-ink pt-5" data-intent-result="true">
        {outcome ? (
          <>
            <p className="font-mono text-xs uppercase text-action">Итог проверки</p>
            <p className="mt-2 max-w-3xl font-display text-xl font-semibold leading-snug">
              {outcome === "yes" ? config.success : config.failure}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">Границы и ссылки на официальные инструкции — ниже на этой странице.</p>
          </>
        ) : (
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            Сначала выберите ситуацию. Итог появится только после проверки — мы не выдаём неподтверждённое решение заранее.
          </p>
        )}
      </div>
    </section>
  );
}
