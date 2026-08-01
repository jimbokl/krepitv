import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  DeviceMobile,
  Info,
  PlugsConnected,
  TelevisionSimple,
  WarningCircle,
  WifiHigh,
} from "@phosphor-icons/react";
import { calculatePhoneTvConnection } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const phoneOptions = [
  ["iphone", "iPhone / iPad", "AirPlay или проводное подключение"],
  ["android-samsung", "Samsung Galaxy", "Smart View и проверка USB-C"],
  ["android-other", "Другой Android", "Xiaomi, Huawei, Honor и другие"],
];

const primaryTvOptions = [
  ["samsung-smart-tv", "Samsung Smart TV"],
  ["lg-smart-tv", "LG Smart TV"],
  ["google-tv", "Android TV / Google TV"],
  ["yandex-tv", "Яндекс ТВ"],
];

const otherTvOptions = [
  ["apple-tv", "Apple TV"],
  ["hdmi-tv", "Обычный телевизор с HDMI"],
  ["other-smart-tv", "Другой Smart TV"],
  ["unknown", "Не знаю"],
];

const routeSources = {
  "apple-airplay": ["Apple: AirPlay", "https://support.apple.com/ru-ru/102661"],
  "apple-video-adapters": ["Apple: видеоадаптеры", "https://support.apple.com/ru-ru/108399"],
  "google-cast": ["Google: Cast", "https://support.google.com/googlecast/answer/3006709?hl=ru"],
  "samsung-smart-view": ["Samsung: Smart View", "https://www.samsung.com/ru/support/mobile-devices/how-to-mirror-from-your-samsung-smartphone-to-your-tv/"],
  "lg-screen-share": ["LG: Screen Share", "https://www.lg.com/us/support/help-library/lg-tv-mirroring-i-want-to-use-the-screen-share-mirroring-feature-CT10000018-20154629490992"],
  "vesa-displayport": ["VESA: DisplayPort по USB-C", "https://www.displayport.org/faq/"],
};

const goalOptions = [
  ["mirror", "Повторить весь экран"],
  ["media", "Показать фото или видео"],
  ["no-wifi", "Подключить без Wi-Fi"],
];

const statusCopy = {
  ready: {
    kicker: "Способ найден",
    label: "Условия подтверждены",
    className: "text-verified",
  },
  "needs-check": {
    kicker: "Маршрут найден",
    label: "Нужна проверка точной модели или настройки",
    className: "text-technical",
  },
  "no-direct-path": {
    kicker: "Нужны другие условия",
    label: "Прямой способ пока не подтверждён",
    className: "text-action",
  },
};

