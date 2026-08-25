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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map(([id, title, description, Icon]) => (
          <label className={`cursor-pointer rounded-md border-2 bg-white p-4 transition focus-within:ring-2 focus-within:ring-action ${value === id ? "border-action" : "border-line hover:border-ink"}`} key={id}>
            <input checked={value === id} className="sr-only" name="wall-profile" onChange={() => onChange(id)} type="radio" />
            <Icon aria-hidden="true" className={value === id ? "size-7 text-action" : "size-7"} />
            <strong className="mt-3 block font-display text-lg">{title}</strong>
            <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
