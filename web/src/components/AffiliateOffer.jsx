import { useState } from "react";
import { emitAffiliateClick } from "../lib/affiliateClick.mjs";
import { getAffiliatePresentation } from "../lib/affiliateOffer.mjs";

export function AffiliateLink({ children, className = "primary-button", offer }) {
  const presentation = getAffiliatePresentation(offer);
  if (!presentation) return null;

  return (
    <a
      className={className}
      data-affiliate-mode={presentation.mode}
      data-affiliate-placement-id={offer.placement_id ?? undefined}
      data-affiliate-rank={offer.rank ?? undefined}
      data-clid={presentation.clid}
      data-erid={presentation.erid ?? undefined}
      href={presentation.href}
      onAuxClick={(event) => {
        if (event.button === 1) emitAffiliateClick(window, offer);
      }}
      onClick={() => emitAffiliateClick(window, offer)}
      rel={presentation.rel}
      target={presentation.target}
    >
      {children}
    </a>
  );
}

export default function AffiliateOffer({ offer, children, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const presentation = getAffiliatePresentation(offer);
  if (!presentation) return null;

  const ariaLabel = presentation.mode === "advertising"
    ? "Рекламное предложение"
    : "Партнёрское предложение";

  if (compact) {
    return (
      <aside
        aria-label={ariaLabel}
        className="grid gap-4 border-2 border-ink bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        data-affiliate-compact="true"
        data-affiliate-mode={presentation.mode}
        data-affiliate-placement-id={offer.placement_id ?? undefined}
        data-affiliate-rank={offer.rank ?? undefined}
        data-clid={presentation.clid}
        data-erid={presentation.erid ?? undefined}
      >
        <div className="min-w-0">
          {presentation.notice ? (
            <p className="font-mono text-[0.68rem] uppercase leading-relaxed text-muted">
              {presentation.notice}
            </p>
          ) : null}
          <h3 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
            {presentation.productTitle}
          </h3>
          {children}
        </div>
        <AffiliateLink
          className="primary-button w-full justify-center sm:w-auto"
          offer={offer}
        >
          Открыть на Яндекс Маркете
        </AffiliateLink>
      </aside>
    );
  }

  return (
    <aside
      aria-label={ariaLabel}
      className="grid gap-5 border-2 border-ink bg-white p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
      data-affiliate-mode={presentation.mode}
      data-clid={presentation.clid}
      data-erid={presentation.erid ?? undefined}
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
        {presentation.notice ? (
          <p className="font-mono text-[0.68rem] uppercase leading-relaxed text-muted">
            {presentation.notice}
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-2xl font-extrabold">
          {presentation.productTitle}
        </h2>
        {children}
        <AffiliateLink className="primary-button mt-4" offer={offer}>
          Проверить цену на Яндекс Маркете
        </AffiliateLink>
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
