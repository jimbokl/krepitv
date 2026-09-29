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
      className="border-b border-line bg-paper text-muted"
      data-consent-placement="inline"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-8 sm:py-1">
        <p className="max-w-5xl text-[13px] leading-5">
          Продолжая пользоваться сайтом, вы принимаете необходимую аналитику.
          {" "}Метрика — без Вебвизора; введённые данные не передаём.{" "}
          <a className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" href="/politika-konfidencialnosti/">
            Политика
          </a>
          .
        </p>
        <div className="flex shrink-0 items-center gap-4 sm:justify-end">
          <button
            className="min-h-11 text-[13px] underline decoration-line underline-offset-2 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={disable}
            type="button"
          >
            Отключить аналитику
          </button>
          <button
            className="min-h-11 text-[13px] font-semibold text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
