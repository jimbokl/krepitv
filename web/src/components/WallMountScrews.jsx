import { LinkSimple, WarningCircle, Wrench } from "@phosphor-icons/react";
import { formatCheckedDate } from "./TrustMark.jsx";

export function WallMountScrews({ model }) {
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

      <dl className="mt-4 border-b border-line">
        {hardware.groups.map((group) => (
          <div className="border-t border-line py-3" key={group.location}>
            <dt className="font-mono text-[0.68rem] uppercase text-muted">{group.location}</dt>
            <dd className="mt-1 font-display text-2xl font-extrabold">
              {group.quantity} шт. · {group.thread}×{group.length_mm} мм
            </dd>
          </div>
        ))}
      </dl>

      {hardware.requires_adapters ? (
        <p className="mt-4 border-l-2 border-action pl-4 font-semibold">
          Для этой модели руководство требует использовать показанные адаптеры VESA.
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-muted">{hardware.note}</p>
      <div className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted">
        <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
        <p>
          <strong className="text-ink">Важно:</strong> это паспортный размер винта, а не
          глубина резьбового отверстия. Не увеличивайте длину по аналогии; учитывайте только
          схему и проставки из руководств телевизора и кронштейна.
        </p>
      </div>
      <a
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4"
        href={hardware.source_url}
        rel="noreferrer"
        target="_blank"
      >
        {hardware.source_label} · регион: {hardware.source_region} · проверено {formatCheckedDate(hardware.checked_at)}
        <LinkSimple aria-hidden="true" className="shrink-0" />
      </a>
    </section>
  );
}
