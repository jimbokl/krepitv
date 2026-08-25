import { CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";

const STATUS = {
  verified: { label: "Проверено", classes: "border-verified text-verified", Icon: CheckCircle },
  "needs-check": { label: "Нужно проверить", classes: "border-warning text-warning", Icon: WarningCircle },
  blocked: { label: "Остановиться", classes: "border-danger text-danger", Icon: XCircle },
};

export function KitSection({ children, id, section, title }) {
  const status = STATUS[section?.status] ?? STATUS["needs-check"];
  const StatusIcon = status.Icon;
  return (
    <section className="scroll-mt-6 border-t-2 border-ink py-7" data-kit-section={id} id={`kit-${id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <span className={`inline-flex min-h-8 items-center gap-1.5 border px-2 py-1 font-mono text-[0.68rem] uppercase ${status.classes}`} data-kit-status={section?.status ?? "needs-check"}>
          <StatusIcon aria-hidden="true" className="size-4" weight="fill" />{status.label}
        </span>
      </div>
      {children}
      {section?.warnings?.length ? (
        <ul className={`mt-4 space-y-2 border-l-2 pl-4 text-sm leading-relaxed text-muted ${section?.status === "blocked" ? "border-danger" : "border-warning"}`}>
          {section.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

export function formatMeasurement(value, unit = "см") {
  return Number.isFinite(value) ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ${unit}` : "—";
}

export function EvidenceLink({ evidence }) {
  if (!evidence?.source_url) return null;
  return <a className="mt-3 inline-flex text-xs font-semibold text-action underline underline-offset-4" href={evidence.source_url} rel="noopener noreferrer" target="_blank">Источник: {evidence.source_label}</a>;
}
