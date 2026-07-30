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
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_#151515] sm:inset-x-6 sm:flex sm:items-center sm:justify-between sm:gap-6"
    >
      <div>
        <p className="font-display text-xl font-extrabold">Помогите улучшить подбор</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          С вашего разрешения Яндекс Метрика посчитает посещения и переходы на Маркет.
          Вебвизор отключён, имена, телефоны и текст поиска мы не передаём.
          Подробности — в {" "}
          <a className="underline underline-offset-2" href="/politika-konfidencialnosti/">
            политике конфиденциальности
          </a>
          .
        </p>
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-3 sm:mt-0 sm:justify-end">
        <button
          className="secondary-button"
          onClick={() => choose(METRIKA_CONSENT_DENIED)}
          type="button"
        >
          Только необходимое
        </button>
        <button
          className="primary-button"
          onClick={() => choose(METRIKA_CONSENT_GRANTED)}
          type="button"
        >
          Разрешить аналитику
        </button>
      </div>
    </aside>
  );
}
