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
  connectorKind: "hdmi",
  portDirection: "unknown",
  connectorClearanceMm: "",
  userDirection: false,
};

const CONNECTIONS = [
  ["power", "Питание"], ["hdmi", "HDMI"], ["ethernet", "Сеть"],
  ["antenna", "Антенна"], ["optical", "Оптика"], ["usb", "USB"],
];

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function passportDirectionFor(modelPortPassport, connectionKind) {
  if (!modelPortPassport?.evidence?.source_url?.startsWith("https://")) return null;
  const directions = [...new Set(
    (modelPortPassport.ports ?? [])
      .filter((port) => port.kind === connectionKind)
      .map((port) => port.direction)
      .filter((direction) => ["sideways", "downward", "rearward"].includes(direction)),
  )];
  return directions.length === 1 ? directions[0] : null;
}

function connectorClearanceError(value, direction) {
  if (direction !== "rearward" || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 200
    ? ""
    : "Укажите габарит от 1 до 200 мм или оставьте поле пустым, если замер ещё не сделан.";
}

export function PlacementCableStep({ modelPortPassport = null, onSubmit }) {
  const [form, setForm] = useState(INITIAL);
  function field(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function toggle(connection) {
    setForm((current) => {
      const connections = current.connections.includes(connection)
        ? current.connections.filter((item) => item !== connection)
        : [...current.connections, connection];
      const connectorKind = connections.includes(current.connectorKind)
        ? current.connectorKind
        : (connections[0] ?? "");
      return {
        ...current,
        connections,
        connectorKind,
        connectorClearanceMm: "",
        portDirection: "unknown",
        userDirection: false,
      };
    });
  }
  const passportDirection = passportDirectionFor(modelPortPassport, form.connectorKind);
  const effectiveDirection = !form.userDirection && passportDirection
    ? passportDirection
    : form.portDirection;
  const clearanceError = connectorClearanceError(
    form.connectorClearanceMm,
    effectiveDirection,
  );
  function submit(event) {
    event.preventDefault();
    if (clearanceError) return;
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
        connectorClearance: form.connectorKind
          ? {
              connectionKind: form.connectorKind,
              portDirection: effectiveDirection,
              requiredClearanceMm: effectiveDirection === "rearward"
                ? (form.connectorClearanceMm === "" ? null : number(form.connectorClearanceMm))
                : null,
              factSource: !form.userDirection && passportDirection ? "passport" : "user",
            }
          : null,
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
        {form.connections.length ? (
          <details className="mt-5 border-y border-ink bg-white" data-kit-clearance-details="true">
            <summary className="cursor-pointer px-1 py-4 font-display text-lg font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset">
              Проверка самого тесного штекера
            </summary>
            <div className="grid gap-4 border-t border-line px-1 py-5 sm:grid-cols-2">
              <label>
                <span className="field-label font-semibold">Какое подключение проверить</span>
                <select
                  className="input-control mt-2"
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    connectorKind: event.target.value,
                    connectorClearanceMm: "",
                    portDirection: "unknown",
                    userDirection: false,
                  }))}
                  value={form.connectorKind}
                >
                  {CONNECTIONS.filter(([id]) => form.connections.includes(id)).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
              <div>
                <label>
                  <span className="field-label font-semibold">Куда направлен разъём</span>
                  <select
                    className="input-control mt-2"
                    disabled={Boolean(passportDirection && !form.userDirection)}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      portDirection: event.target.value,
                      connectorClearanceMm: "",
                      userDirection: true,
                    }))}
                    value={effectiveDirection}
                  >
                    <option value="sideways">Сбоку</option>
                    <option value="downward">Вниз</option>
                    <option value="rearward">Назад к стене</option>
                    <option value="unknown">Не знаю</option>
                  </select>
                </label>
                {passportDirection && !form.userDirection ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted">
                    <span>Направление взято из паспорта модели.</span>
                    <button
                      className="font-semibold text-technical underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                      onClick={() => setForm((current) => ({
                        ...current,
                        portDirection: passportDirection,
                        userDirection: true,
                      }))}
                      type="button"
                    >
                      На моём ТВ иначе
                    </button>
                  </div>
                ) : null}
              </div>
              {effectiveDirection === "rearward" ? (
                <label className="sm:col-span-2">
                  <span className="field-label font-semibold">Габарит штекера с изгибом, мм</span>
                  <input
                    aria-describedby="connector-clearance-help connector-clearance-error"
                    aria-invalid={clearanceError ? "true" : undefined}
                    className="input-control tabular-measure mt-2 sm:max-w-64"
                    inputMode="decimal"
                    max="200"
                    min="1"
                    onChange={(event) => field("connectorClearanceMm", event.target.value)}
                    step="1"
                    type="number"
                    value={form.connectorClearanceMm}
                  />
                  <span className="mt-2 block max-w-3xl text-xs leading-relaxed text-muted" id="connector-clearance-help">
                    Измерьте расстояние от корпуса ТВ до самой дальней точки подключённого штекера вместе с естественным изгибом кабеля. Не выпрямляйте кабель насильно.
                  </span>
                  <span className="mt-1 block min-h-5 text-xs font-semibold text-danger" id="connector-clearance-error" aria-live="polite">
                    {clearanceError}
                  </span>
                </label>
              ) : null}
            </div>
          </details>
        ) : null}
      </fieldset>
      <button className="primary-button w-full sm:w-auto" data-kit-primary-action="true" disabled={!required} type="submit">Собрать монтажный комплект</button>
    </form>
  );
}

function NumberField({ label, max, min, name, onChange, required = false, unit = "см", value }) {
  return <label><span className="field-label font-semibold">{label}, {unit}</span><input className="input-control tabular-measure mt-2" inputMode="decimal" max={max} min={min} onChange={(event) => onChange(name, event.target.value)} required={required} step="0.1" type="number" value={value} /></label>;
}
