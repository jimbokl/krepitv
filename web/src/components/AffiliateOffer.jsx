import { getAffiliatePresentation } from "../lib/affiliateOffer.mjs";

export default function AffiliateOffer({ offer, children }) {
  const presentation = getAffiliatePresentation(offer);
  if (!presentation) return null;

  function trackClick() {
    window.dispatchEvent(
      new CustomEvent("krepitv:affiliate-click", {
        detail: { offerId: offer.id },
      }),
    );
  }

  return (
    <aside aria-label="Рекламное предложение" data-erid={presentation.erid}>
      <p>
        {presentation.label} · {presentation.advertiserName} · ИНН{" "}
        {presentation.advertiserInn} · erid: {presentation.erid}
      </p>
      {children}
      <a
        href={presentation.href}
        onClick={trackClick}
        rel={presentation.rel}
        target={presentation.target}
      >
        Посмотреть на Яндекс Маркете
      </a>
    </aside>
  );
}
