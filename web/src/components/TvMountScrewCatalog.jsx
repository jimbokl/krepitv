import { useMemo, useState } from "react";
import {
  ArrowRight,
  LinkSimple,
  ShieldCheck,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react";
import { modelHref } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";
import { CatalogBrandGroups } from "./CatalogBrandGroups.jsx";
import { ModelSearch } from "./ModelSearch.jsx";
import { formatCheckedDate } from "./TrustMark.jsx";
import { screwMeasurement, WallMountScrews } from "./WallMountScrews.jsx";

function screwSummary(hardware) {
  return hardware.groups
    .map((group) => {
      const prefix = hardware.groups.length > 1 ? `${group.location}: ` : "";
      return `${prefix}${group.quantity} шт. · ${screwMeasurement(group)}`;
    })
    .join("; ");
}

function modelBySearchItem(models, item) {
  if (!item) return null;
  return models.find((model) => model.id === item.id) ?? null;
}

export function classifyScrewLookupSelection(models, item) {
  const model = modelBySearchItem(models, item);
  if (!model) return { model: null, status: "unknown" };
  return {
    model,
    status: model.wall_mount_screws?.groups?.length
      ? "verified-passport"
      : "known-without-passport",
  };
}

export function TvMountScrewCatalog({ models, search }) {
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const eligibleModels = useMemo(
    () => models.filter((model) => model.wall_mount_screws?.groups?.length),
    [models],
  );
  const eligibleIds = useMemo(
    () => new Set(eligibleModels.map((model) => model.id)),
    [eligibleModels],
  );
  const brands = useMemo(
    () => new Set(eligibleModels.map((model) => model.brand)).size,
    [eligibleModels],
  );
  const threads = useMemo(
    () => [...new Set(
      eligibleModels.flatMap((model) => (
        model.wall_mount_screws.groups.map((group) => group.thread)
      )),
    )].sort().join(" · "),
    [eligibleModels],
  );

  function selectModel(item) {
    const { model, status } = classifyScrewLookupSelection(models, item);
    setSelectedModel(model);
    if (!model || status !== "verified-passport") return;
    emitResultCompleted(window, {
      toolId: "screw_lookup",
      resultType: "mount_screws_found",
      resultCount: model.wall_mount_screws.groups.length,
    });
  }

  return (
    <section
      aria-labelledby="screw-catalog-title"
      className="border-y-2 border-ink py-8"
      data-screw-catalog="true"
      data-searchable-model-count={models.length}
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(26rem,1.15fr)] lg:items-end">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            Бесплатная проверка без регистрации
          </p>
          <h2 className="mt-2 font-display text-4xl font-extrabold" id="screw-catalog-title">
            Найдите точную модель телевизора
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Покажем только то, что удалось подтвердить официальным руководством:
            резьбу, количество, длину или допустимую глубину и обязательные вставки.
          </p>
          <p className="mt-3 max-w-2xl border-l-2 border-action pl-4 text-sm font-semibold leading-relaxed">
            Поиск относится к винтам между корпусом телевизора и VESA-пластиной.
            Это не анкеры для стены и не винты для ножек.
          </p>
        </div>
        <div className="min-w-0">
          <ModelSearch
            buttonLabel="Проверить модель"
            compact
            emptyMessage="Модели пока нет. Проверьте полный код на шильдике: винты по одной диагонали не определяем."
            onChange={setQuery}
            onSelect={selectModel}
            placeholder="Например, Samsung QE43Q7FAAUXRU"
            resultLabel={(item) => eligibleIds.has(item.id) ? "Паспорт винтов" : "Модель известна"}
            search={search}
            value={query}
          />
        </div>
      </div>

      <dl className="mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Моделей в поиске</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{models.length}</dd>
        </div>
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Моделей с паспортом</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{eligibleModels.length}</dd>
        </div>
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Брендов</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{brands}</dd>
        </div>
        <div className="bg-paper p-4">
          <dt className="font-mono text-xs uppercase text-muted">Подтверждённая резьба</dt>
          <dd className="mt-1 font-display text-3xl font-extrabold">{threads}</dd>
        </div>
      </dl>

      {selectedModel?.wall_mount_screws?.groups?.length ? (
        <div className="mt-7" data-selected-screw-model={selectedModel.id}>
          <WallMountScrews
            key={selectedModel.id}
            model={selectedModel}
            showCatalogLink={false}
            showLengthCalculator
          />
          <a
            className="primary-button mt-4"
            href={modelHref(selectedModel)}
          >
            Подобрать кронштейны для {selectedModel.title}
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      ) : selectedModel ? (
        <div
          className="mt-7 border-2 border-ink bg-white p-5"
          data-known-model-without-screw-passport={selectedModel.id}
        >
          <div className="flex items-start gap-3">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-action" />
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
                Модель найдена · паспорт винтов ещё не подтверждён
              </p>
              <h3 className="mt-2 font-display text-3xl font-extrabold">
                {selectedModel.title}
              </h3>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                Для модели подтверждён VESA {selectedModel.vesa_width_mm}×{selectedModel.vesa_height_mm} мм,
                но одного VESA недостаточно, чтобы безопасно назвать M6/M8 и длину. Мы не переносим
                винты с похожей серии.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a className="primary-button" href={modelHref(selectedModel)}>
                  Карточка модели и кронштейны <ArrowRight aria-hidden="true" />
                </a>
                <a
                  className="inline-flex items-center gap-2 font-semibold text-technical underline underline-offset-4"
                  href={selectedModel.source_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Официальные характеристики <LinkSimple aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-7 flex items-start gap-3 border-l-2 border-action pl-4">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-verified" />
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            Если точной модели нет в списке, сервис не переносит данные с похожей
            диагонали или серии. Это защищает от неверной длины винта и повреждения корпуса.
          </p>
        </div>
      )}

      <p className="mt-5 text-sm leading-relaxed text-muted">
        Открытый датасет «Винты VESA для популярных в России моделей телевизоров»,
        версия 1.0.0: {" "}
        <a
          className="font-semibold text-technical underline underline-offset-4"
          href="https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-screws.csv"
          rel="noreferrer"
          target="_blank"
        >
          скачать CSV
        </a>{" "}
        или {" "}
        <a
          className="font-semibold text-technical underline underline-offset-4"
          href="https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-screws.json"
          rel="noreferrer"
          target="_blank"
        >
          JSON
        </a>. В файлах 26 точных моделей, паспортные размеры и официальные
        источники; {" "}
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
            <p className="font-mono text-xs uppercase text-muted">Официальные паспорта</p>
            <h3 className="mt-1 font-display text-3xl font-extrabold">
              Все проверенные модели
            </h3>
          </div>
          <span className="hidden font-mono text-xs uppercase text-muted sm:block">
            Списки раскрываются по брендам
          </span>
        </div>
        <CatalogBrandGroups
          countLabel="Моделей"
          getBrand={(model) => model.brand}
          items={eligibleModels}
          listClassName="border-t border-line"
          renderItem={(model) => {
            const hardware = model.wall_mount_screws;
            return (
              <article
                className="grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] lg:items-start"
                key={model.id}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <Wrench aria-hidden="true" className="mt-1 size-6 shrink-0 text-action" />
                    <div>
                      <a
                        className="font-display text-2xl font-extrabold hover:text-action"
                        href={modelHref(model)}
                      >
                        {model.title}
                      </a>
                      <p className="mt-1 text-sm text-muted">
                        VESA {model.vesa_width_mm}×{model.vesa_height_mm} мм
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 font-semibold leading-relaxed">
                    {screwSummary(hardware)}
                  </p>
                  {hardware.vesa_conflict ? (
                    <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-action">
                      <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                      VESA расходится в официальных источниках — перед монтажом нужен замер.
                    </p>
                  ) : null}
                  {hardware.requires_adapters ? (
                    <p className="mt-2 text-sm font-semibold text-technical">
                      Нужны показанные в руководстве адаптеры VESA.
                    </p>
                  ) : null}
                  {hardware.required_parts_note ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {hardware.required_parts_note}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 lg:justify-items-end lg:text-right">
                  <a
                    className="inline-flex items-center gap-2 text-sm font-semibold text-technical underline underline-offset-4"
                    href={hardware.source_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Официальное руководство
                    <LinkSimple aria-hidden="true" className="shrink-0" />
                  </a>
                  <span className="font-mono text-xs uppercase text-muted">
                    {hardware.source_region} · проверено {formatCheckedDate(hardware.checked_at)}
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
