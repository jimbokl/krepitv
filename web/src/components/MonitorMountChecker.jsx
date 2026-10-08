import { useEffect, useId, useRef, useState } from "react";
import { calculateMonitorMountPlan } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const titles = {
  parameters_match: "Проверенные параметры совпали",
  needs_data: "Пока рано выбирать: нужны уточнения",
  mismatch: "Есть несовпадение — проверьте его до покупки",
};
const states = { pass: "Совпало", fail: "Не подходит", unknown: "Уточнить" };
const number = (value) => value === "" ? null : Number(value);
const inputClass = "min-h-12 w-full min-w-0 rounded-md border border-ink bg-white px-3 text-base font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-action";

function Field({ label, help, children }) {
  return <label className="grid min-w-0 content-start gap-2 text-sm font-semibold">{label}{children}{help ? <span className="text-xs font-normal leading-relaxed text-muted">{help}</span> : null}</label>;
}

export function normalizeMonitorMountPlan(plan) {
  if (!plan || !Object.hasOwn(titles, plan.status) || ![1, 2].includes(plan.screen_count)
    || !Array.isArray(plan.checks) || plan.checks.length < 4 || plan.checks.length > 9
    || plan.checks.some((check) => !Object.hasOwn(states, check.state)
      || typeof check.id !== "string" || !/^(arms|vesa_[01]|weight_[01]|desk_thickness|desk_material|access|wall)$/.test(check.id)
      || typeof check.text !== "string" || check.text.length < 5)
    || new Set(plan.checks.map((check) => check.id)).size !== plan.checks.length) {
    throw new Error("Ответ локальной проверки не прошёл проверку");
  }
  if (plan.status !== "mismatch" && plan.checks.some((check) => check.state === "fail")) throw new Error("Противоречивый результат проверки");
  return plan;
}

