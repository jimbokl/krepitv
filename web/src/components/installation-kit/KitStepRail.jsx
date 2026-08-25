import { CheckCircle } from "@phosphor-icons/react";

const STEPS = ["Марка", "Модель", "Стена", "Механизм", "Кронштейн", "Монтаж"];

export function KitStepRail({ current, completed = [], onStep }) {
  const done = new Set(completed);
  return (
    <ol className="mt-6 grid grid-cols-6 lg:mt-12 lg:block" aria-label="Шаги монтажного комплекта">
      {STEPS.map((title, index) => {
        const number = index + 1;
        const active = current === number;
        const complete = done.has(number) && current > number;
        return (
          <li className="relative flex min-w-0 justify-center lg:items-center lg:justify-start lg:gap-4 lg:pb-12 lg:last:pb-0" key={title}>
            <button
              aria-current={active ? "step" : undefined}
              aria-label={`Шаг ${number}: ${title}`}
              className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${active ? "border-action bg-action text-white" : complete ? "border-verified bg-verified text-white" : "border-line bg-paper text-muted"}`}
              disabled={number > current}
              onClick={() => onStep(number)}
              type="button"
            >
              {complete ? <CheckCircle aria-hidden="true" className="size-5" weight="fill" /> : number}
            </button>
            <span className={`hidden font-display text-base font-bold lg:block ${active ? "text-action" : "text-muted"}`}>
              {title}
            </span>
            {number < STEPS.length ? (
              <span className="absolute left-[calc(50%+1.375rem)] right-[calc(-50%+1.375rem)] top-[1.375rem] h-px bg-line lg:left-[1.375rem] lg:right-auto lg:top-11 lg:h-[calc(100%-2.75rem)] lg:w-px" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
