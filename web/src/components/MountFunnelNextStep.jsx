import { ArrowRight } from "@phosphor-icons/react";
import { selectionStartHandlers } from "../lib/selectionStart.mjs";

const steps = [
  ["01", "Точная модель", "Выберите марку и полный код телевизора из проверенного каталога."],
  ["02", "Совместимый кронштейн", "Сервис сверит VESA, массу с запасом и диапазон диагонали."],
  ["03", "Яндекс Маркет", "Откройте карточку выбранного кронштейна и проверьте актуальное предложение."],
];

export function MountFunnelNextStep() {
  const selectionHandlers = selectionStartHandlers(
    globalThis.window,
    "seo_next_step",
  );
  return (
    <section
      aria-labelledby="mount-funnel-next-step-title"
      className="mt-12 border-y-2 border-ink py-7"
      data-mount-funnel-next-step="true"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            Следующий шаг после результата
          </p>
          <h2 className="mt-2 max-w-4xl break-words font-display text-[clamp(0.875rem,7.5vw,1.875rem)] font-extrabold leading-tight" id="mount-funnel-next-step-title">
            Проверьте точную модель и получите совместимые кронштейны
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            Подбор начнётся с марки и полного кода телевизора, затем сверит VESA, массу с запасом и диапазон диагонали. Случайные товары вместо подтверждённой совместимости не показываем.
          </p>
        </div>
        <a
          {...selectionHandlers}
          className="primary-button w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 lg:w-auto"
          href="/podbor/"
        >
          Начать подбор по модели <ArrowRight aria-hidden="true" />
        </a>
      </div>

      <ol className="mt-6 grid gap-px border border-ink bg-ink sm:grid-cols-3">
        {steps.map(([number, title, description]) => (
          <li className="min-w-0 bg-paper p-4" key={number}>
            <span className="font-mono text-xs text-action">{number}</span>
            <strong className="mt-2 block font-display text-xl font-extrabold">{title}</strong>
            <span className="mt-2 block text-sm leading-relaxed text-muted">{description}</span>
          </li>
        ))}
      </ol>

      <p className="mt-4 border-l-2 border-technical pl-4 text-sm leading-relaxed text-muted">
        Маркет откроется только после выбора подтверждённого совместимого кронштейна. Если проверенного варианта нет, сервис не подменяет его случайным товаром.
      </p>
    </section>
  );
}
