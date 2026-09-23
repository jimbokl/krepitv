import { useState } from "react";
import { ArrowRight, Ruler } from "@phosphor-icons/react";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { compareSlimMountClearance } from "../lib/slimMountClearance.mjs";

export function SlimMountClearance({ mounts }) {
  const [depth, setDepth] = useState("");
  const [reserve, setReserve] = useState("10");
  const [result, setResult] = useState(null);

  function submit(event) {
    event.preventDefault();
    const comparison = compareSlimMountClearance(mounts, depth, reserve);
    setResult(comparison);
    if (!comparison.error) {
      emitResultCompleted(window, {
        toolId: "slim_mount_clearance",
        resultType: comparison.rows.some((row) => row.status === "check-on-site")
          ? "requires_physical_check"
          : "no_candidate_by_clearance",
      });
    }
  }

  return (
    <section className="border-y-2 border-ink py-8" data-analytics-tool="slim_mount_clearance" id="проверка-зазора">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-start">
        <div>
          <p className="font-mono text-xs uppercase text-action">Предварительный фильтр по габаритам</p>
          <h2 className="mt-2 flex items-start gap-3 font-display text-3xl font-extrabold"><Ruler aria-hidden="true" className="mt-1 size-8 shrink-0 text-action" />Сравнить выступ кабеля с профилем</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">Измерьте выступ уже подключённого штекера от задней плоскости ТВ. Сервис отсечёт варианты, у которых даже паспортный отступ меньше вашего требования. Остальные потребуют примерки: профиль не равен гарантированному свободному месту у каждого порта.</p>
        </div>
        <form className="grid gap-4 border-2 border-ink bg-white p-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-semibold">Выступ штекера, мм
            <input className="input-control" inputMode="decimal" max="200" min="0" onChange={(event) => { setDepth(event.target.value); setResult(null); }} required type="number" value={depth} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">Ваш запас, мм
            <input className="input-control" inputMode="decimal" max="100" min="0" onChange={(event) => { setReserve(event.target.value); setResult(null); }} required type="number" value={reserve} />
          </label>
          <button className="primary-button justify-center sm:col-span-2" type="submit">Сравнить варианты <ArrowRight aria-hidden="true" /></button>
        </form>
      </div>
      {result ? (
        <div aria-live="polite" className="mt-7" role="status">
          {result.error ? <p className="border-l-2 border-danger pl-4 text-danger">{result.error}</p> : (
            <>
              <p className="border-l-2 border-action pl-4 font-semibold">Требуемый выступ с вашим запасом: {result.requiredMm} мм. «Не отсеян» не означает «можно монтировать».</p>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><caption className="mb-3 text-left font-display text-xl font-bold">Кронштейны с профилем до 35 мм</caption><thead><tr className="border-b-2 border-ink"><th className="p-3">Модель</th><th className="p-3">Паспортный отступ</th><th className="p-3">Вывод</th><th className="p-3">Источник</th></tr></thead><tbody>{result.rows.map(({ mount, status }) => <tr className="border-b border-line" key={mount.id}><th className="p-3"><a className="font-semibold text-action underline" href={`/kronshteyny/${mount.id}/`}>{mount.title}</a></th><td className="p-3">{mount.wall_distance_min_mm} мм</td><td className="p-3">{status === "too-tight" ? "Тесно даже по паспорту" : "Не отсеян; нужна примерка"}</td><td className="p-3"><a className="text-technical underline" href={mount.source_url} rel="noreferrer" target="_blank">Характеристики</a></td></tr>)}</tbody></table></div>
            </>
          )}
        </div>
      ) : null}
      <p className="mt-5 text-sm leading-relaxed text-muted">Проверка не учитывает нишу портов, толщину направляющих, движение механизма и вентиляционные требования ТВ. Затем откройте <a className="font-semibold text-action underline" href="/podbor/">подбор по точной модели</a>.</p>
    </section>
  );
}
