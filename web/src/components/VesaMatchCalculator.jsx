import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Info,
  ListChecks,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { calculateVesaMatch } from "../lib/catalog.js";
import { formatFieldLabel } from "../lib/fieldLabel.mjs";

const INITIAL_VALUES = {
  width: "200",
  height: "200",
  unit: "мм",
  mountSpec: "75×75, 100×100, 200×100, 200×200, 300×200, 400×400 мм",
};

export function VesaMatchCalculator() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const plan = await calculateVesaMatch({
        width: Number(values.width),
        height: Number(values.height),
        unit: values.unit,
        mountSpec: values.mountSpec,
      });
      setResult(plan);
      setStatus("ready");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить проверку");
      setStatus("error");
    }
  }

  return (
    <section className="border-y-2 border-ink py-7" id="проверка-vesa">
      <div className="grid gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <Ruler aria-hidden="true" className="size-14 shrink-0 text-action" weight="regular" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Проверка в браузере
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Сравнить VESA телевизора и кронштейна
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Введите замер отверстий и вставьте точный перечень VESA из
              характеристик выбранного кронштейна.
            </p>
          </div>
        </div>

        <form className="grid gap-5" onSubmit={submit}>
          <fieldset>
            <legend className="font-display text-xl font-bold">Замер телевизора</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_1fr_9rem]">
              <NumberField
                hint="Между центрами левых и правых отверстий."
                label="По горизонтали"
                name="width"
                onChange={update}
                unit={values.unit}
                value={values.width}
              />
              <NumberField
                hint="Между центрами верхних и нижних отверстий."
                label="По вертикали"
                name="height"
                onChange={update}
                unit={values.unit}
                value={values.height}
              />
              <label className="grid content-start gap-2 text-sm font-medium">
                Единица
                <select
                  aria-label="Единица измерения VESA"
                  className="input-control"
                  onChange={(event) => update("unit", event.target.value)}
                  value={values.unit}
                >
                  <option value="мм">миллиметры</option>
                  <option value="см">сантиметры</option>
                </select>
                <span className="text-xs font-normal leading-relaxed text-muted">
                  Обычно VESA указан в миллиметрах.
                </span>
              </label>
            </div>
          </fieldset>

          <label className="grid gap-2 border-t border-line pt-4 text-sm font-medium">
            Строка VESA из характеристик кронштейна
            <textarea
              aria-describedby="mount-vesa-spec-hint"
              className="input-control min-h-28 resize-y leading-relaxed"
              maxLength="600"
              onChange={(event) => update("mountSpec", event.target.value)}
              required
              value={values.mountSpec}
            />
            <span className="text-xs font-normal leading-relaxed text-muted" id="mount-vesa-spec-hint">
              Подойдёт перечень вроде «100×100, 200×200, 300×200 мм». Запись
              «максимальный VESA 400×400» недостаточна.
            </span>
          </label>

          <button className="primary-button justify-self-start" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Сравниваем…" : "Сравнить точные пары VESA"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </div>

      <div aria-live="polite" className="mt-7" role="status">
        {error ? (
          <p className="flex items-start gap-3 border border-danger p-4 text-danger">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0" weight="fill" />
            {error}
          </p>
        ) : null}
        {result ? <VesaMatchResult result={result} /> : null}
      </div>
    </section>
  );
}

function VesaMatchResult({ result }) {
  const isMatch = result.status === "совпадает";
  const isMismatch = result.status === "не-совпадает";
  const resultLabel = isMatch
    ? "Есть точная пара"
    : isMismatch
      ? "Точной пары нет"
      : "Нужно уточнить";
  const tone = isMatch ? "good" : isMismatch ? "bad" : "neutral";
  const steps = [
    `Замер телевизора нормализован как ${result.measured_pair}: сначала горизонталь, затем вертикаль.`,
    result.recognized_pair_count > 0
      ? `В строке кронштейна распознано пар: ${result.recognized_pair_count}.`
      : "В строке кронштейна не распознано ни одной точной пары.",
    result.matched_pair
      ? `Явное совпадение найдено: ${result.matched_pair}.`
      : result.candidate_pair
        ? `Ближайший кандидат — ${result.candidate_pair}; повторите замер от центра до центра.`
        : result.reversed_pair
          ? `В списке есть обратная запись ${result.reversed_pair}, но оси VESA не взаимозаменяемы.`
          : result.range_only_claim
            ? "Предельный размер не является перечнем поддерживаемых схем."
            : `Явной пары ${result.measured_pair} в распознанном списке нет.`,
    "После VESA отдельно сверьте массу без подставки, запас нагрузки, диагональ, винты, механизм и стену.",
  ];

  return (
    <div className="border-t border-ink pt-6" data-vesa-match-status={result.status}>
      <div className="flex items-start gap-4">
        {isMatch ? (
          <CheckCircle aria-hidden="true" className="size-12 shrink-0 text-verified" weight="fill" />
        ) : isMismatch ? (
          <WarningCircle aria-hidden="true" className="size-12 shrink-0 text-danger" weight="fill" />
        ) : (
          <Info aria-hidden="true" className="size-12 shrink-0 text-action" weight="fill" />
        )}
        <div>
          <h3 className={`font-display text-3xl font-bold ${toneClass(tone)}`}>
            {resultLabel}
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            {result.result_summary}. Это проверка только схемы отверстий, не всей совместимости.
          </p>
        </div>
      </div>

      <div className="mt-6 grid border border-line sm:grid-cols-3">
        <ResultMetric label="Замер телевизора" tone={tone} value={result.measured_pair} />
        <ResultMetric label="Результат" tone={tone} value={resultLabel} />
        <ResultMetric label="Распознано пар" tone="neutral" value={String(result.recognized_pair_count)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks aria-hidden="true" className="size-7 text-action" />
            <h3 className="font-display text-2xl font-bold">Как получен ответ</h3>
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
            Что распознано
          </p>
          {result.recognized_pairs.length ? (
            <p className="mt-4 font-mono text-xs leading-6 text-ink">
              {result.recognized_pairs.join(" · ")}
            </p>
          ) : (
            <p className="mt-4">Точных пар пока нет.</p>
          )}
          {result.warnings?.map((warning) => (
            <p className="mt-3" key={warning}>{warning}.</p>
          ))}
          <a
            className="mt-4 inline-flex font-semibold text-action underline underline-offset-4"
            href="/kak-uznat-vesa-televizora/"
          >
            Как правильно измерить VESA
          </a>
        </aside>
      </div>
    </div>
  );
}

function NumberField({ hint, label, name, onChange, unit, value }) {
  const hintId = `${name}-vesa-hint`;
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span>{formatFieldLabel(label, unit)}</span>
      <input
        aria-describedby={hintId}
        aria-label={`${label}, ${unit}`}
        className="input-control"
        inputMode="decimal"
        max={unit === "см" ? "100" : "1000"}
        min={unit === "см" ? "3" : "30"}
        onChange={(event) => onChange(name, event.target.value)}
        required
        step="0.1"
        type="number"
        value={value}
      />
      <span className="text-xs font-normal leading-relaxed text-muted" id={hintId}>{hint}</span>
    </label>
  );
}

function ResultMetric({ label, tone, value }) {
  return (
    <div className="border-b border-line p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="font-mono text-[0.68rem] uppercase text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function toneClass(tone) {
  if (tone === "bad") return "text-danger";
  if (tone === "good") return "text-verified";
  return "text-action";
}
