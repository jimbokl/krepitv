import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  LinkSimple,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { modelHref } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import {
  classifyVesaLookupSelection,
  findVesaModel,
  verifiedMountCountFor,
  vesaConflictFor,
} from "../lib/vesaModelLookup.mjs";
import { CatalogBrandGroups } from "./CatalogBrandGroups.jsx";
import { ModelSearch } from "./ModelSearch.jsx";
import { formatCheckedDate } from "./TrustMark.jsx";

export function TvVesaCatalog({ compatibilityEdges, models, search }) {
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const brandCount = useMemo(
    () => new Set(models.map((model) => model.brand)).size,
    [models],
  );
  const vesaPairCount = useMemo(
    () => new Set(
      models.map((model) => `${model.vesa_width_mm}x${model.vesa_height_mm}`),
    ).size,
    [models],
  );

  function selectModel(item) {
    const { model, status } = classifyVesaLookupSelection(models, item);
    setSelectedModel(model);
    if (!model) return;
    emitResultCompleted(window, {
      toolId: "vesa_model_lookup",
      resultType: status === "source-conflict" ? "vesa_conflict" : "vesa_found",
      resultCount: verifiedMountCountFor(model, compatibilityEdges),
    });
  }

  return (
    <section
      aria-labelledby="vesa-model-catalog-title"
      className="border-y-2 border-ink py-8"
      data-searchable-model-count={models.length}
      data-vesa-model-catalog="true"
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(26rem,1.15fr)] lg:items-end">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            Бесплатный поиск без регистрации
          </p>
          <h2 className="mt-2 font-display text-4xl font-extrabold" id="vesa-model-catalog-title">
            Найдите VESA по модели телевизора
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Введите полный код с шильдика. Покажем расстояние между отверстиями,
            официальный источник и число кронштейнов, прошедших точную проверку.
          </p>
        </div>
        <div className="min-w-0">
          <ModelSearch
            buttonLabel="Показать VESA"
            compact
            emptyMessage="Модели пока нет. Не переносите VESA с похожей серии или одной диагонали."
            onChange={setQuery}
            onSelect={selectModel}
            placeholder="Например, TCL 55P6K"
            resultLabel={(item) => {
              const model = findVesaModel(models, item);
              return model ? `VESA ${model.vesa_width_mm}×${model.vesa_height_mm}` : "Модель";
            }}
            search={search}
            value={query}
          />
        </div>
      </div>

      <dl className="mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-3">
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Точных моделей</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{models.length}</dd>
        </div>
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Брендов</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{brandCount}</dd>
        </div>
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Схем VESA</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{vesaPairCount}</dd>
        </div>
      </dl>

      {selectedModel ? (
        <VesaLookupResult
          compatibilityEdges={compatibilityEdges}
          model={selectedModel}
        />
      ) : (
        <div className="mt-7 flex items-start gap-3 border-l-2 border-action pl-4">
          <Ruler aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-action" />
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            VESA записывается как горизонталь × вертикаль в миллиметрах. Диагональ
            экрана сама по себе не определяет расположение отверстий.
          </p>
        </div>
      )}

      <p className="mt-5 text-sm leading-relaxed text-muted">
        Открытый датасет «Размеры VESA популярных в России телевизоров», версия
        1.0.0: {" "}
        <a
          className="font-semibold text-technical underline underline-offset-4"
          href="https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-sizes.csv"
          rel="noreferrer"
          target="_blank"
        >
          скачать CSV
        </a>{" "}
        или {" "}
        <a
          className="font-semibold text-technical underline underline-offset-4"
          href="https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-sizes.json"
          rel="noreferrer"
          target="_blank"
        >
          JSON
        </a>. В файлах 132 точные модели, размеры VESA и официальные источники; {" "}
        <a
          className="font-semibold text-technical underline underline-offset-4"
          href="https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE"
          rel="noreferrer"
          target="_blank"
        >
          лицензия MIT
        </a>.
      </p>

      <div className="mt-9">
        <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <p className="font-mono text-xs uppercase text-muted">Официальные характеристики</p>
            <h3 className="mt-1 font-display text-3xl font-extrabold">
              Таблица VESA телевизоров
            </h3>
          </div>
          <span className="hidden font-mono text-xs uppercase text-muted sm:block">
            Модели сгруппированы по брендам
          </span>
        </div>
        <CatalogBrandGroups
          countLabel="Моделей"
          getBrand={(model) => model.brand}
          items={models}
          listClassName="border-t border-line"
          renderItem={(model) => {
            const conflict = vesaConflictFor(model);
            const matchCount = verifiedMountCountFor(model, compatibilityEdges);
            return (
              <article
                className="grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] lg:items-start"
                key={model.id}
              >
                <div>
                  <a
                    className="font-display text-2xl font-extrabold hover:text-action"
                    href={modelHref(model)}
                  >
                    {model.title}
                  </a>
                  <p className="mt-2 font-display text-2xl font-extrabold text-action">
                    VESA {model.vesa_width_mm}×{model.vesa_height_mm} мм
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {model.diagonal_inches}″ · {model.weight_kg} кг без подставки · {conflict
                      ? "автоподбор остановлен"
                      : `${matchCount} проверенных кронштейнов`}
                  </p>
                  {conflict ? (
                    <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-relaxed text-action">
                      <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                      Источники расходятся: {conflict.catalog_value} / {conflict.manual_value}.
                      Перед монтажом нужен ручной замер.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 lg:justify-items-end lg:text-right">
                  <a
                    className="inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4"
                    href={model.source_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Официальный источник <LinkSimple aria-hidden="true" />
                  </a>
                  <span className="font-mono text-xs uppercase text-muted">
                    Проверено {formatCheckedDate(model.checked_at)}
                  </span>
                  <a
                    className="inline-flex items-center gap-2 font-semibold text-action underline underline-offset-4"
                    href={modelHref(model)}
                  >
                    Совместимые кронштейны <ArrowRight aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          }}
        />
      </div>
    </section>
  );
}

function VesaLookupResult({ compatibilityEdges, model }) {
  const conflict = vesaConflictFor(model);
  const matchCount = verifiedMountCountFor(model, compatibilityEdges);
  return (
    <article
      className="mt-7 border-2 border-ink bg-white p-5 sm:p-6"
      data-selected-vesa-model={model.id}
    >
      <div className="flex items-start gap-3">
        {conflict ? (
          <WarningCircle aria-hidden="true" className="mt-1 size-8 shrink-0 text-action" />
        ) : (
          <CheckCircle aria-hidden="true" className="mt-1 size-8 shrink-0 text-verified" weight="fill" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            {conflict ? "Расхождение официальных источников" : "Модель найдена"}
          </p>
          <h3 className="mt-2 font-display text-3xl font-extrabold">{model.title}</h3>
          {conflict ? (
            <p className="mt-3 font-display text-3xl font-extrabold text-action sm:text-4xl">
              {conflict.catalog_value} / {conflict.manual_value}
            </p>
          ) : (
            <p className="mt-3 font-display text-4xl font-extrabold text-action sm:text-5xl">
              VESA {model.vesa_width_mm}×{model.vesa_height_mm} мм
            </p>
          )}
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            {conflict
              ? `${conflict.note} До ручного замера не выбирайте кронштейн по одному из значений.`
              : `${model.diagonal_inches}″ · ${model.weight_kg} кг без подставки. В каталоге ${matchCount} кронштейнов проходят точную VESA, диапазон диагонали и запас нагрузки.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {conflict ? (
              <a className="secondary-button" href={modelHref(model)}>
                Открыть паспорт модели <ArrowRight aria-hidden="true" />
              </a>
            ) : (
              <a className="primary-button" href={modelHref(model)}>
                Проверить кронштейны <ArrowRight aria-hidden="true" />
              </a>
            )}
            <a
              className="inline-flex items-center gap-2 font-semibold text-technical underline underline-offset-4"
              href={model.source_url}
              rel="noreferrer"
              target="_blank"
            >
              Официальные характеристики <LinkSimple aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
