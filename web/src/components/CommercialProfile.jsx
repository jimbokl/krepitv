export function CommercialProfile({ profile }) {
  if (!profile) return null;

  const marker = `${profile.entity_kind}:${profile.entity_id}`;
  return (
    <section
      aria-labelledby={`commercial-profile-${profile.entity_kind}-${profile.entity_id}`}
      className="grid gap-6 border-b-2 border-ink py-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:gap-10"
      data-commercial-profile={marker}
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
          {profile.kicker}
        </p>
        <h2
          className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl"
          id={`commercial-profile-${profile.entity_kind}-${profile.entity_id}`}
        >
          {profile.heading}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
          {profile.answer}
        </p>
      </div>

      <div aria-label="Частые вопросы" className="border-y border-ink">
        {profile.faq.map((item) => (
          <details className="group border-t border-line first:border-t-0" key={item.question}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-lg font-bold marker:content-none">
              <span>{item.question}</span>
              <span aria-hidden="true" className="font-mono text-xl leading-none group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-4 pr-8 text-sm leading-relaxed text-muted sm:text-base">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
