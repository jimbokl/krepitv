import { CaretDown, CheckCircle, Info } from "@phosphor-icons/react";
import { mountHref } from "../../lib/catalog.js";

function MountOption({ match, selected, onChange }) {
  return (
    <label className={`flex min-h-44 cursor-pointer flex-col border-l-2 p-4 transition focus-within:ring-2 focus-within:ring-action ${selected ? "border-action bg-panel" : "border-line bg-white hover:border-ink"}`} data-kit-choice="mount" >
      <input aria-label={match.mount.title} checked={selected} className="sr-only" name="mount-id" onChange={() => onChange(match.mount.id)} type="radio" />
      <span className="font-mono text-[0.68rem] uppercase text-verified">Совместимость подтверждена</span>
      <strong className="mt-2 font-display text-xl">{match.mount.title}</strong>
      <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
        {(match.reasons ?? []).slice(0, 3).map((reason) => (
          <li className="flex gap-2" key={reason}><CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" weight="fill" />{reason}</li>
        ))}
      </ul>
      <a className="mt-4 text-sm font-semibold text-action underline underline-offset-4" href={mountHref(match.mount)}>
        Открыть технический паспорт
      </a>
    </label>
  );
}

export function MountChoiceStep({ compatibility, matches, value, onChange, onRetry }) {
  if (compatibility.status === "loading") return <p className="text-muted" data-guided-compatibility-state="loading">Проверяем VESA, нагрузку и диагональ…</p>;
  if (compatibility.status === "error") {
    return <div className="border border-danger p-4 text-danger" data-guided-compatibility-state="error" role="alert"><p>{compatibility.error}</p><button className="secondary-button mt-3" onClick={onRetry} type="button">Повторить</button></div>;
  }
  if (!matches.length) {
    return <div className="flex gap-3 border border-line bg-white p-4"><Info aria-hidden="true" className="size-6 shrink-0 text-action" /><p>Для выбранного механизма нет полностью проверенного варианта. Вернитесь назад и выберите другой механизм.</p></div>;
  }
  const featured = matches.slice(0, 3);
  const rest = matches.slice(3);
  return (
    <fieldset data-guided-compatibility-state="success" data-kit-mount-step="true">
      <legend className="sr-only">Подтверждённый кронштейн</legend>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {featured.map((match) => <MountOption key={match.mount.id} match={match} onChange={onChange} selected={value === match.mount.id} />)}
      </div>
      {rest.length ? (
        <details className="group mt-4 border-y border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-display text-lg font-bold">Ещё {rest.length} проверенных вариантов <CaretDown aria-hidden="true" className="size-5 group-open:rotate-180" /></summary>
          <div className="grid gap-3 border-t border-line py-4 md:grid-cols-2">
            {rest.map((match) => <MountOption key={match.mount.id} match={match} onChange={onChange} selected={value === match.mount.id} />)}
          </div>
        </details>
      ) : null}
    </fieldset>
  );
}
