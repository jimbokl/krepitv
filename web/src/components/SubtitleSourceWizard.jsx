import { useEffect, useRef, useState } from "react";
import { calculateSubtitleHelpPlan } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { emitSubtitleInteraction } from "../lib/subtitleInteraction.mjs";
import { APPEARANCES, NO_TEXT, OBSERVATIONS, REASONS, SOURCES, SUBTITLE_HELP, cleanSubtitleAnswers, readSubtitlePlan, subtitleHelpText } from "../lib/subtitleHelp.mjs";

const STORAGE_KEY = "krepitv:subtitle-route:v2";
const button = "min-h-12 rounded-lg border-2 px-[12px] py-3 text-left font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2";

export function SubtitlePlatformReference() {
  return <details className="my-7 rounded-xl border border-line bg-white p-4" data-subtitle-platform-reference="true"><summary className="cursor-pointer font-display text-lg font-bold">Где субтитры в меню Samsung, LG и Google TV</summary><p className="mt-3 text-sm leading-relaxed text-muted">Для встроенного тюнера или поддерживаемого системного меню. Приложения и приставки настраиваются отдельно. Сверьте модель и версию системы; если путь не совпал, не меняйте соседние функции.</p><div className="mt-4 overflow-x-auto" role="region" aria-label="Пути меню субтитров" tabIndex={0}><table className="w-full min-w-[600px] text-sm"><thead><tr className="bg-ink text-white"><th scope="col" className="p-3 text-left">Система</th><th scope="col" className="p-3 text-left">Где искать</th><th scope="col" className="p-3 text-left">Граница проверки</th></tr></thead><tbody>{SUBTITLE_HELP.platforms.map(item => <tr key={item.id} className="border-b border-line align-top"><th scope="row" className="p-3 text-left font-semibold">{item.label}</th><td className="p-3 leading-relaxed">{item.path}</td><td className="p-3 leading-relaxed">{item.scope} <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-technical underline">Источник: {item.source}</a></td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-muted">Сверено с официальными справками {SUBTITLE_HELP.checked_at}. Год покупки не всегда равен году модели.</p></details>;
}

export function SubtitleHelpSection({ pageId }) {
  return <>{pageId === "tv-disable-subtitles" ? <SubtitlePlatformReference /> : null}<SubtitleSourceWizard key={pageId} pageId={pageId} /></>;
}

function initialState(pageId) {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    if (saved?.pageId === pageId) return cleanSubtitleAnswers(saved);
  } catch { /* Storage is optional. */ }
  return cleanSubtitleAnswers({ source: pageId === "youtube-tv-subtitles" ? "youtube" : pageId === "tv-usb-video-subtitles" ? "usb" : "" });
}

function TextPreview({ kind }) {
  return <svg aria-hidden="true" className="mb-3 h-auto w-full max-w-44" viewBox="0 0 180 100" fill="none">
    <rect x="2" y="2" width="176" height="96" rx="9" fill="#212927" />
    <path d="M3 67L43 31 82 60 120 22 177 63V96H3Z" fill="#435a4d" />
    {kind === "dialogue" ? <><rect x="22" y="70" width="136" height="18" rx="3" fill="#111" /><text x="90" y="82" textAnchor="middle" fill="white" fontSize="10">Давай посмотрим фильм.</text></> : kind === "teletext" ? <><rect x="12" y="12" width="156" height="76" rx="3" fill="#10284c" /><text x="23" y="30" fill="#ffe478" fontSize="11">100 · ТЕЛЕТЕКСТ</text><path d="M23 43H152M23 54H130M23 65H145M23 76H110" stroke="white" strokeWidth="3" /></> : kind === "notice" ? <><rect x="12" y="66" width="156" height="24" rx="3" fill="#111" /><text x="90" y="76" textAnchor="middle" fill="white" fontSize="8">Скрытое субтитрирование</text><text x="90" y="86" textAnchor="middle" fill="#ffe478" fontSize="9">888</text></> : <text x="90" y="64" textAnchor="middle" fill="white" fontSize="39">?</text>}
  </svg>;
}

function Choices({ legend, options, value, onChange, visual = false, name }) {
  return <fieldset className="mt-7 min-w-0 border-t border-line pt-5" data-subtitle-step={name}>
    <legend className="pr-3 font-display text-xl font-extrabold">{legend}</legend>
    <div className={`mt-3 grid gap-3 ${visual ? "grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
      {options.map(item => <button key={item.id} type="button" data-subtitle-choice={item.id} aria-pressed={value === item.id} onClick={() => onChange(item.id)} className={`${button} ${value === item.id ? "border-action bg-orange-50 text-ink" : "border-line bg-white text-ink hover:border-ink"}`}>
        {visual ? <TextPreview kind={item.id} /> : null}<span className="block">{item.label}</span>{item.hint ? <span className="mt-1 block text-xs font-normal leading-relaxed text-muted">{item.hint}</span> : null}
      </button>)}
    </div>
  </fieldset>;
}

export function SubtitleSourceWizard({ pageId = "tv-disable-subtitles" }) {
  const [answers, setAnswers] = useState(() => initialState(pageId));
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [copyState, setCopyState] = useState("");
  const [manualText, setManualText] = useState("");
  const attempt = useRef(1);
  const request = useRef(0);
  const resultRef = useRef(null);
  const busy = useRef(false);
  const platform = SUBTITLE_HELP.platforms.find(item => item.id === platformId);
  const complete = answers.appearance && answers.source && answers.observation;

  useEffect(() => {
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...answers, pageId })); } catch { /* The tool works without persistence. */ }
  }, [answers, pageId]);
  useEffect(() => () => { request.current += 1; }, []);
  useEffect(() => {
    if (plan && status === "ready") resultRef.current?.focus({ preventScroll: true });
  }, [plan, status]);

  function measure(action, step = "result", route = plan?.id ?? "none", failureReason = "none") {
    emitSubtitleInteraction(window, { action, step, route, reason: failureReason, attempt: attempt.current });
  }
  function change(field, value) {
    request.current += 1;
    busy.current = false;
    if (plan || status === "error" || status === "loading") attempt.current = Math.min(1000, attempt.current + 1);
    setAnswers(current => cleanSubtitleAnswers({ ...current, [field]: value, ...(field === "source" ? { observation: "" } : {}) }));
    setPlan(null); setStatus("idle"); setFeedback(""); setReason(""); setCopyState(""); setManualText(""); setPlatformId("");
    measure("step", field === "goal" ? "appearance" : field, "none");
  }
  async function calculate() {
    if (!complete || busy.current) return;
    if (status === "error") measure("retry", "result", "none");
    busy.current = true;
    const version = ++request.current;
    setStatus("loading"); setPlan(null);
    try {
      const result = readSubtitlePlan(await calculateSubtitleHelpPlan(answers));
      if (version !== request.current) return;
      setPlan(result); setStatus("ready");
      measure("ready", "result", result.id);
      emitResultCompleted(window, { toolId: "subtitle_source_wizard", resultType: `subtitle_${result.id}` });
    } catch {
      if (version !== request.current) return;
      setStatus("error"); measure("error", "result", "none");
    } finally { if (version === request.current) busy.current = false; }
  }
  async function copyPlan() {
    if (!plan) return;
    const text = subtitleHelpText(plan, platformId, pageId);
    const version = ++request.current;
    setCopyState("pending"); setManualText("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(text);
      if (version !== request.current) return;
      setCopyState("copied"); measure("copy");
    } catch {
      if (version !== request.current) return;
      setCopyState("manual"); setManualText(text);
    }
  }
  function respond(value) {
    setFeedback(value); setReason(""); measure(value);
  }
  function reset() {
    request.current += 1; busy.current = false; attempt.current = Math.min(1000, attempt.current + 1);
    setAnswers(cleanSubtitleAnswers()); setPlan(null); setStatus("idle"); setFeedback(""); setReason(""); setPlatformId(""); setCopyState(""); setManualText("");
  }

  return <section id="instrument" aria-labelledby="subtitle-wizard-title" className="mt-7 min-w-0 rounded-2xl border-2 border-ink bg-white p-[12px] sm:p-7" data-analytics-tool="subtitle_source_wizard" data-evidence-guide-tool="true" data-subtitle-wizard="true">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="font-mono text-xs uppercase tracking-wider text-action">Сначала узнаем текст, потом найдём кнопку</p><h3 id="subtitle-wizard-title" className="mt-2 font-display text-xl font-extrabold sm:text-3xl">{answers.goal === "enable" ? "Найдём, как включить субтитры" : "Уберём лишний текст с экрана"}</h3></div>
      <div className="flex max-w-full flex-wrap gap-1 rounded-lg border border-line p-1" role="group" aria-label="Что нужно сделать">
        {[{ id: "disable", label: "Убрать" }, { id: "enable", label: "Включить" }].map(item => <button type="button" className={`min-h-11 whitespace-nowrap rounded-md px-[10px] text-sm font-semibold focus-visible:ring-2 focus-visible:ring-action ${answers.goal === item.id ? "bg-ink text-white" : "text-ink"}`} aria-pressed={answers.goal === item.id} key={item.id} onClick={() => change("goal", item.id)}>{item.label}</button>)}
      </div>
    </div>
    <p className="mt-3 max-w-3xl leading-relaxed text-muted">Три короткие проверки. Без сброса, установки программ и загрузки файлов. Настройки телевизора вы меняете сами.</p>
    <Choices legend={answers.goal === "enable" ? "1. Какой текст вам нужен?" : "1. На что похож текст?"} name="appearance" options={APPEARANCES} value={answers.appearance} onChange={value => change("appearance", value)} visual />
    <p className="mt-2 text-xs text-muted">Условные примеры, не снимки меню конкретной модели.</p>
    {answers.appearance ? <Choices legend="2. Где он появляется?" name="source" options={SOURCES} value={answers.source} onChange={value => change("source", value)} /> : null}
    {answers.appearance && answers.source ? <><Choices legend="3. Что удалось проверить?" name="observation" options={answers.goal === "enable" ? [NO_TEXT, ...OBSERVATIONS[answers.source]] : OBSERVATIONS[answers.source]} value={answers.observation} onChange={value => change("observation", value)} /><p className="mt-3 text-sm leading-relaxed text-muted">Сравните тот же фрагмент и главный экран ТВ. Если проверить нельзя, выберите «Не уверен» — не будем угадывать.</p></> : null}
    <button type="button" data-subtitle-calculate="true" onClick={calculate} disabled={!complete || status === "loading"} className="mt-6 min-h-12 rounded-lg bg-action px-6 py-3 font-bold text-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{status === "loading" ? "Проверяем маршрут…" : status === "error" ? "Повторить проверку" : "Показать, что нажать"}</button>
    {status === "error" ? <p role="alert" className="mt-4 rounded-lg border border-action bg-orange-50 p-4 text-sm leading-relaxed">Не удалось загрузить локальный помощник. Повторите проверку или используйте инструкцию и таблицу ниже — они работают без помощника. Сброс телевизора не нужен.</p> : null}
    <div aria-live="polite" data-subtitle-result="true" ref={resultRef} tabIndex={-1} className="focus:outline-none">
      {plan ? <div className="mt-7 border-t-2 border-ink pt-6">
        <p className="font-mono text-xs uppercase tracking-wider text-action">Ваш следующий шаг · {answers.goal === "enable" ? "включить" : "убрать"}</p>
        <h4 className="mt-2 font-display text-2xl font-extrabold">{plan.title}</h4>
        <ol className="mt-5 space-y-5"><li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action font-bold text-white">1</span><p className="pt-1 leading-relaxed">{plan.action}</p></li><li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white">2</span><p className="pt-1 leading-relaxed"><strong>Проверьте результат. </strong>{plan.check}</p></li></ol>
        {plan.id === "broadcast" ? <div className="mt-6 rounded-xl bg-paper p-4"><label className="block font-bold" htmlFor="subtitle-platform">Знаете систему или год своего ТВ?</label><select id="subtitle-platform" className="mt-2 min-h-12 w-full max-w-full rounded-md border border-ink bg-white px-3 text-base" value={platformId} onChange={event => { setPlatformId(event.target.value); request.current += 1; setCopyState(""); setManualText(""); }}><option value="">Не знаю / другой телевизор</option>{SUBTITLE_HELP.platforms.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{platform ? <div className="mt-3"><p className="font-semibold leading-relaxed">{platform.path}</p><p className="mt-2 text-sm leading-relaxed text-muted">{platform.scope}</p><a className="mt-2 inline-block text-sm font-semibold text-technical underline" href={platform.url} target="_blank" rel="noopener noreferrer">Сверить с инструкцией {platform.source}</a></div> : <p className="mt-3 text-sm leading-relaxed text-muted">Не выбирайте систему по одному бренду: у TCL и Haier бывают разные платформы. <a className="font-semibold text-technical underline" href="/kak-uznat-model-televizora/">Найдите точную модель</a> и её руководство.</p>}</div> : null}
        <p className="mt-5 text-sm leading-relaxed text-muted">Если субтитры нужны другому зрителю, согласуйте изменение и запомните исходное состояние. Мастер не управляет телевизором.</p>
        <div className="mt-6 rounded-xl border border-line bg-paper p-4"><p className="font-bold">Удалось получить нужный результат?</p><div className="mt-3 flex flex-wrap gap-2">{[{ id: "helped", label: "Да, получилось" }, { id: "not_helped", label: "Пока нет" }].map(item => <button type="button" key={item.id} data-subtitle-feedback={item.id} aria-pressed={feedback === item.id} className={`${button} ${feedback === item.id ? "border-action bg-orange-50" : "border-line bg-white"}`} onClick={() => respond(item.id)}>{item.label}</button>)}</div>{feedback === "helped" ? <p role="status" className="mt-3 text-sm">Отлично. Если меняли настройку для проверки, оставьте нужный вам режим.</p> : feedback === "not_helped" ? <><Choices legend="Что остановило?" name="reason" options={REASONS} value={reason} onChange={value => { setReason(value); measure("reason", "result", plan.id, value); }} /><p className="mt-3 text-sm leading-relaxed">{reason === "menu_differs" || reason === "button_missing" ? "Не ищите похожую настройку наугад. Найдите инструкцию точной модели по ссылкам ниже." : reason === "text_remains" ? "Сравните другой источник и тот же фрагмент на другом устройстве. Измените ответ в проверке выше, если обнаружился новый признак." : "Проверьте источник ещё раз. Можно изменить ответы выше — сброс телевизора не нужен."}</p></> : null}<p className="mt-3 text-xs leading-relaxed text-muted">При включённой аналитике передаётся только выбранный этап и исход, без файлов и текста ввода.</p></div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={`${button} border-line`} data-subtitle-copy="true" disabled={copyState === "pending"} onClick={copyPlan}>Скопировать инструкцию</button><a href="#istochniki" className={`${button} inline-flex items-center border-line`} onClick={() => { const element = document.getElementById("istochniki"); if (element) element.open = true; }}>Официальные источники</a><button type="button" className="min-h-12 px-2 text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-action" onClick={reset}>Начать заново</button></div>
        <p className="mt-3 text-sm text-muted" aria-live="polite" data-subtitle-copy-status="true">{copyState === "copied" ? "Инструкция скопирована." : copyState === "manual" ? "Браузер запретил копирование. Выделите и скопируйте текст ниже." : "Сохраните инструкцию в заметках или отправьте тому, кто помогает с телевизором."}</p>
        {manualText ? <textarea readOnly aria-label="Инструкция для ручного копирования" data-subtitle-copy-fallback="true" className="mt-3 min-h-64 w-full rounded-lg border border-ink p-3 text-sm leading-relaxed" value={manualText} /> : null}
        <a className="mt-4 inline-flex min-h-12 items-center font-semibold text-technical underline underline-offset-4" href={plan.next === "teletext" ? "/kak-ubrat-teletext-i-skrytye-subtitry/" : plan.next === "youtube" ? "/kak-otklyuchit-subtitry-youtube-na-televizore/" : plan.next === "usb" ? "/kak-otklyuchit-subtitry-v-filme-s-fleshki/" : plan.next === "model" ? "/kak-uznat-model-televizora/" : "/kak-otklyuchit-subtitry-na-televizore/"}>{plan.next === "model" ? "Найти точную модель ТВ" : "Подробная инструкция для этого источника"} →</a>
      </div> : null}
    </div>
  </section>;
}
