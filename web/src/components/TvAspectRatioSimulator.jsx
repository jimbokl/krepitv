import { useEffect, useId, useRef, useState } from "react";
import { calculateAspectRatioPlan } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const formats = [
  ["4:3", "Старый канал или видео — 4:3"],
  ["16:9", "Обычный широкий кадр — 16:9"],
  ["2.39:1", "Широкий фильм — пример 2,39:1"],
  ["9:16", "Вертикальное видео — 9:16"],
];
const modes = {
  fit: { title: "Без искажений", detail: "Весь кадр виден, круг остаётся кругом. Полосы могут быть нормой." },
  crop: { title: "Обрезать края", detail: "Кадр заполняет экран, но часть изображения выходит за его границы." },
  stretch: { title: "Растянуть", detail: "Экран заполнен, но при несовпадении форматов круг станет овалом." },
};

export function normalizeAspectRatioPlan(plan) {
  const invalid = () => { throw new Error("Локальный расчёт формата не прошёл проверку"); };
  if (!plan || !formats.some(([format]) => format === plan.format)
    || plan.screen_width !== 320 || plan.screen_height !== 180
    || plan.source_height !== 180 || !Number.isFinite(plan.source_width) || plan.source_width <= 0
    || !Array.isArray(plan.views) || plan.views.length !== 3) invalid();
  for (const [index, view] of plan.views.entries()) {
    if (view.mode !== ["fit", "crop", "stretch"][index]
      || typeof view.distorted !== "boolean"
      || ![view.x, view.y, view.width, view.height, view.bars_percent, view.cropped_percent].every(Number.isFinite)
      || view.width <= 0 || view.width > 600 || view.height <= 0 || view.height > 600
      || view.bars_percent < 0 || view.bars_percent >= 100
      || view.cropped_percent < 0 || view.cropped_percent >= 100
      || Math.abs(view.x + view.width / 2 - 160) > 0.01
      || Math.abs(view.y + view.height / 2 - 90) > 0.01) invalid();
  }
  return plan;
}

function FramePreview({ plan, view }) {
  const id = useId().replaceAll(":", "");
  const radius = Math.min(plan.source_width, plan.source_height) / 4;
  return <svg className="block w-full border-2 border-ink bg-ink" viewBox="0 0 320 180" role="img" aria-label={`${modes[view.mode].title}: схема кадра ${plan.format} на экране 16:9`} data-aspect-preview={view.mode}>
    <defs><clipPath id={`frame-${id}`}><rect width="320" height="180" /></clipPath></defs>
    <g clipPath={`url(#frame-${id})`}>
      <svg x={view.x} y={view.y} width={view.width} height={view.height} viewBox={`0 0 ${plan.source_width} ${plan.source_height}`} preserveAspectRatio="none">
        <rect width={plan.source_width} height={plan.source_height} className="fill-paper" />
        <path d={`M0 45H${plan.source_width}M0 90H${plan.source_width}M0 135H${plan.source_width}`} className="stroke-line" fill="none" strokeWidth="2" />
        <path d={`M${plan.source_width / 4} 0V180M${plan.source_width * 3 / 4} 0V180`} className="stroke-line" fill="none" strokeWidth="2" />
        <rect x="5" y="5" width={plan.source_width - 10} height="170" className="stroke-technical" fill="none" strokeWidth="3" />
        <circle cx={plan.source_width / 2} cy="90" r={radius} className="fill-action stroke-ink" strokeWidth="3" />
        <path d={`M${plan.source_width / 2 - radius} 90h${radius * 2}M${plan.source_width / 2} ${90 - radius}v${radius * 2}`} className="stroke-ink" fill="none" strokeWidth="2" />
      </svg>
    </g>
  </svg>;
}

const percent = (value) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);