export function PhoneTvConnectionWizard() {
  const [phone, setPhone] = useState("");
  const [tv, setTv] = useState("");
  const [goal, setGoal] = useState("mirror");
  const [connector, setConnector] = useState("unknown");
  const [sameNetwork, setSameNetwork] = useState("unknown");
  const [hdmi, setHdmi] = useState("unknown");
  const [androidVideoOutput, setAndroidVideoOutput] = useState("unknown");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [feedback, setFeedback] = useState("idle");
  const resultHeadingRef = useRef(null);
  const selectedOtherTv = otherTvOptions.find(([value]) => value === tv)?.[1] ?? null;

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function invalidate() {
    setResult(null);
    setStatus("idle");
    setError(null);
    setShowDiagnostics(false);
    setFeedback("idle");
  }

  function choose(setter, value) {
    setter(value);
    invalidate();
  }

  async function submit(event) {
    event.preventDefault();
    if (!phone || !tv) return;
    setStatus("loading");
    setError(null);
    setShowDiagnostics(false);
    setFeedback("idle");
    try {
      const plan = await calculatePhoneTvConnection({
        phone,
        tv,
        goal,
        connector,
        sameNetwork,
        hdmi: tv === "hdmi-tv" ? "yes" : hdmi,
        androidVideoOutput: phone === "iphone" ? "unknown" : androidVideoOutput,
      });
      setResult(plan);
      setStatus("ready");
      emitResultCompleted(window, {
        toolId: "phone_tv_connection",
        resultType: plan.status === "no-direct-path" ? "blocked_plan" : `${plan.status.replace("-", "_")}_plan`,
      });
    } catch (caught) {
      setResult(null);
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Не удалось составить инструкцию");
    }
  }

  return (
    <section
      className="border-y-2 border-ink py-7"
      data-phone-tv-wizard="true"
      id="мастер-подключения"
    >
      <div className="grid min-w-0 gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <DeviceMobile aria-hidden="true" className="size-14 shrink-0 text-action" />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
              Бесплатно · без регистрации
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none">
              Мастер подключения
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Два выбора вместо универсального совета. Сервис отделяет передачу видео
              от повтора всего экрана и не рекомендует кабель по одному разъёму.
            </p>
          </div>
        </div>

        <form className="min-w-0" onSubmit={submit}>
          <ChoiceGrid
            legend="1. Какой у вас телефон?"
            name="phone"
            onChange={(value) => choose(setPhone, value)}
            options={phoneOptions}
            value={phone}
          />

          {phone ? (
            <div className="mt-7" data-wizard-step="tv">
              <ChoiceGrid
                columns="sm:grid-cols-2"
                legend="2. Какой у вас телевизор?"
                name="tv"
                onChange={(value) => choose(setTv, value)}
                options={primaryTvOptions}
                value={tv}
              />
              <details className="group mt-3 border-b border-line pb-3">
                <summary className="min-h-12 cursor-pointer list-none py-3 font-semibold text-technical focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                  {selectedOtherTv ? `Другой телевизор: ${selectedOtherTv}` : "Другой телевизор"}{" "}
                  <span className="text-action" aria-hidden="true">+</span>
                </summary>
                <ChoiceGrid
                  columns="sm:grid-cols-2"
                  hideLegend
                  legend="Другой тип телевизора"
                  name="tv-other"
                  onChange={(value) => choose(setTv, value)}
                  options={otherTvOptions}
                  value={tv}
                />
              </details>
            </div>
          ) : (
            <p className="mt-5 border-l-2 border-line pl-4 text-sm text-muted" aria-live="polite">
              Далее — выберем телевизор.
            </p>
          )}

          {phone && tv ? (
            <details className="group mt-7 border-y border-line py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                Уточнить задачу и условия — необязательно
                <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="space-y-7 pb-5 pt-2">
                <ChoiceGrid
                  columns="sm:grid-cols-3"
                  legend="Что хотите вывести?"
                  name="goal"
                  onChange={(value) => choose(setGoal, value)}
                  options={goalOptions}
                  value={goal}
                />

                <TriStateChoice
                  legend="Телефон и телевизор уже в одной сети Wi-Fi?"
                  name="same-network"
                  onChange={(value) => choose(setSameNetwork, value)}
                  value={sameNetwork}
                />

                <TriStateChoice
                  legend="На телевизоре есть свободный HDMI-вход?"
                  name="hdmi"
                  onChange={(value) => choose(setHdmi, value)}
                  value={tv === "hdmi-tv" ? "yes" : hdmi}
                />

                {goal === "no-wifi" ? (
                  <ChoiceGrid
                    columns="sm:grid-cols-3"
                    legend="Какой разъём у телефона?"
                    name="connector"
                    onChange={(value) => choose(setConnector, value)}
                    options={phone === "iphone"
                      ? [["usb-c", "USB-C"], ["lightning", "Lightning"], ["unknown", "Не знаю"]]
                      : [["usb-c", "USB-C"], ["micro-usb", "Micro-USB"], ["unknown", "Не знаю"]]}
                    value={connector}
                  />
                ) : null}

                {goal === "no-wifi" && phone !== "iphone" && connector === "usb-c" ? (
                  <TriStateChoice
                    legend="В официальных характеристиках телефона указан вывод видео по USB-C?"
                    name="android-video"
                    onChange={(value) => choose(setAndroidVideoOutput, value)}
                    value={androidVideoOutput}
                  />
                ) : null}
              </div>
            </details>
          ) : null}

          <button
            className="primary-button mt-7 min-h-14 w-full sm:w-auto"
            disabled={!phone || !tv || status === "loading"}
            type="submit"
          >
            {status === "loading" ? "Проверяем совместимость…" : "Показать инструкцию"}
            {status !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
          </button>
          {status === "loading" ? (
            <p className="mt-2 text-sm text-muted" role="status">Составляем инструкцию для вашей связки.</p>
          ) : null}
          {error ? (
            <div className="mt-5 flex gap-3 border-2 border-action p-4" role="alert">
              <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-action" />
              <p>{error}. Выбор сохранён — проверьте значения и повторите.</p>
            </div>
          ) : null}
        </form>
      </div>

      {result ? (
        <ConnectionResult
          feedback={feedback}
          onWorked={() => setFeedback("worked")}
          onToggleDiagnostics={() => setShowDiagnostics((current) => !current)}
          result={result}
          resultHeadingRef={resultHeadingRef}
          showDiagnostics={showDiagnostics}
        />
      ) : null}
    </section>
  );
}

function ChoiceGrid({ columns = "sm:grid-cols-3", hideLegend = false, legend, name, onChange, options, value }) {
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "font-display text-xl font-bold"}>{legend}</legend>
      <div className={`mt-3 grid gap-px border border-ink bg-ink ${columns}`}>
        {options.map(([optionValue, label, description]) => (
          <label
            className={`relative flex min-h-16 cursor-pointer flex-col justify-center bg-paper px-4 py-3 transition focus-within:z-10 focus-within:ring-2 focus-within:ring-action ${
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
            <span className="break-words font-display text-lg font-bold peer-checked:text-action">{label}</span>
            {description ? <span className="mt-1 text-xs leading-relaxed text-muted">{description}</span> : null}
            <span className="absolute right-3 top-3 size-2 rounded-full border border-ink bg-paper peer-checked:border-action peer-checked:bg-action" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TriStateChoice({ legend, name, onChange, value }) {
  return (
    <ChoiceGrid
      columns="grid-cols-3"
      legend={legend}
      name={name}
      onChange={onChange}
      options={[["yes", "Да"], ["no", "Нет"], ["unknown", "Не знаю"]]}
      value={value}
    />
  );
}

function ConnectionResult({ feedback, onToggleDiagnostics, onWorked, result, resultHeadingRef, showDiagnostics }) {
  const copy = statusCopy[result.status] ?? statusCopy["needs-check"];
  const primary = result.routes[0] ?? null;
  const alternatives = result.routes.slice(1);

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="mt-8 border-t-2 border-ink pt-7"
      data-phone-tv-result={result.status}
      role="status"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <p className={`font-mono text-xs uppercase tracking-[0.12em] ${copy.className}`}>{copy.kicker}</p>
          <h2
            className="mt-2 font-display text-4xl font-extrabold outline-none sm:text-5xl"
            ref={resultHeadingRef}
            tabIndex="-1"
          >
            {primary
              ? result.status === "ready"
                ? `Подтверждённый путь — ${primary.title}`
                : `Возможный путь — ${primary.title}`
              : "Совместимость не подтверждена"}
          </h2>
          <p className={`mt-3 font-semibold ${copy.className}`}>{copy.label}</p>
        </div>
        <div className="border-l-2 border-line pl-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Расчёт выполнен на устройстве</p>
          <p className="mt-1">Выбор не отправляется на сервер и не требует регистрации.</p>
        </div>
      </div>

      {primary ? <RouteDetails route={primary} /> : null}

      {result.next_checks.length || result.rejected_reasons.length ? (
        <div className={`mt-7 grid gap-px border border-ink bg-ink ${
          result.next_checks.length && result.rejected_reasons.length ? "md:grid-cols-2" : ""
        }`}>
          {result.next_checks.length ? (
            <section className="bg-paper p-5">
              <div className="flex items-center gap-3">
                <Info aria-hidden="true" className="size-6 text-technical" />
                <h3 className="font-display text-2xl font-bold">Что проверить</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {result.next_checks.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </section>
          ) : null}
          {result.rejected_reasons.length ? (
            <section className="bg-paper p-5">
              <div className="flex items-center gap-3">
                <WarningCircle aria-hidden="true" className="size-6 text-action" />
                <h3 className="font-display text-2xl font-bold">Что не считаем рабочим</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {result.rejected_reasons.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="primary-button min-h-12" onClick={onWorked} type="button">
          <CheckCircle aria-hidden="true" /> {feedback === "worked" ? "Соединение работает" : "Получилось"}
        </button>
        <button className="secondary-button min-h-12" onClick={onToggleDiagnostics} type="button">
          Телевизор не появился
        </button>
      </div>
      {feedback === "worked" ? (
        <p className="mt-3 font-semibold text-verified">
          Готово. Сохраните этот способ — повторная настройка обычно не нужна.
        </p>
      ) : null}

      {showDiagnostics ? (
        <section className="mt-5 border-l-2 border-technical pl-5" aria-live="polite">
          <h3 className="font-display text-2xl font-bold">Проверка без покупки нового кабеля</h3>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>1. Убедитесь, что выбран правильный HDMI-вход или включён режим беспроводного экрана.</li>
            <li>2. Перезапустите Wi-Fi на телефоне и телевизоре, затем проверьте одну сеть.</li>
            <li>3. Обновите систему обоих устройств и снимите старый запрет на подключение в меню ТВ.</li>
            <li>4. Если функция не названа в паспорте точной модели, не считайте её поддержанной.</li>
          </ol>
        </section>
      ) : null}

      {alternatives.length ? (
        <details className="group mt-7 border-y border-line py-1">
          <summary className="min-h-14 cursor-pointer list-none py-4 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
            Другой способ подключения <span className="text-action" aria-hidden="true">+</span>
          </summary>
          <RouteDetails compact route={alternatives[0]} />
        </details>
      ) : null}
    </section>
  );
}

function RouteDetails({ compact = false, route }) {
  const wired = route.id.includes("hdmi") || route.id.includes("wired");
  const Icon = wired ? PlugsConnected : WifiHigh;
  return (
    <article className={compact ? "pb-6" : "mt-7 border-y border-line py-6"} data-phone-tv-route={route.id}>
      <div className="flex items-start gap-4">
        <Icon aria-hidden="true" className="mt-1 size-8 shrink-0 text-action" />
        <div className="min-w-0">
          <h3 className="font-display text-3xl font-bold">{route.title}</h3>
          <p className="mt-2 max-w-3xl leading-relaxed text-muted">{route.condition}</p>
        </div>
      </div>
      {route.equipment.length ? (
        <p className="mt-5 border-l-2 border-action pl-4 text-sm leading-relaxed">
          <strong>Нужно:</strong> {route.equipment.join(" · ")}
        </p>
      ) : null}
      <ol className="mt-5 border-b border-line">
        {route.steps.map((step, index) => (
          <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-line py-4" key={step}>
            <span className="font-display text-2xl font-extrabold text-action">{index + 1}</span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      {route.warnings.map((warning) => (
        <p className="mt-4 flex gap-3 text-sm leading-relaxed text-muted" key={warning}>
          <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-technical" />
          {warning}
        </p>
      ))}
      {route.source_ids?.length ? (
        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <strong className="text-ink">Основание:</strong>
          {route.source_ids.map((sourceId) => {
            const source = routeSources[sourceId];
            return source ? (
              <a
                className="text-technical underline underline-offset-4"
                data-phone-tv-source={sourceId}
                href={source[1]}
                key={sourceId}
                rel="noreferrer"
                target="_blank"
              >
                {source[0]}
              </a>
            ) : null;
          })}
        </p>
      ) : null}
    </article>
  );
}

export function PhoneTvConnectionReference() {
  return (
    <section className="border-b-2 border-ink py-8" data-phone-tv-answer="true" data-phone-tv-reference="true">
      <div className="grid gap-px border border-ink bg-ink md:grid-cols-3">
        <article className="bg-paper p-5">
          <WifiHigh aria-hidden="true" className="size-8 text-action" />
          <h2 className="mt-3 font-display text-2xl font-bold">AirPlay и Cast — не одно и то же</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            AirPlay умеет повторять экран iPhone на совместимом приёмнике. Cast чаще передаёт
            конкретное видео из приложения; полный экран iPhone через Cast не обещаем.
          </p>
        </article>
        <article className="bg-paper p-5">
          <PlugsConnected aria-hidden="true" className="size-8 text-action" />
          <h2 className="mt-3 font-display text-2xl font-bold">USB-C ещё не видеовыход</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Одинаковая форма разъёма не подтверждает DisplayPort Alt Mode. Для Android сначала
            нужна официальная спецификация точной модели, и только потом адаптер.
          </p>
        </article>
        <article className="bg-paper p-5">
          <TelevisionSimple aria-hidden="true" className="size-8 text-action" />
          <h2 className="mt-3 font-display text-2xl font-bold">Обычный USB часто только читает файлы</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            USB-порт телевизора может питать устройство или открывать фото с накопителя. Это не
            универсальный вход для живого изображения с телефона.
          </p>
        </article>
      </div>

      <div className="mt-7">
        <h2 className="font-display text-3xl font-bold">Официальные инструкции, на которых основан мастер</h2>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          <a className="text-technical underline underline-offset-4" href="https://support.apple.com/ru-ru/102661" rel="noreferrer" target="_blank">Apple: AirPlay</a>
          <a className="text-technical underline underline-offset-4" href="https://support.google.com/googlecast/answer/3006709?hl=ru" rel="noreferrer" target="_blank">Google: трансляция из приложений</a>
          <a className="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/mobile-devices/how-to-mirror-from-your-samsung-smartphone-to-your-tv/" rel="noreferrer" target="_blank">Samsung: Smart View</a>
          <a className="text-technical underline underline-offset-4" href="https://www.displayport.org/faq/" rel="noreferrer" target="_blank">VESA: DisplayPort over USB-C</a>
        </div>
      </div>
    </section>
  );
}
