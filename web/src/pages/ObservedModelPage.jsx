import {
  ArrowRight,
  LinkSimple,
  Ruler,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { useState } from "react";
import { ModelSearch } from "../components/ModelSearch.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import { formatCheckedDate } from "../components/TrustMark.jsx";

const number = new Intl.NumberFormat("ru-RU");

export function ObservedModelPage({ catalog, model }) {
  const [query, setQuery] = useState(model.title);
  const geometry = screenGeometry(model.diagonal_inches);
  const identityStatus = model.identity_confidence === "low"
    ? "Точный заводской код не подтверждён: перепишите модель с шильдика на задней панели."
    : "Модель идентифицирована по карточке Маркета. Параметры настенного монтажа пока не подтверждены официальным руководством.";

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink" data-market-model-page="true">
      <SiteHeader active="/modeli/" />
      <article className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
        <nav className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted" aria-label="Навигационная цепочка">
          <a href="/">Главная</a><span aria-hidden="true">/</span>
          <a href="/modeli/">Телевизоры</a><span aria-hidden="true">/</span>
          <span>{model.model}</span>
        </nav>

        <header className="mt-6 border-b-2 border-ink pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            Модель найдена на Маркете · паспорт проверяется
          </p>
          <h1 className="mt-3 break-words font-display text-[clamp(2.8rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            Кронштейн для {model.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted">{identityStatus}</p>
          <p className="mt-4 border-l-2 border-action pl-4 font-semibold">
            Без подтверждённых VESA и массы KREPI TV не показывает «подходящие» кронштейны и не подменяет проверку догадкой.
          </p>
        </header>

        {model.page_kind === "alias" ? (
          <aside className="mt-6 border-2 border-action bg-white p-5" data-market-model-alias="true">
            <p className="font-mono text-xs uppercase text-action">Повтор карточки одной модели</p>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted">
              Маркет показал эту модель в нескольких товарных карточках. Для поиска используется одна основная страница без конкурирующих дублей.
            </p>
            <a className="mt-3 inline-flex font-semibold text-action underline underline-offset-4" href={model.canonical_path}>
              Открыть основную страницу модели <ArrowRight aria-hidden="true" className="ml-2 size-5" />
            </a>
          </aside>
        ) : null}

        <dl className="grid gap-px border-b-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Бренд" value={model.brand} />
          <Fact label="Модель" value={model.model} />
          <Fact label="Диагональ" value={model.diagonal_inches ? `${formatDecimal(model.diagonal_inches)}″` : "Нужно сверить"} />
          <Fact label="Проверено в выдаче" value={formatCheckedDate(model.checked_at)} />
        </dl>

        {geometry ? (
          <section className="grid gap-6 border-b border-line py-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase text-action">Расчёт активной области 16:9</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold">Экран примерно {geometry.width} × {geometry.height} см</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                Это геометрия изображения по диагонали, а не размер корпуса. Рамки, разъёмы и выступы нужно измерить отдельно.
              </p>
            </div>
            <div className="border-2 border-ink bg-white p-5">
              <Ruler aria-hidden="true" className="size-9 text-action" />
              <p className="mt-3 font-display text-2xl font-extrabold">{geometry.diagonalCm} см по диагонали</p>
              <a className="mt-3 inline-flex font-semibold text-action underline underline-offset-4" href="/razmery-televizora-po-diagonali/">
                Проверить размер ниши <ArrowRight aria-hidden="true" className="ml-2 size-5" />
              </a>
            </div>
          </section>
        ) : null}

        <section className="py-8">
          <p className="font-mono text-xs uppercase text-action">Три проверки до покупки</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">Как подобрать кронштейн без ошибки</h2>
          <ol className="mt-6 grid gap-px border border-ink bg-ink md:grid-cols-3">
            <CheckStep number="01" title="Сверьте шильдик">
              Сравните полный код на задней панели с «{model.model}». Суффикс и диагональ могут менять корпус, массу и VESA.
            </CheckStep>
            <CheckStep number="02" title="Измерьте VESA">
              Измерьте горизонталь × вертикаль между центрами четырёх резьбовых отверстий.
              <a className="mt-3 block font-semibold text-action underline underline-offset-4" href="/kak-uznat-vesa-televizora/">Инструкция по VESA →</a>
            </CheckStep>
            <CheckStep number="03" title="Найдите массу">
              Берите вес без подставки из руководства и закладывайте минимум 25% запаса. Стеновой крепёж проверяется отдельно.
              <a className="mt-3 block font-semibold text-action underline underline-offset-4" href="/metodika/">Границы проверки →</a>
            </CheckStep>
          </ol>
        </section>

        <section className="grid gap-8 border-t border-line py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <h2 className="font-display text-3xl font-extrabold">Что зафиксировано в источнике</h2>
            <p className="mt-4 max-w-4xl leading-relaxed"><strong>Название карточки:</strong> {model.market_title}</p>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted">{marketSignal(model)}</p>
            <a className="mt-5 inline-flex items-center font-semibold text-technical underline underline-offset-4" data-market-source="identity" href={model.market_url} rel="nofollow noopener noreferrer" target="_blank">
              Открыть исходную карточку Яндекс Маркета <LinkSimple aria-hidden="true" className="ml-2 size-5" />
            </a>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Источник используется для идентификации и сигнала наличия на дату {formatCheckedDate(model.checked_at)}. Цена не сохраняется; доступность и характеристики могли измениться.
            </p>
          </div>
          <aside className="border-2 border-ink bg-white p-5">
            <WarningCircle aria-hidden="true" className="size-10 text-action" />
            <h2 className="mt-3 font-display text-2xl font-extrabold">Не покупайте по диагонали</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Одинаковые 55″ не означают одинаковые VESA, массу и посадку разъёмов.</p>
          </aside>
        </section>

        <section className="border-t-2 border-ink py-8">
          <div className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="size-9 text-verified" />
            <h2 className="font-display text-3xl font-extrabold">Проверить другую модель</h2>
          </div>
          <div className="relative z-20 mt-5">
            <ModelSearch
              buttonLabel="Открыть модель"
              compact
              onChange={setQuery}
              onSubmit={openModel}
              search={catalog.search}
              value={query}
            />
          </div>
        </section>
      </article>
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0 bg-paper p-5">
      <dt className="font-mono text-xs uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-words font-display text-2xl font-extrabold">{value}</dd>
    </div>
  );
}

