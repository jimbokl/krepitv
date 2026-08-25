import { Buildings, HouseLine, Question, Stack, Wall } from "@phosphor-icons/react";

const OPTIONS = [
  ["concrete", "Бетон", "Монолит или бетонная панель", Buildings],
  ["solid-brick", "Полнотелый кирпич", "Без пустот в зоне крепления", HouseLine],
  ["hollow-block", "Пустотелый блок", "Пустоты требуют отдельной системы", Stack],
  ["aerated-block", "Газобетон", "Нужны марка блока и паспорт крепежа", Wall],
  ["drywall-with-blocking", "ГКЛ с закладной", "Закладная точно найдена и доступна", HouseLine],
  ["drywall-without-blocking", "ГКЛ без закладной", "Поворотный вариант может быть заблокирован", Wall],
  ["unknown", "Не знаю", "Оставим крепёж на обязательную проверку", Question],
];

export function WallProfileStep({ value, onChange }) {
  return (
    <fieldset data-kit-wall-step="true">
      <legend className="sr-only">Материал стены</legend>
      <div className="divide-y divide-line border-y border-ink sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">
        {OPTIONS.map(([id, title, description, Icon]) => (
          <label className={`grid min-h-24 cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 px-3 py-4 transition focus-within:ring-2 focus-within:ring-action sm:min-h-36 sm:grid-cols-1 sm:content-center sm:p-5 ${value === id ? "bg-panel" : "bg-white hover:bg-panel/60"}`} data-kit-choice="wall-profile" key={id}>
            <input aria-label={title} checked={value === id} className="sr-only" name="wall-profile" onChange={() => onChange(id)} type="radio" />
            <Icon aria-hidden="true" className={value === id ? "size-8 text-action" : "size-8"} />
            <span><strong className="block font-display text-lg">{title}</strong><span className="mt-1 block text-sm leading-snug text-muted">{description}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
