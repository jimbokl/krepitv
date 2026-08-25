const STATUS = {
  verified: { label: "Проверено", classes: "border-verified text-verified" },
  "needs-check": { label: "Нужно проверить", classes: "border-action text-action" },
  blocked: { label: "Остановиться", classes: "border-danger text-danger" },
};

export function KitSection({ children, id, section, title }) {
  const status = STATUS[section?.status] ?? STATUS["needs-check"];
  return (
    <section className="border-t-2 border-ink py-6" data-kit-section={id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <span className={`border px-2 py-1 font-mono text-[0.68rem] uppercase ${status.classes}`} data-kit-status={section?.status ?? "needs-check"}>
          {status.label}
        </span>
      </div>
      {children}
      {section?.warnings?.length ? (
        <ul className="mt-4 space-y-2 border-l-2 border-action pl-4 text-sm leading-relaxed text-muted">
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
