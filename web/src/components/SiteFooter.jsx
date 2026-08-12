import { useEffect, useState } from "react";
import { Brand } from "./Brand.jsx";
import { AffiliateLink } from "./AffiliateOffer.jsx";
import { getAffiliatePresentation } from "../lib/affiliateOffer.mjs";
import { loadFreshAffiliateOffers } from "../lib/catalog.js";

const footerLinks = [
  { href: "/televizor-pishet-net-signala/", label: "Нет сигнала" },
  { href: "/kak-podklyuchit-telefon-k-televizoru/", label: "Телефон → ТВ" },
  { href: "/podbor/", label: "Подбор" },
  { href: "/modeli/", label: "Телевизоры" },
  { href: "/kronshteyny/", label: "Кронштейны" },
  { href: "/razmery-televizora-po-diagonali/", label: "Размеры ТВ" },
  { href: "/televizor-na-stene/", label: "Примерка на стене" },
  { href: "/na-kakoy-vysote-veshat-televizor/", label: "Высота установки" },
  { href: "/rasstoyanie-do-televizora-i-diagonal/", label: "Расстояние и диагональ" },
  { href: "/vesa/", label: "VESA" },
  { href: "/spravochnik/", label: "Справочник" },
  { href: "/o-proekte/", label: "О проекте" },
  { href: "/redaktsiya/", label: "Редакция" },
  { href: "/metodika/", label: "Методика" },
  { href: "/kontakty/", label: "Контакты" },
  { href: "/politika-konfidencialnosti/", label: "Конфиденциальность" },
];

export function selectSitewideAffiliateOffer(catalog) {
  const coverageByMount = new Map();
  for (const edge of catalog?.compatibilityEdges ?? []) {
    if (edge?.fit_status !== "verified-fit" || typeof edge.mount_id !== "string") continue;
    coverageByMount.set(edge.mount_id, (coverageByMount.get(edge.mount_id) ?? 0) + 1);
  }

  const modelOffers = [...(catalog?.modelAffiliateOffers ?? [])]
    .filter((offer) => getAffiliatePresentation(offer))
    .sort((left, right) => (left.rank ?? 99) - (right.rank ?? 99));
  if (modelOffers.length) return modelOffers[0];

  const validOffers = [...(catalog?.affiliateOffers ?? [])]
    .filter((offer) => getAffiliatePresentation(offer));
  if (!coverageByMount.size) return validOffers[0] ?? null;

  return validOffers
    .sort((left, right) =>
      (coverageByMount.get(right.entity_id) ?? 0) - (coverageByMount.get(left.entity_id) ?? 0)
      || left.entity_id.localeCompare(right.entity_id, "ru"),
    )[0] ?? null;
}

export function hasContextualAffiliateOffer(catalog, currentPath) {
  if (typeof currentPath !== "string" || !currentPath.startsWith("/")) return false;
  return [
    ...(catalog?.affiliateOffers ?? []).filter((offer) => offer?.page_path === currentPath),
    ...(catalog?.hubAffiliateOffers ?? []).filter((offer) => offer?.hub_path === currentPath),
    ...(catalog?.modelAffiliateOffers ?? []).filter((offer) => offer?.model_path === currentPath),
  ].some((offer) => getAffiliatePresentation(offer));
}

export function SiteFooter({ catalog, currentPath = "" }) {
  const [standaloneOffers, setStandaloneOffers] = useState([]);
  useEffect(() => {
    if (catalog !== undefined) return undefined;
    let active = true;
    loadFreshAffiliateOffers().then((offers) => {
      if (active) setStandaloneOffers(offers);
    });
    return () => {
      active = false;
    };
  }, [catalog]);
  const sitewideOffer = selectSitewideAffiliateOffer(
    catalog === undefined ? { affiliateOffers: standaloneOffers } : catalog,
  );
  const contextualOfferExists = hasContextualAffiliateOffer(catalog, currentPath);
  return (
    <>
      {!contextualOfferExists ? (
        <aside
          aria-label="Проверенное предложение Яндекс Маркета"
          className="border-t-2 border-ink bg-white text-ink"
          data-affiliate-global-slot="true"
        >
          <div className="mx-auto grid min-w-0 max-w-[1440px] gap-4 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] uppercase leading-relaxed text-action">
                После технической проверки
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
                Сначала проверьте VESA, диагональ и нагрузку. Затем можно открыть актуальную карточку проверенного кронштейна.
              </p>
            </div>
            {sitewideOffer ? (
              <div data-affiliate-global-link="true">
                <AffiliateLink
                  className="primary-button w-full justify-center lg:w-auto"
                  offer={sitewideOffer}
                >
                  Открыть кронштейн на Яндекс Маркете
                </AffiliateLink>
              </div>
            ) : (
              <p className="text-sm text-muted" data-affiliate-global-unavailable="true">
                Актуальное предложение проверяется.
              </p>
            )}
          </div>
        </aside>
      ) : null}
      <footer className="border-t-2 border-ink bg-paper text-ink">
      <div className="mx-auto grid min-w-0 max-w-[1440px] gap-6 px-5 py-7 [overflow-wrap:anywhere] sm:px-8 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,2fr)] lg:items-end">
        <div className="min-w-0">
          <Brand compact />
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Независимый справочный сервис. Не магазин и не представитель производителей.
          </p>
        </div>
        <nav
          className="flex min-w-0 flex-wrap gap-x-6 gap-y-3 font-display text-sm font-bold uppercase lg:justify-end"
          aria-label="Инструменты и информация о сервисе"
        >
          {footerLinks.map((link) => (
            <a
              className="inline-flex min-h-11 max-w-full items-center rounded-sm underline decoration-line underline-offset-4 [overflow-wrap:anywhere] transition hover:text-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 sm:min-h-0"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      </footer>
    </>
  );
}
