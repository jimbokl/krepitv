import { Printer } from "@phosphor-icons/react";
import AffiliateOffer from "../AffiliateOffer.jsx";
import { CompatibilityPanel } from "./CompatibilityPanel.jsx";
import { ScrewPanel } from "./ScrewPanel.jsx";
import { WallFixingPanel } from "./WallFixingPanel.jsx";
import { PlacementPanel } from "./PlacementPanel.jsx";
import { CablePanel } from "./CablePanel.jsx";
import { ToolsPanel } from "./ToolsPanel.jsx";
import { PrintableChecklist } from "./PrintableChecklist.jsx";

export function InstallationKitResult({ model, mount, offer, plan }) {
  if (!plan) return null;
  return (
    <section className="mt-8" data-installation-kit-result="true" data-print-installation-kit="true">
      <header className="border-y-2 border-ink py-6">
        <p className="font-mono text-xs uppercase text-action">Персональный результат</p>
        <h2 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">Монтажный комплект</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">{model.title} + {mount.title}. Каждый блок имеет независимый статус: неполные данные не превращаются в точный совет.</p>
        <button className="secondary-button mt-5 print:hidden" onClick={() => window.print()} type="button"><Printer aria-hidden="true" />Распечатать результат</button>
      </header>
      <CompatibilityPanel section={plan.compatibility} />
      <ScrewPanel section={plan.screws} />
      <WallFixingPanel section={plan.wall_fixing} />
      <PlacementPanel section={plan.placement} />
      <CablePanel section={plan.cables} />
      <ToolsPanel section={plan.tools} />
      <PrintableChecklist section={plan.checklist} />
      {plan.market_eligible && plan.compatibility?.status === "verified" && offer ? <div className="mt-6 print:hidden"><AffiliateOffer compact detailsHref={`/kronshteyny/${mount.id}/`} offer={offer}><p className="mt-2 text-sm leading-relaxed text-muted">Ссылка ведёт на точный выбранный кронштейн. Наличие уточняется на Маркете для вашего региона.</p></AffiliateOffer></div> : null}
    </section>
  );
}
