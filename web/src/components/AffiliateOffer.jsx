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
      data-clid={presentation.clid}
      data-erid={presentation.erid ?? undefined}
      href={presentation.href}
      onClick={() => emitAffiliateClick(window, offer)}
      rel={presentation.rel}
      target={presentation.target}
    >
      {children}
    </a>
  );
}

export default function AffiliateOffer({ offer, children }) {
  const [imageFailed, setImageFailed] = useState(false);
  const presentation = getAffiliatePresentation(offer);
  if (!presentation) return null;

  return (
    <aside
      aria-label={
        presentation.mode === "advertising"
          ? "Рекламное предложение"
          : "Партнёрское предложение"
      }
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
        <p className="font-mono text-[0.68rem] uppercase leading-relaxed text-muted">
          {presentation.notice}
        </p>
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
