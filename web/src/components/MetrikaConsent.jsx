import { useState } from "react";
import {
  dismissMetrikaNotice,
  emitMetrikaConsent,
  ensureMetrikaConsent,
  METRIKA_CONSENT_DENIED,
  readMetrikaNoticeDismissed,
  writeMetrikaConsent,
} from "../lib/metrikaConsent.mjs";

export function MetrikaConsent() {
  const [decision, setDecision] = useState(() => ensureMetrikaConsent());
  const [dismissed, setDismissed] = useState(() => readMetrikaNoticeDismissed());
  if (decision === METRIKA_CONSENT_DENIED || dismissed) return null;

  function dismiss() {
    dismissMetrikaNotice();
    setDismissed(true);
  }

  function disable() {
    writeMetrikaConsent(METRIKA_CONSENT_DENIED);
    emitMetrikaConsent(window, METRIKA_CONSENT_DENIED);
    setDecision(METRIKA_CONSENT_DENIED);
  }

  return (
    <aside
      aria-label="Настройка аналитики"
      className="border-b-2 border-ink bg-white"
      data-consent-placement="inline"
    >
      <div className="mx-auto grid max-w-[1440px] gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-8">
        <p className="max-w-4xl text-sm leading-relaxed text-muted">
          <strong className="font-display text-base text-ink">Аналитика помогает улучшать инструменты.</strong>{" "}
          Продолжая пользоваться сайтом, вы принимаете необходимое использование аналитики.
          Метрика считает только посещения и технические события; Вебвизор отключён,
          поля форм и пользовательский ввод не передаются. Подробности — в{" "}
          <a className="underline underline-offset-2" href="/politika-konfidencialnosti/">
            политике
          </a>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            className="secondary-button !px-3 !py-2 text-sm"
            onClick={disable}
            type="button"
          >
            Отключить аналитику
          </button>
          <button
            className="primary-button !px-3 !py-2 text-sm"
            onClick={dismiss}
            type="button"
          >
            Понятно
          </button>
        </div>
      </div>
    </aside>
  );
}
