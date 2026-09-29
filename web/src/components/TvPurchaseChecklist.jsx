import { useState } from "react";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const checks = [
  { id: "model", title: "Точная модель", hint: "Сверьте полный код на коробке, шильдике и в заказе. Серийный номер никому не отправляйте." },
  { id: "body", title: "Корпус и комплект", hint: "Осмотрите рамку, экран, ножки, пульт, кабель и заявленные аксессуары до установки." },
  { id: "image", title: "Изображение", hint: "Откройте обычное видео и встроенный тест изображения. Не нажимайте на матрицу." },
  { id: "sound", title: "Звук и пульт", hint: "Проверьте динамики, регулировку громкости и реакцию на основные кнопки." },
  { id: "inputs", title: "Сеть и входы", hint: "По возможности проверьте Wi‑Fi и один доступный вход HDMI или USB." },
  { id: "evidence", title: "Документы и замечания", hint: "Сохраните документы о покупке; обнаруженный недостаток снимите общим и крупным планом." },
];

const choices = [
  { id: "ok", label: "Проверено" },
  { id: "issue", label: "Есть замечание" },
  { id: "unknown", label: "Не удалось проверить" },
];

export function TvPurchaseChecklist() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const answered = checks.filter((check) => answers[check.id]).length;
  const issueCount = checks.filter((check) => answers[check.id] === "issue").length;
  const unknownCount = checks.filter((check) => answers[check.id] === "unknown").length;
  const ready = answered === checks.length;

  function select(id, value) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSubmitted(false);
    setCopyStatus("");
  }

  function showResult() {
    if (!ready) return;
    setSubmitted(true);
    emitResultCompleted(window, {
      toolId: "tv_purchase_checklist",
      resultType: issueCount > 0 ? "issue_recorded" : unknownCount > 0 ? "check_incomplete" : "no_issue_reported",
    });
  }

  async function copyResult() {
    const summary = issueCount > 0
      ? `Проверка телевизора: замечания в ${issueCount} из ${checks.length} пунктов. Зафиксируйте их и свяжитесь с продавцом.`
      : unknownCount > 0
        ? `Проверка телевизора: ${unknownCount} из ${checks.length} пунктов не удалось проверить. Проверка не завершена.`
        : `Проверка телевизора: по отметкам замечаний нет. Сохраните документы и проверьте телевизор в обычном использовании.`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("Итог скопирован. Можно сохранить его в заметках.");
    } catch {
      setCopyStatus("Не удалось скопировать автоматически. Выделите текст итога и скопируйте вручную.");
    }
  }

  return (
    <section
      aria-labelledby="purchase-checklist-title"
      className="my-8 border-2 border-ink bg-white p-5 sm:p-7"
      data-analytics-tool="tv_purchase_checklist"
      data-purchase-checklist="true"
      id="чек-лист-приёмки"
    >
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Приёмка без регистрации</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold" id="purchase-checklist-title">Проверьте телевизор по шагам</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Отметьте каждый пункт на месте. Ответы остаются в этом окне браузера; мы учитываем только факт получения итога, без ваших отметок и серийного номера.
      </p>
      <ol className="mt-6 grid gap-4 lg:grid-cols-2">
        {checks.map((check, index) => (
          <li className="border border-line bg-paper p-4" key={check.id}>
            <h3 className="font-display text-lg font-bold"><span className="mr-2 text-action">{index + 1}.</span>{check.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{check.hint}</p>
            <fieldset className="mt-4">
              <legend className="sr-only">Результат: {check.title}</legend>
              <div className="flex flex-wrap gap-2">
                {choices.map((choice) => (
                  <button
                    aria-pressed={answers[check.id] === choice.id}
                    className={`cursor-pointer border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-action ${answers[check.id] === choice.id ? "border-action bg-action text-white" : "border-line bg-white"}`}
                    key={choice.id}
                    onClick={() => select(check.id, choice.id)}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button className="primary-button min-h-12 disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready} onClick={showResult} type="button">Показать итог проверки</button>
        <span className="text-sm text-muted" role="status">Отмечено {answered} из {checks.length}</span>
      </div>
      {submitted ? (
        <div aria-live="polite" className="mt-6 border-l-4 border-action bg-paper p-5" data-purchase-result="true">
          <h3 className="font-display text-2xl font-bold">Ваш итог</h3>
          {issueCount > 0 ? (
            <p className="mt-2 leading-relaxed">Замечания есть в {issueCount} {issueCount === 1 ? "пункте" : "пунктах"}. До завершения приёмки зафиксируйте их на фото и свяжитесь с продавцом.</p>
          ) : unknownCount > 0 ? (
            <p className="mt-2 leading-relaxed">Замечаний не отмечено, но {unknownCount} {unknownCount === 1 ? "пункт" : "пунктов"} проверить не удалось. Не называйте приёмку полной; вернитесь к ним при первой возможности.</p>
          ) : (
            <p className="mt-2 leading-relaxed">По вашим отметкам замечаний нет. Это не гарантия исправности: сохраните документы и проверьте телевизор в обычном использовании.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <button className="text-action underline underline-offset-4" onClick={copyResult} type="button">Скопировать итог</button>
            <a className="text-action underline underline-offset-4" href="/proverka-televizora-na-bitye-pikseli/">Проверить экран подробнее</a>
            <a className="text-action underline underline-offset-4" href="/modeli/">Найти модель и крепление</a>
          </div>
          {copyStatus ? <p className="mt-3 text-sm text-muted" role="status">{copyStatus}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
