import { useState } from "react";
import { X } from "@phosphor-icons/react";
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
      className="border-b border-line/60 bg-white text-muted"
      data-consent-placement="inline"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 sm:px-8 lg:px-12">
        <p className="min-w-0 flex-1 py-2 text-xs leading-[18px]">
          Для улучшения сайта используем Метрику без записи ввода.{" "}
          <a className="text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" href="/politika-konfidencialnosti/">
            Политика
          </a>
          <span aria-hidden="true"> · </span>
          <button
            className="inline-flex min-h-6 items-center text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={disable}
            type="button"
          >
            Отключить аналитику
          </button>
        </p>
        <button
          aria-label="Скрыть уведомление об аналитике"
          className="flex size-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden="true" size={16} weight="regular" />
        </button>
      </div>
    </aside>
  );
}
