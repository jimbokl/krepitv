import { KitSection, formatMeasurement } from "./KitSection.jsx";

const LABELS = { power: "питание", hdmi: "HDMI", ethernet: "сеть", antenna: "антенна", optical: "оптика", usb: "USB" };
export function CablePanel({ section }) { return <KitSection id="cables" section={section} title="Кабели и доступ к разъёмам"><dl className="mt-5 grid border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-line"><Fact label="Прокладка" value={section.routing === "open" ? "Открытая" : section.routing === "hidden" ? "Скрытая" : "Не определена"} /><Fact label="Подключения" value={(section.connections ?? []).map((item) => LABELS[item] ?? item).join(", ") || "Не выбраны"} /><Fact label="Сервисный запас" numeric value={formatMeasurement(section.spare_length_cm)} /></dl>{section.port_sides?.length ? <p className="mt-4 text-sm">Подтверждённые стороны разъёмов: {section.port_sides.join(", ")}.</p> : null}{section.clearance ? <CableClearance assessment={section.clearance} /> : null}</KitSection>; }
function Fact({ label, numeric = false, value }) { return <div className="border-b border-line py-4 last:border-b-0 sm:border-b-0 sm:px-4 first:sm:pl-0"><dt className="font-mono text-xs uppercase text-muted">{label}</dt><dd className={`mt-1 font-display text-lg font-bold ${numeric ? "tabular-measure" : ""}`}>{value}</dd></div>; }

function CableClearance({ assessment }) {
  const content = assessment.verdict === "verified"
    ? { title: "Помещается по введённому замеру", classes: "border-verified", next: "Перед монтажом проверьте траекторию кабеля во всём диапазоне движения." }
    : assessment.verdict === "conflict"
      ? { title: "Этот штекер не помещается", classes: "border-danger", next: "Выберите другой доступный порт, кабельный форм-фактор или кронштейн и повторите расчёт." }
      : { title: "Измерьте штекер с изгибом", classes: "border-warning", next: "Без замера заднего подключения выбранный кронштейн не рекомендуем к покупке." };
  return (
    <div className={`mt-5 border-l-4 bg-white p-4 ${content.classes}`} data-cable-clearance-verdict={assessment.verdict}>
      <p className="font-display text-xl font-extrabold">{content.title}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Fact label="Доступный зазор" numeric value={formatMeasurement(assessment.available_clearance_mm, "мм")} />
        <Fact label="Габарит штекера" numeric value={formatMeasurement(assessment.required_clearance_mm, "мм")} />
        <Fact label={Number.isFinite(assessment.margin_mm) && assessment.margin_mm < 0 ? "Дефицит" : "Запас"} numeric value={Number.isFinite(assessment.margin_mm) ? formatMeasurement(Math.abs(assessment.margin_mm), "мм") : "—"} />
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-muted">{content.next}</p>
    </div>
  );
}
