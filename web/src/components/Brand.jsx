export function Brand({ compact = false }) {
  return (
    <a
      className="inline-flex shrink-0 items-baseline gap-1 font-display font-extrabold uppercase leading-none tracking-[-0.05em] text-ink"
      href="/"
      aria-label="Крепи ТВ — главная"
    >
      <span className={compact ? "text-[2.2rem]" : "text-[2.75rem] sm:text-[3.3rem]"}>
        Крепи
      </span>
      <span className={`${compact ? "text-[2.2rem]" : "text-[2.75rem] sm:text-[3.3rem]"} text-action`}>
        ТВ
      </span>
    </a>
  );
}
