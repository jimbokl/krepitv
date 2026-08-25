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
    <details
      className="kit-outcome-preview group self-start border-y-2 border-ink py-4 lg:border-y-0 lg:border-l lg:border-line lg:py-0 lg:pl-8"
      data-kit-outcome-preview="true"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-extrabold uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-action lg:pointer-events-none lg:min-h-0 lg:text-2xl">
        Что вы получите
        <CaretDown aria-hidden="true" className="size-5 shrink-0 transition group-open:rotate-180 lg:hidden" />
      </summary>
      <div className="mt-4 divide-y divide-line border-t border-ink lg:block" data-kit-outcome-body="true">
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
    </details>
  );
}
