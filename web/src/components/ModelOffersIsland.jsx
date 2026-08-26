import AffiliateOffer from "./AffiliateOffer.jsx";

export function ModelOffersIsland({ offers }) {
  return (
    <section className="border-b-2 border-ink py-8" aria-label="Проверка предложений Яндекс Маркета">
      <h2 className="font-display text-3xl font-extrabold">Сейчас доступны на Маркете</h2>
      <p className="mt-3 max-w-3xl text-muted">
        Показаны только свежие точные карточки кронштейнов, уже прошедших проверку совместимости с этой моделью.
      </p>
      <div className="mt-5 grid gap-5">
        {offers.slice(0, 3).map((offer) => (
          <AffiliateOffer
            compact
            detailsHref={offer.page_path}
            key={offer.id}
            offer={offer}
          />
        ))}
      </div>
    </section>
  );
}
