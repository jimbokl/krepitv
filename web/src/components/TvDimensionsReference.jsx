import dimensionsReference from "../../../data/tv_dimensions_reference.json";
import { formatNumber } from "./ModelFacts.jsx";

const methods = [
  {
    step: "1. По маркировке",
    title: "Введите диагональ",
    copy: "Получите размер активной области 16:9 и сравните две диагонали в одном масштабе.",
  },
  {
    step: "2. По экрану",
    title: "Измерьте две стороны",
    copy: "Ширина и высота дадут реальную диагональ и соотношение сторон, даже если это не 16:9.",
  },
  {
    step: "3. По месту",
    title: "Задайте нишу и зазор",
    copy: "Калькулятор вычтет зазор со всех сторон и найдёт самый большой стандартный экран, который помещается целиком.",
  },
];

export function TvDimensionsReference() {
  return (
    <section className="border-y-2 border-ink py-7" data-tv-dimensions-answer="true">
      <p className="font-mono text-xs uppercase text-action">Размер экрана без догадок</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold">
        Таблица ширины и высоты телевизоров 16:9
      </h2>
      <p className="mt-3 max-w-4xl leading-relaxed text-muted">
        Диагональ на коробке описывает расстояние между противоположными углами
        активной области. Для современного экрана 16:9 из неё можно точно
        рассчитать ширину и высоту; один дюйм равен 2,54 см.
      </p>
      <p className="mt-3 max-w-4xl border-l-2 border-action pl-4 text-sm font-semibold leading-relaxed">
        Таблица показывает экран, а не корпус. Рамка, нижний блок, подставка и
        толщина зависят от точной модели.
      </p>

      <p
        className="mt-5 font-mono text-xs uppercase text-action sm:hidden"
        data-tv-dimensions-table-scroll-hint="true"
      >
        Таблица прокручивается вправо →
      </p>
      <div
        className="mt-4 overflow-x-auto border border-ink"
        data-tv-dimensions-reference-table="true"
      >
        <table className="w-full min-w-[39rem] border-collapse text-left text-sm">
          <thead className="bg-ink font-mono text-xs uppercase text-white">
            <tr>
              <th className="px-4 py-3" scope="col">Диагональ</th>
              <th className="px-4 py-3" scope="col">Диагональ в см</th>
              <th className="px-4 py-3" scope="col">Ширина экрана</th>
              <th className="px-4 py-3" scope="col">Высота экрана</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {dimensionsReference.rows.map((row) => (
              <tr data-tv-dimensions-row={row.diagonal_inches} key={row.diagonal_inches}>
                <th className="px-4 py-3" scope="row">{row.diagonal_inches}″</th>
                <td className="px-4 py-3">{formatNumber(row.diagonal_cm)} см</td>
                <td className="px-4 py-3">{formatNumber(row.screen_width_cm)} см</td>
                <td className="px-4 py-3">{formatNumber(row.screen_height_cm)} см</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="mt-8 grid gap-px border border-ink bg-ink md:grid-cols-3"
        data-tv-dimensions-method="true"
      >
        {methods.map((method) => (
          <article className="bg-paper p-5" key={method.step}>
            <p className="font-mono text-xs uppercase text-action">{method.step}</p>
            <h3 className="mt-2 font-display text-xl font-extrabold">{method.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{method.copy}</p>
          </article>
        ))}
      </div>

      <nav
        aria-label="Следующие проверки размера телевизора"
        className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-5 text-sm font-semibold"
      >
        <a className="text-action underline underline-offset-4" href="/televizor-na-stene/">
          Примерить телевизор на стене
        </a>
        <a className="text-action underline underline-offset-4" href="/rasstoyanie-do-televizora-i-diagonal/">
          Проверить расстояние просмотра
        </a>
        <a className="text-action underline underline-offset-4" href="/modeli/">
          Сверить корпус точной модели
        </a>
      </nav>
    </section>
  );
}
