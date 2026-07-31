import { useState } from "react";
import {
  emitMetrikaConsent,
  METRIKA_CONSENT_DENIED,
  METRIKA_CONSENT_GRANTED,
  readMetrikaConsent,
  writeMetrikaConsent,
} from "../lib/metrikaConsent.mjs";

export function MetrikaConsent() {
  const [decision, setDecision] = useState(() => readMetrikaConsent());
  if (decision) return null;

  function choose(value) {
    writeMetrikaConsent(value);
    emitMetrikaConsent(window, value);
    setDecision(value);
  }

  return (
    <aside
      aria-label="Настройка аналитики"
      className="border-b-2 border-ink bg-white"
      data-consent-placement="inline"
    >
      <div className="mx-auto grid max-w-[1440px] gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-8">
        <p className="max-w-4xl text-sm leading-relaxed text-muted">
          <strong className="font-display text-base text-ink">Помогите улучшить подбор.</strong>{" "}
          С разрешения Метрика посчитает посещения, обезличенные результаты расчётов и
          подбора, переходы к проверке кронштейна и на Маркет. Вебвизор отключён;
          имена, телефоны и текст поиска не передаются. Подробности — в{" "}
          <a className="underline underline-offset-2" href="/politika-konfidencialnosti/">
            политике
          </a>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            className="secondary-button !px-3 !py-2 text-sm"
            onClick={() => choose(METRIKA_CONSENT_DENIED)}
            type="button"
          >
            Только необходимое
          </button>
          <button
            className="primary-button !px-3 !py-2 text-sm"
            onClick={() => choose(METRIKA_CONSENT_GRANTED)}
            type="button"
          >
            Разрешить
          </button>
        </div>
      </div>
    </aside>
  );
}
