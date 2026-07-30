import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  ArrowsVertical,
  CheckCircle,
  HouseLine,
  Info,
  PushPin,
  Question,
  Stack,
} from "@phosphor-icons/react";
import { Brand } from "../components/Brand.jsx";
import { ModelFacts } from "../components/ModelFacts.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { TrustMark } from "../components/TrustMark.jsx";
import { useCompatibility } from "../hooks/useCompatibility.js";
import { modelHref } from "../lib/catalog.js";

const wallOptions = [
  {
    id: "solid",
    title: "Бетон или кирпич",
    description: "Сплошное минеральное основание",
    Icon: HouseLine,
  },
  {
    id: "block",
    title: "Блок или многослойная стена",
    description: "Основание требует отдельной проверки крепежа",
    Icon: Stack,
  },
  {
    id: "unknown",
    title: "Не знаю",
    description: "Сохраним пометку для проверки основания",
    Icon: Question,
  },
];

const mechanisms = [
  {
    id: "fixed",
    title: "Без регулировки",
    description: "Минимальное расстояние до стены",
    Icon: PushPin,
  },
  {
    id: "tilt",
    title: "С наклоном",
    description: "Можно изменить вертикальный угол",
    Icon: ArrowsVertical,
  },
  {
    id: "full-motion",
    title: "Поворотный",
    description: "Выдвижение, наклон и поворот",
    Icon: ArrowsClockwise,
  },
];

