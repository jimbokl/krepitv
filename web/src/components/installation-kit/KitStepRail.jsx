import { CheckCircle } from "@phosphor-icons/react";

const STEPS = ["Марка", "Модель", "Стена", "Механизм", "Кронштейн", "Монтаж"];

export function KitStepRail({ current, completed = [], onStep }) {
  const done = new Set(completed);
  return (
    <ol className="mt-7 grid grid-cols-6 lg:mt-16 lg:block" aria-label="Шаги монтажного комплекта">
      {STEPS.map((title, index) => {
        const number = index + 1;
        const active = current === number;
        const complete = done.has(number) && current > number;
        return (
          <li className="relative flex items-center gap-4 pb-8 last:pb-0 lg:pb-14" key={title}>
            <button
              aria-current={active ? "step" : undefined}
              aria-label={`Шаг ${number}: ${title}`}
              className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${active ? "border-action bg-action text-white" : complete ? "border-verified bg-verified text-white" : "border-line bg-paper text-muted"}`}
              disabled={number > current}
              onClick={() => onStep(number)}
              type="button"
            >
              {complete ? <CheckCircle aria-hidden="true" className="size-5" weight="fill" /> : number}
            </button>
            <span className={`hidden text-sm font-semibold sm:block ${active ? "text-action" : "text-muted"}`}>
              {title}
            </span>
            {number < STEPS.length ? (
              <span className="absolute left-5 top-10 h-px w-[calc(100%-2.5rem)] bg-line lg:h-[calc(100%-2.5rem)] lg:w-px" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
