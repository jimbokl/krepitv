import { CheckCircle, Printer, WarningCircle, XCircle } from "@phosphor-icons/react";
import { AffiliateLink } from "../AffiliateOffer.jsx";
import { CompatibilityPanel } from "./CompatibilityPanel.jsx";
import { ScrewPanel } from "./ScrewPanel.jsx";
import { WallFixingPanel } from "./WallFixingPanel.jsx";
import { PlacementPanel } from "./PlacementPanel.jsx";
import { CablePanel } from "./CablePanel.jsx";
import { ToolsPanel } from "./ToolsPanel.jsx";
import { PrintableChecklist } from "./PrintableChecklist.jsx";

const OVERALL_STATUS = {
  verified: {
    label: "Совместимость подтверждена",
    description: "Проверенная пара готова к монтажному плану.",
    classes: "text-verified",
    Icon: CheckCircle,
  },
  "needs-check": {
    label: "Комплект требует проверки",
    description: "Точные данные есть не для каждого раздела.",
    classes: "text-warning",
    Icon: WarningCircle,
  },
  blocked: {
    label: "Монтаж нужно остановить",
    description: "Сначала устраните блокирующие условия в плане.",
    classes: "text-danger",
    Icon: XCircle,
  },
};

const SECTION_NAV = [
  ["compatibility", "Совместимость", "compatibility"],
  ["screws", "Винты", "screws"],
  ["wall-fixing", "Стена", "wall_fixing"],
  ["placement", "Высота", "placement"],
  ["cables", "Кабели", "cables"],
  ["tools", "Инструменты", "tools"],
  ["checklist", "Порядок", "checklist"],
];

export function InstallationKitResult({ model, mount, offer, plan }) {
  if (!plan) return null;
  const overall = OVERALL_STATUS[plan.overall_status] ?? OVERALL_STATUS["needs-check"];
  const OverallIcon = overall.Icon;
  const marketEligible = plan.market_eligible
    && plan.compatibility?.status === "verified"
    && offer;
  return (
    <section className="mt-8" data-installation-kit-result="true" data-installation-passport="true" data-print-installation-kit="true">
      <header className="border-y-2 border-ink bg-white py-6 sm:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-action">Ваш монтажный паспорт</p>
            <div className={`mt-3 flex items-start gap-3 ${overall.classes}`}>
              <OverallIcon aria-hidden="true" className="mt-0.5 size-9 shrink-0" weight="fill" />
              <div>
                <h2 className="font-display text-4xl font-extrabold leading-none text-ink sm:text-5xl">{overall.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{overall.description}</p>
              </div>
            </div>
            <p className="mt-5 font-mono text-sm font-semibold uppercase tracking-wide text-ink">{model.title} + {mount.title}</p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Каждый раздел имеет независимый статус: неполные данные не превращаются в точный совет.</p>
          </div>
          <div className="flex flex-col gap-3 print:hidden sm:flex-row xl:flex-col">
            <button className="secondary-button w-full sm:w-auto" onClick={() => window.print()} type="button"><Printer aria-hidden="true" />Распечатать результат</button>
            {marketEligible ? (
              <AffiliateLink className="primary-button w-full sm:w-auto" offer={offer}>
                Открыть на Яндекс Маркете
              </AffiliateLink>
            ) : null}
          </div>
        </div>
      </header>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
        <div className="min-w-0">
          <CompatibilityPanel section={plan.compatibility} />
          <ScrewPanel section={plan.screws} />
          <WallFixingPanel section={plan.wall_fixing} />
          <PlacementPanel section={plan.placement} />
          <CablePanel section={plan.cables} />
          <ToolsPanel section={plan.tools} />
          <PrintableChecklist section={plan.checklist} />
        </div>
        <KitStatusNav plan={plan} />
      </div>
    </section>
  );
}

function KitStatusNav({ plan }) {
  return (
    <nav className="order-first border-b border-line py-5 print:hidden xl:sticky xl:top-5 xl:order-last xl:border-b-0 xl:py-6" aria-label="Разделы монтажного паспорта" data-kit-status-nav="true">
      <p className="font-mono text-[0.68rem] uppercase tracking-wide text-muted">Семь проверок</p>
      <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 xl:block">
        {SECTION_NAV.map(([id, label, key]) => {
          const status = plan[key]?.status ?? "needs-check";
          const meta = OVERALL_STATUS[status] ?? OVERALL_STATUS["needs-check"];
          const Icon = meta.Icon;
          return (
            <li className="border-t border-line" key={id}>
              <a className="flex min-h-11 items-center gap-2 py-2 text-sm font-semibold hover:text-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action" href={`#kit-${id}`}>
                <Icon aria-hidden="true" className={`size-4 shrink-0 ${meta.classes}`} weight="fill" />
                {label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
