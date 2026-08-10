import { CheckCircle, Info, ShieldCheck, UserCircle } from "@phosphor-icons/react";

export function EditorialAccountability({ evidence }) {
  return (
    <aside
      aria-label="Как подготовлен и проверен материал"
      className="border-b-2 border-ink py-5"
      data-editorial-accountability="true"
    >
      <div className="grid gap-px border border-ink bg-ink sm:grid-cols-2 xl:grid-cols-4">
        <EvidenceFact Icon={UserCircle} label="Автор материала">
          <a className="underline decoration-action decoration-2 underline-offset-4" href={evidence.author.path}>
            {evidence.author.name}
          </a>
        </EvidenceFact>
        <EvidenceFact Icon={ShieldCheck} label="Основание">
          {evidence.basis}
        </EvidenceFact>
        <EvidenceFact Icon={CheckCircle} label="Материал обновлён">
          <time dateTime={evidence.checkedAt}>{evidence.checkedLabel}</time>
        </EvidenceFact>
        <EvidenceFact Icon={Info} label="Испытание товара">
          {evidence.physicalTest.label}
        </EvidenceFact>
      </div>

      <details className="group border-x border-b border-ink bg-white px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Как подготовлен материал
          <span aria-hidden="true" className="text-xl text-action transition group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-3 pt-3 text-sm leading-relaxed text-muted lg:grid-cols-2">
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
    <div className="min-w-0 bg-paper p-4">
      <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase leading-relaxed text-muted">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-action" /> {label}
      </p>
      <p className="mt-2 break-words font-display text-base font-bold leading-snug">{children}</p>
    </div>
  );
}
