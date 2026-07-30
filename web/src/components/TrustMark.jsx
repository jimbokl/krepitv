import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";

export function TrustMark({ compact = false, label = "Данные сверены с производителем" }) {
  const Icon = compact ? CheckCircle : ShieldCheck;
  return (
    <div className="inline-flex items-center gap-3 text-verified">
      <Icon aria-hidden="true" className={compact ? "size-7" : "size-10"} weight="regular" />
      <span className={`${compact ? "text-sm" : "text-base"} font-semibold leading-tight`}>
        {label}
      </span>
    </div>
  );
}

export function formatCheckedDate(value) {
  if (!value) return "Дата не указана";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
