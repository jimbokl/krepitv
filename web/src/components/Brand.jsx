export function Brand({ compact = false }) {
  const sizeClass = compact
    ? "text-[clamp(1rem,8vw,2.2rem)]"
    : "text-[2.75rem] sm:text-[3.3rem]";

  return (
    <a
      className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-[-0.05em] text-ink"
      href="/"
      aria-label="Крепи ТВ — главная"
    >
      <span className={sizeClass}>
        Крепи
      </span>
      <span className={`${sizeClass} text-action`}>
        ТВ
      </span>
    </a>
  );
}
