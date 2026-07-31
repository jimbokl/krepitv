import { LinkSimple, WarningCircle, Wrench } from "@phosphor-icons/react";
import { ScrewLengthCalculator } from "./ScrewLengthCalculator.jsx";
import { formatCheckedDate } from "./TrustMark.jsx";

function formatMm(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

export function screwMeasurement(group) {
  if (Number.isFinite(group.length_mm)) {
    return `${group.thread}×${group.length_mm} мм`;
  }
  if (group.length_unknown === true) {
    return `${group.thread} · длина не определена`;
  }
  if (
    Number.isFinite(group.engagement_min_mm)
    && Number.isFinite(group.engagement_max_mm)
  ) {
    return `${group.thread} · диапазон ${group.range_label || "L"} ${formatMm(group.engagement_min_mm)}–${formatMm(group.engagement_max_mm)} мм`;
  }
  return group.thread;
}

export function WallMountScrews({ model, showCatalogLink = true, showLengthCalculator = false }) {
  const hardware = model?.wall_mount_screws;
  if (!hardware?.groups?.length) return null;

  return (
    <section
      aria-labelledby="wall-mount-screws-title"
      className="mt-5 border-2 border-ink bg-white p-5"
      data-wall-mount-screws="true"
    >
      <div className="flex items-start gap-3">
        <Wrench aria-hidden="true" className="mt-0.5 size-8 shrink-0 text-action" />
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-action">
            Паспорт настенного монтажа
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold" id="wall-mount-screws-title">
            Какие винты нужны для {model.title}
          </h2>
        </div>
      </div>

      {hardware.vesa_conflict ? (
        <div className="mt-4 border-2 border-action bg-paper p-4" data-vesa-source-conflict="true">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-action">
            Расхождение официальных источников
          </p>
          <p className="mt-2 font-display text-xl font-extrabold">
            Карточка модели: {hardware.vesa_conflict.catalog_value} · руководство: {hardware.vesa_conflict.manual_value}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {hardware.vesa_conflict.note}
          </p>
        </div>
      ) : null}

      <dl className="mt-4 border-b border-line">
        {hardware.groups.map((group) => (
          <div className="border-t border-line py-3" key={group.location}>
            <dt className="font-mono text-[0.68rem] uppercase text-muted">{group.location}</dt>
            <dd className="mt-1 font-display text-2xl font-extrabold">
              {group.quantity} шт. · {screwMeasurement(group)}
            </dd>
          </div>
        ))}
      </dl>

      {hardware.requires_adapters ? (
        <p className="mt-4 border-l-2 border-action pl-4 font-semibold">
          Для этой модели руководство требует использовать показанные адаптеры VESA.
        </p>
      ) : null}

      {hardware.requires_adapters == null ? (
        <p className="mt-4 border-l-2 border-line pl-4 font-semibold" data-adapter-status="unknown">
          Проставки и адаптеры: руководство не указывает их наличие. Сверьте комплект кронштейна и бумажную инструкцию телевизора.
        </p>
      ) : null}

      {hardware.required_parts_note ? (
        <p className="mt-4 border-l-2 border-technical pl-4 font-semibold">
          {hardware.required_parts_note}
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-muted">{hardware.note}</p>
      <div className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted">
        <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
        <p>
          <strong className="text-ink">Важно:</strong>{" "}
          {hardware.groups.some((group) => group.length_unknown === true)
            ? "Официальные документы подтверждают резьбу, но не дают единой безопасной длины. Подберите её по бумажной инструкции телевизора и толщине планки кронштейна."
            : hardware.groups.some((group) => Number.isFinite(group.engagement_min_mm))
            ? hardware.groups.some((group) => group.range_label === "C")
              ? "Диапазон C измеряется после монтажной пластины до конца винта. Это не готовая полная длина покупаемого винта: добавьте толщину пластины кронштейна."
              : "Диапазон L взят из схемы руководства. Это не готовая полная длина винта: она зависит от толщины планки, шайбы и предусмотренной вставки."
            : "Это паспортный размер винта, а не глубина резьбового отверстия. Не увеличивайте длину по аналогии; учитывайте только схему и проставки из руководств телевизора и кронштейна."}
        </p>
      </div>
      {showLengthCalculator ? (
        <ScrewLengthCalculator
          groups={hardware.groups}
          requiresSpacerMeasurement={Boolean(
            hardware.requires_adapters || hardware.required_parts_note,
          )}
        />
      ) : null}
      <div className="mt-4 grid gap-2">
        <a
          className="inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4"
          href={hardware.source_url}
          rel="noreferrer"
          target="_blank"
        >
          {hardware.source_label} · регион: {hardware.source_region} · проверено {formatCheckedDate(hardware.checked_at)}
          <LinkSimple aria-hidden="true" className="shrink-0" />
        </a>
        {hardware.secondary_source_url && hardware.secondary_source_label ? (
          <a
            className="inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4"
            href={hardware.secondary_source_url}
            rel="noreferrer"
            target="_blank"
          >
            {hardware.secondary_source_label} · дополнительный официальный источник
            <LinkSimple aria-hidden="true" className="shrink-0" />
          </a>
        ) : null}
      </div>
      {showCatalogLink ? (
        <a
          className="mt-4 inline-flex items-center gap-2 font-semibold text-action underline underline-offset-4"
          href="/vinty-dlya-krepleniya-televizora/"
        >
          Сравнить винты VESA по моделям телевизоров
          <LinkSimple aria-hidden="true" className="shrink-0" />
        </a>
      ) : null}
    </section>
  );
}
