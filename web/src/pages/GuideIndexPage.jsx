import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";

export function GuideIndexPage({ catalog }) {
  const pages = catalog.seoPages.filter((page) => page.indexable);
  const groups = [
    { label: "Практические инструкции", pages: pages.filter((page) => page.guide) },
    { label: "Калькуляторы, таблицы и подборы", pages: pages.filter((page) => !page.guide) },
  ];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active="/spravochnik/" />
      <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8" data-guide-index="true">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Справочник" }]} />
        <header className="mt-5 border-b-2 border-ink pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">105 полезных материалов</p>
          <h1 className="mt-3 font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92]">Справочник по телевизорам и креплениям</h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted">Инструкции, проверочные таблицы и локальные калькуляторы KREPI TV. Каждый материал ведёт к точной модели, VESA или следующему безопасному шагу.</p>
        </header>
        <div className="grid gap-8 py-8 lg:grid-cols-2">
          {groups.map((group) => (
            <section className="border-t-2 border-ink" key={group.label}>
              <h2 className="py-5 font-display text-3xl font-extrabold">{group.label}</h2>
              <div className="border-b border-line">
                {group.pages.map((page) => (
                  <a className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-3 font-display font-bold transition hover:text-action" data-guide-index-link={page.path} href={page.path} key={page.id}>
                    <span>{page.h1}</span><span aria-hidden="true">→</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
