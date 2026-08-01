import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { useEffect } from "react";
import { SiteHeader } from "../components/SiteHeader.jsx";

export function TrustPage({ page }) {
  usePageMetadata(page);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active={page.path} />
      <article className="mx-auto max-w-[1440px] px-5 pb-16 pt-6 sm:px-8">
        <nav className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted" aria-label="Навигационная цепочка">
          <a className="hover:text-action" href="/">Главная</a>
          <span aria-hidden="true">/</span>
          <span>{page.h1}</span>
        </nav>

        <header className="mt-5 border-b-2 border-ink pb-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">{page.kicker}</p>
          <h1 className="mt-3 max-w-[1180px] break-words font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            {page.h1}
          </h1>
          <p className="mt-6 max-w-[1000px] text-lg leading-relaxed text-muted sm:text-xl">{page.lead}</p>
          <p className="mt-5 font-mono text-xs text-muted">Актуально на {page.updated_at}</p>
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="max-w-4xl space-y-10">
            {page.sections.map((section) => (
              <section className="border-b border-line pb-9 last:border-b-0" key={section.heading}>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{section.heading}</h2>
                <div className="mt-5 space-y-4 text-base leading-relaxed text-muted sm:text-lg">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets.length > 0 && (
                    <ul className="space-y-3 border-l-2 border-action pl-5 text-ink">
                      {section.bullets.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <aside className="border border-line bg-white p-6 lg:sticky lg:top-6" aria-labelledby="trust-related-title">
            <ShieldCheck aria-hidden="true" className="size-8 text-action" />
            <h2 className="mt-4 font-display text-2xl font-extrabold" id="trust-related-title">Полезные разделы</h2>
            <nav className="mt-4 grid" aria-label="Связанные разделы">
              {page.related_links.map((link) => (
                <a
                  className="flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 font-display font-bold transition first:border-t-0 hover:text-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
                </a>
              ))}
            </nav>
          </aside>
        </div>
      </article>
    </main>
  );
}

function usePageMetadata(page) {
  useEffect(() => {
    document.title = page.title;
    setMeta("description", page.description);
    setMeta("og:title", page.title, "property");
    setMeta("og:description", page.description, "property");
    setMeta("og:url", `https://krepitv.ru${page.path}`, "property");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `https://krepitv.ru${page.path}`;
  }, [page]);
}

function setMeta(name, content, attribute = "name") {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.append(element);
  }
  element.setAttribute("content", content);
}
