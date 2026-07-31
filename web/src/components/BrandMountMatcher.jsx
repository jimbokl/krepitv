import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Info, WarningCircle } from "@phosphor-icons/react";
import { useCompatibility } from "../hooks/useCompatibility.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { ModelSearch } from "./ModelSearch.jsx";
import { CompatibilityResult } from "../pages/GuidedSelectionPage.jsx";

export function BrandMountMatcher({
  affiliateOffers = [],
  brand,
  models,
  mounts,
  search,
}) {
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectionId, setSelectionId] = useState(0);
  const emittedSelectionRef = useRef(0);
  const brandMounts = useMemo(
    () => selectBrandMounts(mounts, brand),
    [brand, mounts],
  );
  const compatibility = useCompatibility(selectedModel, brandMounts, "any");
  const compatible = useMemo(
    () => compatibility.matches.filter((item) => item.compatible),
    [compatibility.matches],
  );
  const incompatible = useMemo(
    () => compatibility.matches.filter((item) => !item.compatible),
    [compatibility.matches],
  );
  const availableOfferMountIds = useMemo(
    () => new Set(
      affiliateOffers
        .filter((offer) => offer?.entity_kind === "mount")
        .map((offer) => offer.entity_id),
    ),
    [affiliateOffers],
  );

  useEffect(() => {
    if (
      !selectedModel ||
      selectionId === 0 ||
      compatibility.status !== "ready" ||
      emittedSelectionRef.current === selectionId
    ) {
      return;
    }

    emittedSelectionRef.current = selectionId;
    emitResultCompleted(window, {
      toolId: "brand_mount_match",
      resultType: compatible.length ? "compatible_matches" : "no_compatible_matches",
      resultCount: compatible.length,
    });
  }, [compatibility.status, compatible.length, selectedModel, selectionId]);

  function selectModel(item) {
    if (!item) {
      setSelectedModel(null);
      return;
    }
    const model = models.find((candidate) => candidate.id === item.id) ?? null;
    setSelectedModel(model);
    if (model) setSelectionId((current) => current + 1);
  }

  return (
    <section
      aria-labelledby="brand-mount-matcher-title"
      className="border-y-2 border-ink py-8"
      data-brand-mount-matcher={brand}
    >
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
        Подбор внутри бренда
      </p>
      <h2 className="mt-2 max-w-4xl font-display text-4xl font-extrabold leading-tight" id="brand-mount-matcher-title">
        Какие {brand} подходят к вашему телевизору
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        Введите полный код телевизора. Моделей {brand} в каталоге: {brandMounts.length}. Локальный Rust/WASM‑расчёт проверит их по точной паре VESA, нагрузке с запасом 25% и паспортному диапазону диагонали.
      </p>

      <div className="relative z-20 mt-6">
        <ModelSearch
          buttonLabel={`Проверить ${brand}`}
          compact
          emptyMessage="Этой модели пока нет в проверенной базе телевизоров."
          onChange={setQuery}
          onSelect={selectModel}
          placeholder="Например, TCL 55P6K"
          search={search}
          value={query}
        />
      </div>

      <p className="mt-4 flex max-w-3xl items-start gap-2 text-sm leading-relaxed text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-technical" />
        Похожие артикулы не объединяются: например, TM5 и TM5‑BW проверяются как разные изделия.
        Результат сначала ведёт в техническую карточку кронштейна с источником, а не сразу на Маркет.
      </p>

      {selectedModel ? (
        <div className="mt-7 border-t border-line pt-6" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase text-muted">Проверка для телевизора</p>
              <p className="mt-1 font-display text-3xl font-extrabold">{selectedModel.title}</p>
            </div>
            <a className="inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4" href={`/modeli/${selectedModel.id}/`}>
              Паспорт телевизора <ArrowRight aria-hidden="true" />
            </a>
          </div>

          {compatibility.status === "loading" ? (
            <p className="mt-5 text-muted">Проверяем каталог {brand}…</p>
          ) : null}
          {compatibility.status === "error" ? (
            <p className="mt-5 border border-danger p-4 text-danger">{compatibility.error}</p>
          ) : null}
          {compatibility.status === "ready" ? (
            <>
              <CompatibilityResult
                availableOfferMountIds={availableOfferMountIds}
                compatibility={compatibility}
                matches={compatible}
                model={selectedModel}
              />
              {incompatible.length ? (
                <details className="group mt-5 border-y border-line" data-brand-incompatible="collapsed">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                    Почему не подошли: {incompatible.length}
                    <span aria-hidden="true" className="text-2xl text-action transition group-open:rotate-45">+</span>
                  </summary>
                  <div className="border-t border-line pb-2">
                    {incompatible.map((match) => (
                      <article className="border-b border-line py-4 last:border-b-0" key={match.mount.id}>
                        <h3 className="font-display text-xl font-bold">
                          <a className="underline decoration-action decoration-2 underline-offset-4" href={`/kronshteyny/${match.mount.id}/`}>
                            {match.mount.title}
                          </a>
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted">
                          {match.warnings.map((warning) => (
                            <li className="flex gap-2" key={warning}>
                              <WarningCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-action" />
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function selectBrandMounts(mounts, brand) {
  const normalizedBrand = String(brand ?? "").trim().toLocaleLowerCase("ru-RU");
  if (!normalizedBrand) return [];
  return (Array.isArray(mounts) ? mounts : []).filter(
    (mount) => String(mount?.brand ?? "").trim().toLocaleLowerCase("ru-RU") === normalizedBrand,
  );
}
