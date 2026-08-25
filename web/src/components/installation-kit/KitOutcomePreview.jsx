import {
  CaretDown,
  ListChecks,
  PlugsConnected,
  Ruler,
  Screwdriver,
  ShieldCheck,
  Wall,
} from "@phosphor-icons/react";

const ITEMS = [
  ["Совместимость", "VESA, диагональ и нагрузка", ShieldCheck],
  ["Винты", "Только по паспорту модели", Screwdriver],
  ["Крепёж к стене", "Отдельно для вашего основания", Wall],
  ["Высота", "Контрольная линия без догадок", Ruler],
  ["Кабели", "Подключения и сервисный запас", PlugsConnected],
  ["Порядок монтажа", "Печатный чек-лист по шагам", ListChecks],
];

export function KitOutcomePreview() {
  return (
    <div className="self-start" data-kit-outcome-preview="true">
      <details className="group border-y-2 border-ink py-4 lg:hidden" data-kit-outcome-mobile="true">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-extrabold uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Что вы получите
          <CaretDown aria-hidden="true" className="size-5 shrink-0 transition group-open:rotate-180" />
        </summary>
        <OutcomeBody />
      </details>
      <section className="hidden border-l border-line pl-8 lg:block" data-kit-outcome-desktop="true">
        <h2 className="font-display text-2xl font-extrabold uppercase">Что вы получите</h2>
        <OutcomeBody />
      </section>
    </div>
  );
}

function OutcomeBody() {
  return (
    <div className="mt-4 divide-y divide-line border-t border-ink" data-kit-outcome-body="true">
      {ITEMS.map(([title, description, Icon]) => (
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 py-3" key={title}>
          <Icon aria-hidden="true" className="mt-0.5 size-6 text-action" />
          <div>
            <strong className="block font-display text-lg leading-tight">{title}</strong>
            <span className="mt-1 block text-sm leading-snug text-muted">{description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
