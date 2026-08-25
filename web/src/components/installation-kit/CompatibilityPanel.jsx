import { KitSection, formatMeasurement } from "./KitSection.jsx";

export function CompatibilityPanel({ section }) {
  return <KitSection id="compatibility" section={section} title="Совместимость телевизора и кронштейна"><dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2"><Fact label="Итог" value={section.fit_status === "verified-fit" ? "Совместимость подтверждена" : "Совместимость не подтверждена"} /><Fact label="Нагрузка с запасом" value={formatMeasurement(section.required_load_kg, "кг")} /></dl>{section.reasons?.length ? <ul className="mt-4 space-y-2 text-sm leading-relaxed">{section.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul> : null}</KitSection>;
}

function Fact({ label, value }) { return <div className="bg-white p-4"><dt className="font-mono text-xs uppercase text-muted">{label}</dt><dd className="mt-1 font-display text-xl font-bold">{value}</dd></div>; }
