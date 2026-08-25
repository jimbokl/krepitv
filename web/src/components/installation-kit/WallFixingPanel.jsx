import { EvidenceLink, KitSection, formatMeasurement } from "./KitSection.jsx";

export function WallFixingPanel({ section }) {
  const fastener = section.exact_fastener;
  return <KitSection id="wall-fixing" section={section} title="Крепление кронштейна к стене">{fastener ? <dl className="mt-5 grid border-y border-line sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line"><Fact label="Система" value={fastener.title} /><Fact label="Количество" numeric value={String(fastener.quantity)} /><Fact label="Диаметр анкера" numeric value={formatMeasurement(fastener.anchor_diameter_mm, "мм")} /><Fact label="Диаметр сверла" numeric value={formatMeasurement(section.drill_diameter_mm, "мм")} /></dl> : <p className="mt-4 max-w-3xl text-muted">Точный анкер и сверло не называем: для этой стены и настенной пластины нет полной доказательной записи.</p>}<EvidenceLink evidence={fastener?.source} /></KitSection>;
}
function Fact({ label, numeric = false, value }) { return <div className="border-b border-line py-4 last:border-b-0 sm:px-4 lg:border-b-0 first:lg:pl-0"><dt className="font-mono text-xs uppercase text-muted">{label}</dt><dd className={`mt-1 font-display text-lg font-bold ${numeric ? "tabular-measure" : ""}`}>{value}</dd></div>; }
