import { ArrowRight, BracketsSquare, TelevisionSimple } from "@phosphor-icons/react";
import { CatalogBrandGroups } from "../components/CatalogBrandGroups.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { formatNumber } from "../components/ModelFacts.jsx";
import { modelHref, mountHref } from "../lib/catalog.js";

const mountBrandHubs = [
  { href: "/kronshteyny-onkron/", label: "ONKRON" },
  { href: "/kronshteyny-kromax/", label: "KROMAX" },
  { href: "/kronshteyny-holder/", label: "Holder" },
  { href: "/kronshteyny-itechmount/", label: "iTECHmount" },
];

export function CatalogIndexPage({ catalog, kind }) {
  const models = kind === "models";
  const items = models ? catalog.models : catalog.mounts;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active={models ? "/modeli/" : "/kronshteyny/"} />
      <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
          Проверенная база
        </p>
        <h1 className="mt-3 font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
          {models ? "Модели телевизоров" : "Кронштейны для телевизоров"}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted">
          {models
            ? "Точные модели с подтверждёнными VESA, массой без подставки и двусторонним списком кронштейнов."
            : "Точные изделия с явными VESA, нагрузкой, механизмом и списком подходящих популярных телевизоров."}
        </p>

        {!models ? (
          <nav className="mt-7 flex flex-wrap items-center gap-2" aria-label="Сравнение кронштейнов по бренду">
            <span className="mr-2 font-mono text-xs uppercase text-muted">Сравнить бренд</span>
            {mountBrandHubs.map((hub) => (
              <a
                className="border border-ink bg-white px-3 py-2 font-display text-sm font-bold transition hover:border-action hover:text-action"
                href={hub.href}
                key={hub.href}
              >
                {hub.label}
              </a>
            ))}
          </nav>
        ) : null}

        <nav className="mt-9" aria-label={models ? "Модели телевизоров" : "Кронштейны"}>
          <CatalogBrandGroups
            countLabel={models ? "Моделей" : "Кронштейнов"}
            items={items}
            listClassName="border-b border-line"
            renderItem={(item) => (
            <a
              className="group grid gap-4 border-t border-line py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
              href={models ? modelHref(item) : mountHref(item)}
              key={item.id}
            >
              {models ? (
                <TelevisionSimple aria-hidden="true" className="size-9 text-action" />
              ) : (
                <BracketsSquare aria-hidden="true" className="size-9 text-action" />
              )}
              <span>
                <strong className="font-display text-2xl font-extrabold">{item.title}</strong>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {models
                    ? `VESA ${item.vesa_width_mm}×${item.vesa_height_mm} мм · ${formatNumber(item.diagonal_inches)}″ · ${formatNumber(item.weight_kg)} кг без подставки`
                    : `${mechanismLabel(item.mechanism)} · до ${formatNumber(item.max_load_kg)} кг · VESA ${item.vesa.join(" · ").replaceAll("x", "×")}`}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-action group-hover:underline">
                Открыть <ArrowRight aria-hidden="true" />
              </span>
            </a>
            )}
          />
        </nav>
      </article>
    </main>
  );
}

function mechanismLabel(value) {
  if (value === "fixed") return "Фиксированный";
  if (value === "tilt") return "Наклонный";
  if (value === "full-motion") return "Поворотный";
  return "Механизм не указан";
}
