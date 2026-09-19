import { useRef, useState } from "react";
import { calculateConnectionHelper } from "../lib/catalog.js";
import { CONNECTION_HELPERS, connectionToolId } from "../lib/connectionHelpers.mjs";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

export function ConnectionHelper({ pageId }) {
  const config = CONNECTION_HELPERS[pageId];
  const [values, setValues] = useState(["", "", ""]);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const busy = useRef(false);
  const toolId = connectionToolId(pageId);

  function update(index, value) {
    sequence.current += 1;
    busy.current = false;
    setValues((previous) => previous.map((item, i) => i === index ? value : item));
    setResult(null);
    setError("");
    setStatus("idle");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy.current || !values.every(Boolean)) return;
    const request = ++sequence.current;
    busy.current = true;
    setStatus("loading");
    setResult(null);
    setError("");
    try {
      const plan = await calculateConnectionHelper(pageId, values);
      if (request !== sequence.current) return;
      setResult(plan);
      setStatus("success");
      emitResultCompleted(window, { toolId, resultType: plan.status });
    } catch {
      if (request !== sequence.current) return;
      setError("Не удалось загрузить помощник. Попробуйте ещё раз; таблица решений ниже доступна без расчёта.");
      setStatus("error");
    } finally {
      if (request === sequence.current) busy.current = false;
    }
  }

  return (
    <form className="mt-7 min-w-0 border-2 border-ink bg-white p-4 sm:p-6" onSubmit={submit} data-connection-helper={pageId} data-analytics-tool={toolId} data-state={status}>
      <fieldset className="min-w-0">
        <legend className="font-display text-2xl font-extrabold">{config.title}</legend>
        <p className="mt-2 text-sm leading-relaxed text-muted">Три ответа — и порядок действий. Без регистрации, ввода паролей и отправки ответов на сервер.</p>
        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-3">
          {config.fields.map(([label, options], index) => (
            <label className="grid min-w-0 content-start gap-2 text-sm font-medium" key={label}>
              {label}
              <select className="input-control w-full min-w-0" name={`step-${index}`} value={values[index]} onChange={(event) => update(index, event.target.value)} required>
                <option value="">Выберите вариант</option>
                {options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
              </select>
            </label>
          ))}
        </div>
        <button className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" disabled={!values.every(Boolean) || status === "loading"} type="submit">
          {status === "loading" ? "Составляем план…" : "Составить план"}
        </button>
      </fieldset>
      <div className="mt-5 border-t border-line pt-5" aria-live="polite" aria-atomic="true" aria-busy={status === "loading"} data-connection-result="true">
        {error ? <p role="alert" className="text-danger">{error}</p> : result ? (
          <>
            <p className="font-mono text-xs uppercase text-action">{result.status === "ready" ? "Порядок действий" : "Нужна проверка условий"}</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold">{result.title}</h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 leading-relaxed">{result.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p className="mt-4 border-l-2 border-action pl-4 text-sm leading-relaxed text-muted">{result.caution}</p>
            <a className="mt-5 inline-block font-display font-bold underline decoration-action underline-offset-4" href={result.next_href}>{result.next_label} →</a>
          </>
        ) : <p className="text-sm text-muted">{status === "loading" ? "Загружаем локальный модуль расчёта…" : "Заполните три поля. Если чего-то не знаете, выберите соответствующий вариант — помощник подскажет, что проверить."}</p>}
      </div>
    </form>
  );
}
