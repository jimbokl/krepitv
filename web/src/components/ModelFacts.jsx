import {
  ArrowsOut,
  Barbell,
  BracketsSquare,
  CalendarDots,
  Monitor,
  ShieldCheck,
  Tag,
} from "@phosphor-icons/react";
import { modelWeightLabel, modelWeightSuffix } from "../lib/modelWeight.js";

export function ModelFacts({ model, detailed = false, deferColumns = false }) {
  const vesaConflict = model.wall_mount_screws?.vesa_conflict;
  const facts = [
    {
      label: "VESA",
      value: vesaConflict
        ? `Проверить: ${vesaConflict.catalog_value} / ${vesaConflict.manual_value}`
        : `${model.vesa_width_mm}×${model.vesa_height_mm}`,
      Icon: BracketsSquare,
    },
    {
      label: modelWeightLabel(model),
      value: `${formatNumber(model.weight_kg)} кг · ${modelWeightSuffix(model)}`,
      Icon: Barbell,
    },
    {
      label: "Диагональ экрана",
      value: `${formatNumber(model.diagonal_inches)}″`,
      Icon: ArrowsOut,
    },
  ];

  if (detailed) {
    facts.push(
      {
        label: "Серия и модельный год",
        value: `${model.series} · ${model.model_year ?? "год не указан производителем"}`,
        Icon: Tag,
      },
      {
        label: "Размер корпуса",
        value: `${formatNumber(model.width_mm)}×${formatNumber(model.height_mm)}×${formatNumber(model.depth_mm)} мм`,
        Icon: Monitor,
      },
      {
        label: "Дата проверки",
        value: formatDate(model.checked_at),
        Icon: CalendarDots,
      },
      {
        label: "Запас нагрузки",
        value: "Не менее 25%",
        Icon: ShieldCheck,
      },
    );
  }

  return (
    <dl
      className={
        detailed
          ? "min-w-0 divide-y divide-dashed divide-line border-y border-ink"
          : deferColumns
            ? "grid gap-5 lg:grid-cols-3"
            : "grid gap-5 sm:grid-cols-3"
      }
      data-model-facts={detailed ? "detailed" : "summary"}
    >
      {facts.map(({ label, value, Icon }) => (
        <div
          className={detailed ? "grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 px-2 py-3 sm:grid-cols-[2.5rem_minmax(7rem,1fr)_minmax(0,1fr)]" : "flex items-center gap-3"}
          data-model-fact-row={detailed ? "true" : undefined}
          key={label}
        >
          <Icon aria-hidden="true" className="size-8 text-ink" weight="regular" />
          <dt className="min-w-0 break-words text-sm text-muted sm:text-base">{label}</dt>
          <dd className={`${detailed ? "col-start-2 min-w-0 break-words font-medium text-technical [overflow-wrap:anywhere] sm:col-start-3" : "font-display text-2xl font-bold text-ink"}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value) {
  if (!value) return "Не указана";
  return new Intl.DateTimeFormat("ru-RU").format(new Date(`${value}T00:00:00`));
}
