import { CheckCircle, Info, ShieldCheck, UserCircle } from "@phosphor-icons/react";

export function EditorialAccountability({ evidence }) {
  return (
    <aside
      aria-label="Как подготовлен и проверен материал"
      className="border-b border-line py-4"
      data-editorial-accountability="true"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-2"><UserCircle aria-hidden="true" className="size-5 text-action" /> Материал подготовил <a className="font-semibold text-ink underline underline-offset-4" href={evidence.author.path}>{evidence.author.name}</a></span>
        <span>Обновлено <time dateTime={evidence.checkedAt}>{evidence.checkedLabel}</time></span>
      </div>
      <details className="group mt-2 max-w-4xl">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-technical focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Как мы проверили сведения
          <span aria-hidden="true" className="text-xl text-action transition group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-3 rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-muted lg:grid-cols-2">
          <EvidenceFact Icon={ShieldCheck} label="На чём основан материал">{evidence.basis}</EvidenceFact>
          <EvidenceFact Icon={CheckCircle} label="Дата проверки"><time dateTime={evidence.checkedAt}>{evidence.checkedLabel}</time></EvidenceFact>
          <EvidenceFact Icon={Info} label="Испытание товара">{evidence.physicalTest.label}</EvidenceFact>
          <p>{evidence.sourcePolicy}</p>
          <p>{evidence.automationDisclosure}</p>
          <p>{evidence.physicalTest.explanation}</p>
          <p>
            Подробности: <a className="font-semibold text-technical underline underline-offset-4" href={evidence.methodologyPath}>методика</a>
            {" · "}
            <a className="font-semibold text-technical underline underline-offset-4" href={evidence.correctionsPath}>сообщить об ошибке</a>.
          </p>
        </div>
      </details>
    </aside>
  );
}

function EvidenceFact({ Icon, label, children }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase leading-relaxed text-muted">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-action" /> {label}
      </p>
      <p className="mt-2 break-words font-display text-base font-bold leading-snug">{children}</p>
    </div>
  );
}
