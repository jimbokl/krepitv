import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Info,
  LinkSimple,
  Ruler,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { ModelFacts, formatNumber } from "../components/ModelFacts.jsx";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { HeightCalculator } from "../components/HeightCalculator.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { TrustMark, formatCheckedDate } from "../components/TrustMark.jsx";
import { useCompatibility } from "../hooks/useCompatibility.js";

export function ModelPage({ catalog, modelId }) {
  const model = catalog.models.find((item) => item.id === modelId);
  const [query, setQuery] = useState(model?.title ?? "");
  const compatibility = useCompatibility(model, catalog.mounts, "any");
  const compatible = useMemo(
    () => compatibility.matches.filter((item) => item.compatible),
    [compatibility.matches],
  );

  if (!model) {
    return <MissingModel catalog={catalog} />;
  }

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader active="/podbor/" />
      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-6 sm:px-8">
        <section>
          <h1 className="font-display text-[clamp(2.5rem,4.7vw,4.7rem)] font-extrabold leading-none tracking-[-0.025em]">
            Кронштейн для {model.title}
          </h1>
          <div className="mt-4 grid gap-2 border-y border-ink py-3 font-mono text-xs text-muted sm:grid-cols-3">
            <span>Источник: база Крепи ТВ · {model.brand} · {model.model}</span>
            <span className="sm:text-center">Данные проверены: {formatCheckedDate(model.checked_at)}</span>
            <span className="sm:text-right">Проверка выполняется локально</span>
          </div>
        </section>

        <section className="grid border-b-2 border-ink lg:grid-cols-[minmax(22rem,0.9fr)_minmax(0,1.15fr)]">
          <div className="border-b border-ink py-6 lg:border-b-0 lg:border-r lg:pr-8">
            <h2 className="mb-3 text-base font-semibold">Введите модель телевизора</h2>
            <div className="relative z-20">
              <ModelSearch
                buttonLabel="Найти"
                compact
                onChange={setQuery}
                onSubmit={openModel}
                search={catalog.search}
                value={query}
              />
            </div>

            <h2 className="mb-2 mt-7 font-display text-lg font-bold">
              Технические характеристики телевизора
            </h2>
            <ModelFacts detailed model={model} />

            <div className="mt-5 flex items-start gap-4 border border-ink bg-white/60 p-4">
              <Info aria-hidden="true" className="size-8 shrink-0" weight="regular" />
              <div className="text-sm leading-relaxed">
                <p>Эти данные сверены KREPI TV с указанным официальным источником производителя.</p>
                <a
                  className="mt-2 inline-flex items-center gap-2 font-semibold text-technical underline underline-offset-4"
                  href={model.source_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Открыть источник <LinkSimple aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="py-6 lg:pl-8">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-verified text-white">
                <Check aria-hidden="true" className="size-9" weight="bold" />
              </span>
              <div>
                <h2 className="font-display text-3xl font-extrabold text-verified sm:text-4xl lg:text-5xl">
                  Ключевые параметры совпадают
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
                  Показанные варианты проходят проверку VESA, диагонали и запаса нагрузки для {model.title}. Стену и крепёж нужно проверить отдельно.
                </p>
              </div>
            </div>

            <picture className="contents">
              <source srcSet="/assets/images/mount-mechanisms.avif" type="image/avif" />
              <source srcSet="/assets/images/mount-mechanisms.webp" type="image/webp" />
              <img
                alt="Фиксированный, наклонный и поворотный механизмы кронштейнов"
                className="mt-4 aspect-[2.11/1] w-full border-b border-line object-contain"
                decoding="async"
                height="663"
                loading="lazy"
                src="/assets/images/mount-mechanisms.png"
                width="1400"
              />
            </picture>

            <MountMatches state={compatibility} matches={compatible} />
          </div>
        </section>

        <HeightCalculator model={model} />
      </div>
    </main>
  );
}

function MountMatches({ state, matches }) {
  if (state.status === "loading") {
    return <p className="py-6 text-muted">Проверяем каталог кронштейнов…</p>;
  }
  if (state.status === "error") {
    return (
      <p className="mt-5 flex items-start gap-3 border border-danger p-4 text-danger">
        <Warning aria-hidden="true" className="size-6 shrink-0" /> {state.error}
      </p>
    );
  }
  if (!matches.length) {
    return <p className="py-6 text-muted">В проверенном каталоге пока нет совместимых вариантов.</p>;
  }
  return (
    <div className="divide-y divide-line border-b border-line">
      {matches.map(({ mount, reasons, required_load_kg: requiredLoad }) => (
        <article className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={mount.id}>
          <div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="font-display text-2xl font-bold">{mount.title}</h3>
              <span className="font-mono text-xs uppercase text-muted">
                {mechanismLabel(mount.mechanism)}
              </span>
            </div>
            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              {reasons.map((reason) => (
                <li className="flex gap-2" key={reason}>
                  <CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" weight="fill" />
                  <span>{reason}</span>
                </li>
              ))}
              <li className="flex gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-verified" />
                Требуемая нагрузка с запасом: {formatNumber(requiredLoad)} кг
              </li>
              <li className="flex gap-2">
                <Ruler aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-technical" />
                Расстояние от стены: {formatDistance(mount)}
              </li>
            </ul>
          </div>
          <a
            className="secondary-button"
            href={mount.source_url}
            rel="noreferrer"
            target="_blank"
          >
            Источник <ArrowRight aria-hidden="true" />
          </a>
        </article>
      ))}
    </div>
  );
}

function MissingModel({ catalog }) {
  const [query, setQuery] = useState("");
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-5xl font-extrabold">Модель не найдена</h1>
        <p className="mt-4 text-muted">Выберите телевизор из проверенной базы.</p>
        <div className="mt-8 text-left">
          <ModelSearch
            compact
            onChange={setQuery}
            onSubmit={(item) => window.location.assign(item.href)}
            search={catalog.search}
            value={query}
          />
        </div>
      </section>
    </main>
  );
}

function mechanismLabel(value) {
  if (value === "fixed") return "Фиксированный";
  if (value === "tilt") return "Наклонный";
  if (value === "full-motion") return "Поворотный";
  return "Механизм не указан";
}

function formatDistance(mount) {
  if (mount.wall_distance_min_mm === mount.wall_distance_max_mm) {
    return `${formatNumber(mount.wall_distance_min_mm)} мм`;
  }
  return `${formatNumber(mount.wall_distance_min_mm)}–${formatNumber(mount.wall_distance_max_mm)} мм`;
}
