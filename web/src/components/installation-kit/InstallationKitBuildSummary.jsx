import {
  ArrowDown,
  CheckCircle,
  Printer,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { AffiliateLink } from "../AffiliateOffer.jsx";
import { emitInstallationKitInteraction } from "../../lib/installationKitInteraction.mjs";
import { formatMeasurement } from "./KitSection.jsx";

const STATUS = {
  verified: {
    label: "Сборка подтверждена",
    classes: "border-verified text-verified",
    Icon: CheckCircle,
  },
  "needs-check": {
    label: "Нужна проверка",
    classes: "border-warning text-warning",
    Icon: WarningCircle,
  },
  blocked: {
    label: "Сборка остановлена",
    classes: "border-danger text-danger",
    Icon: XCircle,
  },
};

const CHECKS = [
  ["compatibility", "Совместимость", "compatibility"],
  ["screws", "Винты VESA", "screws"],
  ["wall-fixing", "Крепёж к стене", "wall_fixing"],
  ["placement", "Высота и разметка", "placement"],
  ["cables", "Кабели и разъёмы", "cables"],
  ["tools", "Инструменты", "tools"],
  ["checklist", "Порядок монтажа", "checklist"],
];

function primaryReason(plan) {
  const verdict = plan.cables?.clearance?.verdict;
  if (verdict === "conflict") {
    return "Этот штекер не помещается. Выберите другой порт, кабельный форм-фактор или кронштейн и повторите расчёт.";
  }
  if (verdict === "needs-measurement") {
    return "Измерьте штекер с изгибом до перехода к выбранному кронштейну.";
  }
  if (plan.overall_status === "blocked") {
    return "Сначала устраните блокирующие условия из списка проверок.";
  }
  if (plan.overall_status === "needs-check") {
    return "Сверьте неподтверждённые пункты, затем вернитесь к выбранному кронштейну.";
  }
  return "Технические проверки завершены. Перед заказом ещё раз сверьте точную модель в карточке товара.";
}

function CheckLink({ check, visible = false }) {
  return (
    <li data-kit-summary-check-visible={visible ? "true" : undefined}>
      <a
        className="group grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        href={`#kit-${check.id}`}
      >
        <span>
          <strong className="block font-display text-base text-ink">{check.label}</strong>
          <span className="mt-0.5 block leading-snug text-muted">{check.reason}</span>
        </span>
        <ArrowDown aria-hidden="true" className="size-4 text-action transition group-hover:translate-y-0.5" />
      </a>
    </li>
  );
}

export function InstallationKitBuildSummary({ model, mount, offer, plan }) {
  const status = STATUS[plan.overall_status] ?? STATUS["needs-check"];
  const StatusIcon = status.Icon;
  const cableVerdict = plan.cables?.clearance?.verdict;
  const marketEligible = Boolean(
    plan.market_eligible
    && plan.compatibility?.status === "verified"
    && !["needs-measurement", "conflict"].includes(cableVerdict)
    && offer,
  );
  const checks = CHECKS
    .map(([id, label, key]) => ({
      id,
      label,
      section: plan[key],
      reason: plan[key]?.warnings?.[0] ?? "Раздел требует ручной проверки.",
    }))
    .filter((item) => item.section?.status !== "verified");
  const visibleChecks = checks.slice(0, 3);
  const hiddenChecks = checks.slice(3);
  const interactionStatus = STATUS[plan.overall_status]
    ? plan.overall_status
    : "needs-check";

  return (
    <section
      className="border-2 border-ink bg-white"
      data-installation-kit-build-summary="true"
      data-kit-summary-status={plan.overall_status}
    >
      <div className="grid gap-px bg-ink lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <div className="min-w-0 bg-white p-5 sm:p-7">
          <p className="font-mono text-xs uppercase tracking-wide text-action">Сборка ТВ-зоны</p>
          <div className="mt-3 flex items-start gap-3">
            <StatusIcon aria-hidden="true" className={`mt-0.5 size-9 shrink-0 ${status.classes.split(" ").at(-1)}`} weight="fill" />
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">{status.label}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{primaryReason(plan)}</p>
            </div>
          </div>

          <h3 className="mt-7 font-mono text-xs uppercase tracking-wide text-muted">Необходимо</h3>
          <div className="mt-2 grid gap-4 border-y border-line py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="break-words font-display text-2xl font-extrabold leading-tight">{model.title}</p>
              <p className="mt-1 break-words font-display text-xl font-bold text-technical">+ {mount.title}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:text-right">
              <div>
                <dt className="font-mono text-[0.68rem] uppercase text-muted">VESA</dt>
                <dd className="mt-1 font-semibold tabular-measure">{model.vesa_width_mm}×{model.vesa_height_mm}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.68rem] uppercase text-muted">Нагрузка с запасом</dt>
                <dd className="mt-1 font-semibold tabular-measure">{formatMeasurement(plan.compatibility?.required_load_kg, "кг")}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap">
            {marketEligible ? (
              <AffiliateLink className="primary-button w-full justify-center sm:w-auto" offer={offer}>
                Открыть на Яндекс Маркете
              </AffiliateLink>
            ) : null}
            {!marketEligible && plan.cables?.status !== "verified" ? (
              <a
                className="primary-button w-full justify-center sm:w-auto"
                href="#kit-cables"
                onClick={() => emitInstallationKitInteraction(window, {
                  action: "cable_check_opened",
                  section: "cables",
                  status: interactionStatus,
                })}
              >
                Перейти к кабельной проверке
              </a>
            ) : null}
            <button className="secondary-button w-full sm:w-auto" onClick={() => {
              emitInstallationKitInteraction(window, {
                action: "print_started",
                section: "print",
                status: interactionStatus,
              });
              window.print();
            }} type="button">
              <Printer aria-hidden="true" />Распечатать
            </button>
          </div>
        </div>

        <div className="bg-paper p-5 sm:p-7">
          <h3 className="font-display text-2xl font-extrabold">Проверить перед покупкой</h3>
          {checks.length ? (
            <>
              <ol className="mt-3">
                {visibleChecks.map((check) => <CheckLink check={check} key={check.id} visible />)}
              </ol>
              {hiddenChecks.length ? (
                <details className="border-t border-line" data-kit-summary-checks-collapsed="true">
                  <summary
                    className="cursor-pointer py-3 text-sm font-semibold text-technical focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                    onClick={(event) => {
                      if (event.currentTarget.parentElement?.open) return;
                      emitInstallationKitInteraction(window, {
                        action: "checks_opened",
                        section: "summary",
                        status: interactionStatus,
                      });
                    }}
                  >
                    Ещё {hiddenChecks.length} {hiddenChecks.length === 1 ? "проверка" : "проверки"}
                  </summary>
                  <ol>{hiddenChecks.map((check) => <CheckLink check={check} key={check.id} />)}</ol>
                </details>
              ) : null}
            </>
          ) : (
            <p className="mt-3 border-l-2 border-verified pl-3 text-sm leading-relaxed text-muted">
              Все семь разделов получили статус «Проверено».
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