export function GuidedSelectionPage({ catalog }) {
  const queryModelId = new URLSearchParams(window.location.search).get("model");
  const initialModel =
    catalog.models.find((model) => model.id === queryModelId) ??
    catalog.models[1] ??
    catalog.models[0] ??
    null;
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState(initialModel?.title ?? "");
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [wall, setWall] = useState("");
  const [mechanism, setMechanism] = useState("");
  const compatibility = useCompatibility(
    step >= 3 && mechanism ? selectedModel : null,
    catalog.mounts,
    mechanism,
  );
  const compatible = useMemo(
    () => compatibility.matches.filter((item) => item.compatible),
    [compatibility.matches],
  );

  function selectSearchItem(item) {
    const model = catalog.models.find((candidate) => candidate.id === item?.id) ?? null;
    setSelectedModel(model);
  }

  function submitModel(item) {
    const model = catalog.models.find((candidate) => candidate.id === item.id);
    if (!model) return;
    setSelectedModel(model);
    setStep(2);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1487px] lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="border-b border-line bg-[#f3f1ec] px-5 py-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
          <Brand compact />
          <p className="mt-3 max-w-48 text-sm leading-snug text-muted">
            Точный подбор кронштейна и крепежа для вашего телевизора
          </p>

          <ol className="mt-7 grid grid-cols-3 lg:mt-16 lg:block" aria-label="Шаги подбора">
            <RailStep current={step} number={1} title="Модель" />
            <RailStep current={step} number={2} title="Стена" />
            <RailStep current={step} number={3} title="Кронштейн" />
          </ol>

          <div className="mt-8 hidden items-start gap-3 text-verified lg:flex lg:pt-56">
            <CheckCircle aria-hidden="true" className="size-10 shrink-0" weight="regular" />
            <p className="text-sm leading-snug">
              Мы проверяем.
              <br />
              Вы монтируете уверенно.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <section className="border-b border-line px-5 py-8 sm:px-10 lg:px-12">
            <p className="font-mono text-xs uppercase tracking-wide text-muted">
              Шаг {step} из 3
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-none sm:text-5xl lg:text-6xl">
              {step === 1 && "Начнём с модели телевизора"}
              {step === 2 && "Уточним основание стены"}
              {step === 3 && "Выберем механизм кронштейна"}
            </h1>
            <p className="mt-4 max-w-[900px] text-lg leading-relaxed text-muted sm:text-xl">
              {step === 1 &&
                "Введите точную модель — мы определим стандарты крепления, проверим нагрузку и подготовим совместимые решения."}
              {step === 2 &&
                "Тип стены влияет на крепёж. Мы сохраним ваш выбор отдельно от проверки VESA и нагрузки."}
              {step === 3 &&
                "Укажите нужную подвижность. Совместимость посчитаем локально по VESA, диагонали и запасу нагрузки."}
            </p>

            <div className="relative z-20 mt-7">
              {step === 1 ? (
                <ModelSearch
                  buttonLabel="Проверить модель"
                  compact
                  onChange={setQuery}
                  onSelect={selectSearchItem}
                  onSubmit={submitModel}
                  placeholder="Введите модель полностью"
                  search={catalog.search}
                  value={query}
                />
              ) : null}

              {step === 2 ? (
                <ChoiceGrid
                  label="Выберите тип стены"
                  onChange={setWall}
                  options={wallOptions}
                  value={wall}
                />
              ) : null}

              {step === 3 ? (
                <ChoiceGrid
                  label="Выберите механизм кронштейна"
                  onChange={setMechanism}
                  options={mechanisms}
                  value={mechanism}
                />
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-3">
                {step > 1 ? (
                  <button className="secondary-button" onClick={() => setStep(step - 1)} type="button">
                    <ArrowLeft aria-hidden="true" /> Назад
                  </button>
                ) : null}
                {step === 2 ? (
                  <button
                    className="primary-button"
                    disabled={!wall}
                    onClick={() => setStep(3)}
                    type="button"
                  >
                    Выбрать механизм <ArrowRight aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <TrustMark compact />
            </div>
          </section>

          {selectedModel ? (
            <section className="px-5 py-7 sm:px-10 lg:px-12">
              <div className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <div>
                  <p className="font-display text-lg font-bold">Результат для модели</p>
                  <a
                    className="mt-2 block font-display text-3xl font-bold text-verified hover:underline"
                    href={modelHref(selectedModel)}
                  >
                    {selectedModel.title}
                  </a>
                  <div className="mt-5">
                    <ModelFacts detailed model={selectedModel} />
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold">
                    Как крепление соединяет телевизор со стеной
                  </h2>
                  <img
                    alt="Система крепления телевизора: VESA-пластина, кронштейн, анкер и стена"
                    className="mt-4 aspect-[1.77/1] w-full object-contain"
                    src="/assets/images/mount-wall-system.png"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-md border border-line bg-white/70 p-4 text-sm leading-relaxed">
                <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-verified" />
                <p>
                  <strong>Проверка по официальным данным производителя:</strong>{" "}
                  VESA {selectedModel.vesa_width_mm}×{selectedModel.vesa_height_mm}, масса {selectedModel.weight_kg} кг и диагональ {selectedModel.diagonal_inches}″ подтверждены. Тип стены используется только как пометка для последующего подбора крепежа.
                </p>
              </div>

              {step === 3 ? (
                <CompatibilityResult
                  compatibility={compatibility}
                  matches={compatible}
                  model={selectedModel}
                />
              ) : null}

              <p className="mt-6 font-mono text-xs text-muted">
                Источник данных: {selectedModel.source_label} · Дата проверки: {selectedModel.checked_at.split("-").reverse().join(".")}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function RailStep({ current, number, title }) {
  const active = current === number;
  const done = current > number;
  return (
    <li className="relative flex items-center gap-4 pb-8 last:pb-0 lg:pb-24">
      <span
        className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${active ? "border-action bg-action text-white" : done ? "border-verified bg-verified text-white" : "border-line bg-paper text-muted"}`}
      >
        {done ? <CheckCircle aria-hidden="true" className="size-6" weight="fill" /> : number}
      </span>
      <span className={`hidden text-base font-semibold sm:block ${active ? "text-action" : "text-muted"}`}>
        {title}
      </span>
      {number < 3 ? (
        <span className="absolute left-5 top-11 h-px w-[calc(100%-2.75rem)] bg-line lg:top-11 lg:h-[calc(100%-2.75rem)] lg:w-px" aria-hidden="true" />
      ) : null}
    </li>
  );
}

function ChoiceGrid({ label, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-3 md:grid-cols-3">
        {options.map(({ id, title, description, Icon }) => (
          <label
            className={`group cursor-pointer rounded-md border-2 p-5 transition focus-within:ring-2 focus-within:ring-action ${value === id ? "border-action bg-white" : "border-line bg-white/60 hover:border-ink"}`}
            key={id}
          >
            <input
              checked={value === id}
              className="sr-only"
              name={label}
              onChange={() => onChange(id)}
              type="radio"
              value={id}
            />
            <Icon aria-hidden="true" className={`size-9 ${value === id ? "text-action" : "text-ink"}`} weight="regular" />
            <span className="mt-4 block font-display text-xl font-bold">{title}</span>
            <span className="mt-1 block text-sm leading-snug text-muted">{description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CompatibilityResult({ compatibility, matches, model }) {
  if (compatibility.status === "loading") {
    return <p className="mt-7 text-muted">Проверяем каталог кронштейнов…</p>;
  }
  if (compatibility.status === "error") {
    return (
      <p className="mt-7 rounded-md border border-danger p-4 text-danger">
        {compatibility.error}
      </p>
    );
  }
  return (
    <div className="mt-7 border-t-2 border-ink pt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-bold text-verified">
            Совместимость подтверждена
          </p>
          <p className="mt-1 text-sm text-muted">
            Для {model.title} найдено вариантов: {matches.length}
          </p>
        </div>
        <a className="primary-button" href={modelHref(model)}>
          Открыть карточку модели <ArrowRight aria-hidden="true" />
        </a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {matches.map(({ mount, reasons }) => (
          <article className="border border-line bg-white p-4" key={mount.id}>
            <h3 className="font-display text-xl font-bold">{mount.title}</h3>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {reasons.map((reason) => (
                <li className="flex gap-2" key={reason}>
                  <CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" weight="fill" />
                  {reason}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