export function TvAspectRatioSimulator() {
  const [format, setFormat] = useState("");
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState("idle");
  const generation = useRef(0);
  const resultRef = useRef(null);
  const selectId = useId();
  useEffect(() => { if (plan) resultRef.current?.focus(); }, [plan]);
  useEffect(() => () => { generation.current += 1; }, []);

  function changeFormat(value) {
    generation.current += 1;
    setFormat(value);
    setPlan(null);
    setState("idle");
  }

  async function calculate(event) {
    event.preventDefault();
    if (!format || state === "loading") return;
    const request = ++generation.current;
    setState("loading");
    setPlan(null);
    try {
      const next = normalizeAspectRatioPlan(await calculateAspectRatioPlan(format));
      if (next.format !== format) throw new Error("Ответ расчёта не соответствует выбранному формату");
      if (request !== generation.current) return;
      setPlan(next);
      setState("success");
      emitResultCompleted(window, { toolId: "tv_aspect_ratio", resultType: "format_comparison_shown" });
    } catch {
      if (request === generation.current) setState("error");
    }
  }

  return <section className="mt-7 border-2 border-ink bg-white p-5 sm:p-7" data-aspect-simulator="true" aria-labelledby="aspect-simulator-title">
    <h3 className="font-display text-2xl font-extrabold sm:text-3xl" id="aspect-simulator-title">Убрать полосы — что станет с картинкой?</h3>
    <p className="mt-3 max-w-3xl leading-relaxed text-muted">Сравните три варианта на одном рисунке. Это пример для экрана 16:9, а не настройка вашего телевизора: названия режимов зависят от модели.</p>
    <form className="mt-6 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={calculate} data-analytics-tool="tv_aspect_ratio" data-analytics-events="change submit">
      <label className="grid min-w-0 gap-2 font-semibold" htmlFor={selectId}>Какой кадр вы смотрите?
        <select className="min-h-12 w-full min-w-0 rounded-md border-2 border-ink bg-paper px-3 text-base font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-action" id={selectId} value={format} onChange={(event) => changeFormat(event.target.value)}>
          <option value="">Выберите формат для примера</option>
          {formats.map(([value, title]) => <option value={value} key={value}>{title}</option>)}
        </select>
      </label>
      <button className="primary-button min-h-12 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!format || state === "loading"}>{state === "loading" ? "Считаем…" : state === "error" ? "Повторить" : "Показать разницу"}</button>
    </form>
    <p className="mt-3 text-sm leading-relaxed text-muted">Формат не знаете? Начните с исходного режима и сравните другой ролик. Полосы в меню или на тестовом изображении не объясняются форматом фильма.</p>
    <details className="mt-5 border-t border-line pt-4" data-aspect-static-example="true">
      <summary className="cursor-pointer font-semibold">Пример без расчёта: старый кадр 4:3 на экране 16:9</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Что меняется при трёх способах заполнения экрана</caption>
          <thead><tr><th className="p-3" scope="col">Способ</th><th className="p-3" scope="col">Что видно</th><th className="p-3" scope="col">Что теряется</th></tr></thead>
          <tbody>
            <tr className="border-t border-line"><th className="p-3" scope="row">Без искажений</th><td className="p-3">Весь кадр и полосы по бокам</td><td className="p-3">Ничего: исходные пропорции сохранены</td></tr>
            <tr className="border-t border-line"><th className="p-3" scope="row">Обрезать края</th><td className="p-3">Экран заполнен, пропорции сохранены</td><td className="p-3">Верхняя и нижняя часть кадра</td></tr>
            <tr className="border-t border-line"><th className="p-3" scope="row">Растянуть</th><td className="p-3">Экран заполнен, круг стал овалом</td><td className="p-3">Правильные пропорции изображения</td></tr>
          </tbody>
        </table>
      </div>
    </details>
    <div aria-live="polite" aria-busy={state === "loading"}>
      {state === "loading" ? <p className="mt-5 font-semibold" role="status">Загружаем локальный модуль расчёта…</p> : null}
      {state === "error" ? <p className="mt-5 border-l-2 border-action pl-4 leading-relaxed" role="alert">Не удалось получить расчёт. Нажмите «Повторить». Пока можно пользоваться таблицей решений ниже — она доступна без модуля.</p> : null}
      {plan ? <div className="mt-7" data-aspect-result="true">
        <h4 className="font-display text-xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-action" tabIndex={-1} ref={resultRef}>Кадр {plan.format.replace("2.39", "2,39")} на экране 16:9</h4>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {plan.views.map((view) => <figure className="min-w-0" key={view.mode}>
            <FramePreview plan={plan} view={view} />
            <figcaption className="mt-3">
              <strong className="font-display text-xl">{modes[view.mode].title}</strong>
              <p className="mt-2 text-sm leading-relaxed text-muted">{plan.format === "16:9" ? "Форматы кадра и экрана совпадают: полос, обрезки и растяжения в этом примере нет." : modes[view.mode].detail}</p>
              <p className="mt-3 font-mono text-sm text-ink" data-aspect-metric={view.mode}>{view.mode === "fit" ? `Полосы: ${percent(view.bars_percent)}% площади экрана` : view.mode === "crop" ? `За экраном: ${percent(view.cropped_percent)}% исходного кадра` : view.distorted ? "Круг превратился в овал" : "Пропорции совпадают — искажения нет"}</p>
            </figcaption>
          </figure>)}
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <p className="max-w-3xl leading-relaxed">Чтобы сохранить весь кадр, ищите в инструкции исходный или автоматический формат. Если обрезаются значки и края рабочего стола по HDMI, проверьте отдельную настройку масштаба — это другая задача.</p>
          <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-technical underline underline-offset-4" href="/obrezany-kraya-ekrana-televizora-cherez-hdmi/">Проверить обрезанные края по HDMI →</a>
        </div>
      </div> : null}
    </div>
    <noscript><p className="mt-4">Для интерактивной схемы нужен JavaScript. Таблица решений и официальные источники доступны ниже без него.</p></noscript>
  </section>;
}
