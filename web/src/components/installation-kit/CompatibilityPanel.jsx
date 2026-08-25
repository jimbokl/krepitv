import { KitSection, formatMeasurement } from "./KitSection.jsx";

export function CompatibilityPanel({ section }) {
  return <KitSection id="compatibility" section={section} title="Совместимость телевизора и кронштейна"><dl className="mt-5 grid border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-line"><Fact label="Итог" value={section.fit_status === "verified-fit" ? "Совместимость подтверждена" : "Совместимость не подтверждена"} /><Fact label="Нагрузка с запасом" numeric value={formatMeasurement(section.required_load_kg, "кг")} /></dl>{section.reasons?.length ? <ul className="mt-5 grid gap-2 text-sm leading-relaxed sm:grid-cols-2">{section.reasons.map((reason) => <li className="border-l-2 border-verified pl-3" key={reason}>{reason}</li>)}</ul> : null}</KitSection>;
}

function Fact({ label, numeric = false, value }) { return <div className="py-4 sm:px-5 first:sm:pl-0"><dt className="font-mono text-xs uppercase text-muted">{label}</dt><dd className={`mt-1 font-display text-xl font-bold ${numeric ? "tabular-measure" : ""}`}>{value}</dd></div>; }
