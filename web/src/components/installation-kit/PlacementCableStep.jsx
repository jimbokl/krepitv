import { useState } from "react";

const INITIAL = {
  eyeHeight: "",
  viewingDistance: "",
  viewingAngle: "0",
  furnitureHeight: "",
  furnitureClearance: "10",
  desiredTurn: "0",
  safetyClearance: "3",
  routing: "unknown",
  spareLength: "30",
  connections: ["power", "hdmi"],
};

const CONNECTIONS = [
  ["power", "Питание"], ["hdmi", "HDMI"], ["ethernet", "Сеть"],
  ["antenna", "Антенна"], ["optical", "Оптика"], ["usb", "USB"],
];

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function PlacementCableStep({ onSubmit }) {
  const [form, setForm] = useState(INITIAL);
  function field(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function toggle(connection) {
    setForm((current) => ({
      ...current,
      connections: current.connections.includes(connection)
        ? current.connections.filter((item) => item !== connection)
        : [...current.connections, connection],
    }));
  }
  function submit(event) {
    event.preventDefault();
    onSubmit({
      placement: {
        eye_height_cm: number(form.eyeHeight),
        viewing_distance_cm: number(form.viewingDistance),
        viewing_angle_degrees: number(form.viewingAngle),
        furniture_height_cm: number(form.furnitureHeight),
        furniture_clearance_cm: number(form.furnitureClearance),
        desired_turn_degrees: number(form.desiredTurn),
        safety_clearance_cm: number(form.safetyClearance),
      },
      cables: {
        routing: form.routing,
        connections: form.connections,
        spare_length_cm: number(form.spareLength),
      },
    });
  }
  const required = [form.eyeHeight, form.viewingDistance, form.furnitureHeight].every((value) => value !== "");
  return (
    <form className="space-y-8" data-kit-placement-step="true" onSubmit={submit}>
      <fieldset>
        <legend className="font-display text-2xl font-extrabold">Размещение телевизора</legend>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Все высоты измеряются от чистого пола. Плинтус не используем как нулевую отметку.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Высота глаз" max="220" min="50" name="eyeHeight" onChange={field} required value={form.eyeHeight} />
          <NumberField label="Расстояние до экрана" max="1000" min="30" name="viewingDistance" onChange={field} required value={form.viewingDistance} />
          <NumberField label="Высота тумбы" max="200" min="0" name="furnitureHeight" onChange={field} required value={form.furnitureHeight} />
          <NumberField label="Зазор над тумбой" max="100" min="0" name="furnitureClearance" onChange={field} value={form.furnitureClearance} />
          <NumberField label="Желаемый поворот" max="90" min="0" name="desiredTurn" onChange={field} unit="°" value={form.desiredTurn} />
          <NumberField label="Запас до стены" max="50" min="0" name="safetyClearance" onChange={field} value={form.safetyClearance} />
        </div>
      </fieldset>
      <fieldset className="border-t border-line pt-5">
        <legend className="font-display text-2xl font-extrabold">Кабели</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="field-label font-semibold">Прокладка</span><select className="input-control mt-2" onChange={(event) => field("routing", event.target.value)} value={form.routing}><option value="unknown">Ещё не решил</option><option value="open">Открытая</option><option value="hidden">Скрытая</option></select></label>
          <NumberField label="Сервисный запас кабеля" max="500" min="0" name="spareLength" onChange={field} value={form.spareLength} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CONNECTIONS.map(([id, label]) => <label className={`cursor-pointer border px-3 py-2 text-sm ${form.connections.includes(id) ? "border-action bg-white font-semibold" : "border-line"}`} key={id}><input checked={form.connections.includes(id)} className="sr-only" onChange={() => toggle(id)} type="checkbox" />{label}</label>)}
        </div>
      </fieldset>
      <button className="primary-button w-full sm:w-auto" data-kit-primary-action="true" disabled={!required} type="submit">Собрать монтажный комплект</button>
    </form>
  );
}

function NumberField({ label, max, min, name, onChange, required = false, unit = "см", value }) {
  return <label><span className="field-label font-semibold">{label}, {unit}</span><input className="input-control tabular-measure mt-2" inputMode="decimal" max={max} min={min} onChange={(event) => onChange(name, event.target.value)} required={required} step="0.1" type="number" value={value} /></label>;
}
