import { EvidenceLink, KitSection, formatMeasurement } from "./KitSection.jsx";

export function WallFixingPanel({ section }) {
  const fastener = section.exact_fastener;
  return <KitSection id="wall-fixing" section={section} title="Крепление кронштейна к стене">{fastener ? <dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"><Fact label="Система" value={fastener.title} /><Fact label="Количество" value={String(fastener.quantity)} /><Fact label="Диаметр анкера" value={formatMeasurement(fastener.anchor_diameter_mm, "мм")} /><Fact label="Диаметр сверла" value={formatMeasurement(section.drill_diameter_mm, "мм")} /></dl> : <p className="mt-4 max-w-3xl text-muted">Точный анкер и сверло не называем: для этой стены и настенной пластины нет полной доказательной записи.</p>}<EvidenceLink evidence={fastener?.source} /></KitSection>;
}
function Fact({ label, value }) { return <div className="bg-white p-4"><dt className="font-mono text-xs uppercase text-muted">{label}</dt><dd className="mt-1 font-display text-lg font-bold">{value}</dd></div>; }