export function MonitorMountChecker() {
  const [values, setValues] = useState({ count: "1", vesa0: "unknown", kg0: "", vesa1: "unknown", kg1: "", arms: "1", supported: "", max: "", mechanism: "", min: "", mounting: "clamp", desk: "", deskMin: "", deskMax: "", material: "unknown", access: "unknown" });
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState("idle");
  const generation = useRef(0);
  const resultRef = useRef(null);
  const id = useId();
  useEffect(() => { if (plan) resultRef.current?.focus(); }, [plan]);
  useEffect(() => () => { generation.current += 1; }, []);
  const change = (key, value) => {
    generation.current += 1;
    setValues((previous) => ({ ...previous, [key]: value }));
    setPlan(null); setState("idle");
  };
  const select = (key, options) => <select className={inputClass} value={values[key]} onChange={(event) => change(key, event.target.value)} data-monitor-field={key}>{options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>;
  const numeric = (key, maximum, placeholder) => <input className={inputClass} type="number" inputMode="decimal" min="0.1" max={maximum} step="0.1" placeholder={placeholder} value={values[key]} onChange={(event) => change(key, event.target.value)} data-monitor-field={key} />;
  async function calculate(event) {
    event.preventDefault();
    if (!values.mechanism || state === "loading") return;
    const request = ++generation.current;
    setState("loading"); setPlan(null);
    const screens = Array.from({ length: Number(values.count) }, (_, index) => ({ vesa: values[`vesa${index}`], kg: number(values[`kg${index}`]) }));
    try {
      const next = normalizeMonitorMountPlan(await calculateMonitorMountPlan({
        screens, arms: Number(values.arms), supported_vesa: values.supported ? values.supported.split(",") : [],
        max_kg_per_arm: number(values.max), gas_lift: values.mechanism === "gas", min_kg_per_arm: values.mechanism === "gas" ? number(values.min) : null,
        mounting: values.mounting, desk_mm: values.mounting === "wall" ? null : number(values.desk),
        desk_min_mm: values.mounting === "wall" ? null : number(values.deskMin), desk_max_mm: values.mounting === "wall" ? null : number(values.deskMax),
        desk_material: values.material, access: values.access,
      }));
      if (request !== generation.current) return;
      if (next.screen_count !== screens.length) throw new Error("Результат не соответствует числу экранов");
      setPlan(next); setState("success");
      emitResultCompleted(window, { toolId: "monitor_mount_match", resultType: next.status });
    } catch { if (request === generation.current) setState("error"); }
  }

  return <section className="mt-7 rounded-xl border-2 border-ink bg-paper p-5 sm:p-7" data-monitor-checker="true" aria-labelledby={`${id}-title`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-mono text-xs uppercase tracking-wider text-action">Без регистрации · расчёт в браузере</p><h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl" id={`${id}-title`}>Подойдёт ли выбранный кронштейн?</h3></div>
      <span className="rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold">Монитор → крепление → стол</span>
    </div>
    <p className="mt-3 max-w-3xl leading-relaxed text-muted">Откройте паспорта монитора и крепления. Введите известные значения; пустое поле означает «не знаю», а не разрешение на монтаж.</p>
    <form className="mt-6" onSubmit={calculate} data-analytics-tool="monitor_mount_match" data-analytics-events="change submit">
      <fieldset><legend className="font-display text-xl font-extrabold">1. Ваш монитор</legend>
        <div className="mt-4 max-w-xs"><Field label="Сколько экранов?">{select("count", [["1", "Один монитор"], ["2", "Два монитора"]])}</Field></div>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {Array.from({ length: Number(values.count) }, (_, index) => <div className="grid content-start gap-3" key={index}>
            {values.count === "2" ? <h4 className="font-semibold">Монитор {index + 1}</h4> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`VESA${values.count === "2" ? ` экрана ${index + 1}` : " монитора"}`} help="Расстояние между центрами отверстий, мм.">{select(`vesa${index}`, [["unknown", "Пока не знаю"], ["75", "75 × 75 мм"], ["100", "100 × 100 мм"], ["other", "Другой размер"], ["none", "Отверстий VESA нет"]])}</Field>
              <Field label={`Масса${values.count === "2" ? ` экрана ${index + 1}` : " без подставки"}, кг`} help="Из паспорта. Не масса коробки.">{numeric(`kg${index}`, 200, "Например, 5,2")}</Field>
            </div>
          </div>)}
        </div>
      </fieldset>
      <fieldset className="mt-7 border-t border-line pt-5"><legend className="font-display text-xl font-extrabold">2. Кронштейн, который вы смотрите</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Площадок под монитор">{select("arms", [["1", "Одна"], ["2", "Две"]])}</Field>
          <Field label="VESA крепления">{select("supported", [["", "Пока не знаю"], ["75,100", "75 × 75 и 100 × 100"], ["75", "Только 75 × 75"], ["100", "Только 100 × 100"]])}</Field>
          <Field label="Максимум на одно плечо, кг" help="Для двойного держателя не вводите общий максимум.">{numeric("max", 200, "По инструкции")}</Field>
          <Field label="Регулировка высоты">{select("mechanism", [["", "Выберите тип"], ["gas", "Газлифт / пружина"], ["fixed", "Без пружины"]])}</Field>
          {values.mechanism === "gas" ? <Field label="Минимум на одно плечо, кг" help="Нижняя граница из инструкции обязательна для проверки.">{numeric("min", 200, "По инструкции")}</Field> : null}
          <Field label="Способ установки">{select("mounting", [["clamp", "Струбцина за край"], ["grommet", "Через отверстие в столе"], ["wall", "На стену"]])}</Field>
        </div>
      </fieldset>
      {values.mounting !== "wall" ? <fieldset className="mt-7 border-t border-line pt-5"><legend className="font-display text-xl font-extrabold">3. Стол в месте крепления</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Толщина столешницы, мм">{numeric("desk", 500, "Измерьте край")}</Field>
          <Field label="Основание: минимум, мм">{numeric("deskMin", 500, "По инструкции")}</Field>
          <Field label="Основание: максимум, мм">{numeric("deskMax", 500, "По инструкции")}</Field>
          <Field label="Материал столешницы" help="Сплошная столешница тоже требует проверки прочности.">{select("material", [["unknown", "Пока не знаю"], ["solid", "Дерево, ДСП или МДФ"], ["glass", "Стекло"], ["hollow", "Пустотелая / сотовая"]])}</Field>
          <Field label="Есть место для основания и прижима?" help="Рама стола, кабельный лоток и стена могут мешать. Сверьте место с монтажной схемой.">{select("access", [["unknown", "Ещё не проверял"], ["yes", "Да, проверил по схеме"], ["no", "Нет, есть препятствие"]])}</Field>
        </div>
      </fieldset> : <p className="mt-5 border-l-2 border-action pl-4 text-sm leading-relaxed">Выбран настенный монтаж. Стол не проверяется; материал стены и анкеры нужно оценить отдельно.</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button className="primary-button min-h-12 disabled:cursor-not-allowed disabled:opacity-50" disabled={!values.mechanism || state === "loading"} type="submit">{state === "loading" ? "Проверяем…" : state === "error" ? "Повторить проверку" : "Проверить параметры"}</button>
        <p className="max-w-md text-xs leading-relaxed text-muted">Проверка не подбирает винты и не рассчитывает прочность стола или стены.</p>
      </div>
    </form>
    <div aria-live="polite" aria-busy={state === "loading"}>
      {state === "loading" ? <p className="mt-5" role="status">Загружаем локальный модуль…</p> : null}
      {state === "error" ? <p className="mt-5 font-semibold" role="alert">Не удалось проверить параметры. Проверьте диапазоны и нажмите «Повторить проверку». Инструкция ниже работает без расчёта.</p> : null}
      {plan ? <div className="mt-7 rounded-lg border-2 border-ink bg-white p-5" data-monitor-result={plan.status}>
        <h4 className="font-display text-2xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-action" tabIndex={-1} ref={resultRef}>{titles[plan.status]}</h4>
        <p className="mt-3 text-sm leading-relaxed text-muted">{plan.status === "parameters_match" ? "Совпали введённые размеры VESA и нагрузка, а для стола — диапазон толщины и доступ. Это ещё не подтверждение безопасности установки: ниже перечислено, что проверить вручную." : "Результат основан только на введённых данных. Исправьте несовпадения и уточните неизвестное; не покупайте крепление только по диагонали."}</p>
        <ul className="mt-4 divide-y divide-line">{plan.checks.map((check) => <li className="grid gap-2 py-3 sm:grid-cols-[90px_minmax(0,1fr)]" key={check.id}><span className={`text-sm font-bold ${check.state === "fail" ? "text-danger" : check.state === "pass" ? "text-technical" : "text-muted"}`}>{states[check.state]}</span><p className="text-sm leading-relaxed">{check.text}</p></li>)}</ul>
        <div className="mt-4 border-t border-line pt-4"><strong>До заказа проверьте ещё</strong><p className="mt-2 text-sm leading-relaxed">Диапазон диагоналей, форму и утопленность VESA-площадки, винты, запас кабелей и полный ход плеча. Для двух экранов — также их взаимное положение и ширину. При адаптере учитывайте его массу.</p><a className="mt-3 inline-flex min-h-11 items-center font-semibold text-technical underline underline-offset-4" href="#istochniki">Открыть официальные инструкции →</a></div>
      </div> : null}
    </div>
  </section>;
}
