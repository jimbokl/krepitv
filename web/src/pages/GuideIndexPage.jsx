import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { EditorialScene } from "../components/EditorialScene.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";

export function GuideIndexPage({ catalog }) {
  const pages = catalog.seoPages.filter((page) => page.indexable);
  const groups = [
    { label: "Практические инструкции", pages: pages.filter((page) => page.guide && !page.section) },
    { label: "Калькуляторы, таблицы и подборы", pages: pages.filter((page) => !page.guide && !page.section) },
  ];
  const sections = [...new Set(pages.map((page) => page.section).filter(Boolean))];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active="/spravochnik/" />
      <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8" data-guide-index="true">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Справочник" }]} />
        <header className="technical-editorial-hero mt-5 border-b-2 border-ink pb-8">
          <div className="technical-editorial-hero__copy">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">{pages.length} полезных материалов</p>
          <h1 className="mt-3 font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92]">Справочник по телевизорам и креплениям</h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted">Инструкции, проверочные таблицы и локальные калькуляторы KREPI TV. Каждый материал ведёт к точной модели, VESA или следующему безопасному шагу.</p>
          </div>
          <EditorialScene
            alt="Человек проверяет параметры телевизора перед установкой"
            caption="Фото иллюстрирует подготовку. Откройте нужный инструмент или инструкцию ниже и проверьте данные именно своей модели."
            src="/assets/images/home-step-model.webp"
          />
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
        <section className="border-t-2 border-ink py-8" aria-label="Смежные задачи по телевизору">
          <h2 className="font-display text-3xl font-extrabold">Выберите задачу</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">Питание, свет, звук, эфир и устройства рядом с телевизором. В каждом материале — схема, быстрый помощник и таблица проверок.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {sections.map((section) => {
              const sectionPages = pages.filter((page) => page.section === section);
              return <details className="border-2 border-ink bg-white p-5" key={section}>
                <summary className="cursor-pointer font-display text-xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">{section} <span className="font-mono text-sm font-normal text-muted">{sectionPages.length}</span></summary>
                <nav aria-label={section} className="mt-4 grid border-b border-line">
                  {sectionPages.map((page) => <a className="border-t border-line py-3 font-semibold hover:text-action" data-guide-index-link={page.path} href={page.path} key={page.id}>{page.h1} <span aria-hidden="true">→</span></a>)}
                </nav>
              </details>;
            })}
          </div>
        </section>
      </article>
    </main>
  );
}
