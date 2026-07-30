import { useState } from "react";
import { getAffiliatePresentation } from "../lib/affiliateOffer.mjs";

export default function AffiliateOffer({ offer, children }) {
  const [imageFailed, setImageFailed] = useState(false);
  const presentation = getAffiliatePresentation(offer);
  if (!presentation) return null;

  function trackClick() {
    window.dispatchEvent(
      new CustomEvent("krepitv:affiliate-click", {
        detail: {
          entityId: offer.entity_id,
          offerId: offer.id,
          pagePath: offer.page_path,
          vid: offer.vid,
        },
      }),
    );
  }

  return (
    <aside
      aria-label="Рекламное предложение"
      className="grid gap-5 border-2 border-ink bg-white p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
      data-erid={presentation.erid}
    >
      {imageFailed ? (
        <p className="text-sm leading-relaxed text-muted">
          Изображение Маркета временно недоступно.
        </p>
      ) : (
        <img
          alt={presentation.productTitle}
          className="aspect-square w-full object-contain"
          height="300"
          loading="lazy"
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
          src={presentation.productPhoto}
          width="300"
        />
      )}
      <div>
        <p className="font-mono text-[0.68rem] uppercase leading-relaxed text-muted">
          {presentation.label} · {presentation.advertiserName} · ИНН{" "}
          {presentation.advertiserInn} · erid: {presentation.erid}
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          {presentation.productTitle}
        </h2>
        {children}
        <a
          className="primary-button mt-4"
          href={presentation.href}
          onClick={trackClick}
          rel={presentation.rel}
          target={presentation.target}
        >
          Проверить цену на Яндекс Маркете
        </a>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Карточка получена через API Маркета. Цена и наличие уточняются на стороне Маркета с учётом региона.{" "}
          <a
            className="underline underline-offset-2"
            href="https://market.yandex.ru/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Данные сервиса Яндекс Маркет
          </a>
          .
        </p>
      </div>
    </aside>
  );
}