function CheckStep({ number: stepNumber, title, children }) {
  return (
    <li className="bg-paper p-5">
      <span className="font-mono text-xs uppercase text-action">{stepNumber} · Проверка</span>
      <h3 className="mt-2 font-display text-2xl font-extrabold">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
    </li>
  );
}

function screenGeometry(diagonalInches) {
  if (!Number.isFinite(diagonalInches) || diagonalInches <= 0) return null;
  const diagonalCm = diagonalInches * 2.54;
  const ratio = Math.sqrt(16 ** 2 + 9 ** 2);
  return {
    diagonalCm: formatDecimal(diagonalCm),
    width: formatDecimal((diagonalCm * 16) / ratio),
    height: formatDecimal((diagonalCm * 9) / ratio),
  };
}

function marketSignal(model) {
  const purchase = Number.isFinite(model.purchase_count)
    ? `В сохранённой выдаче рядом с карточкой отображалось «${number.format(model.purchase_count)} купили». Это интерфейсный сигнал Маркета, а не подтверждённая статистика продаж.`
    : "Публичный счётчик покупок не показан в сохранённой выдаче.";
  const rating = Number.isFinite(model.rating_value) && Number.isFinite(model.rating_count)
    ? ` Рейтинг в снимке: ${formatDecimal(model.rating_value)} из 5 · оценок: ${number.format(model.rating_count)}.`
    : " Рейтинг в сохранённой выдаче не указан.";
  return `${purchase}${rating}`;
}

function formatDecimal(value) {
  return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}
