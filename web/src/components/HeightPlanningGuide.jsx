import {
  buildHeightReferenceRows,
  HEIGHT_REFERENCE_CENTER_CM,
} from "../lib/heightReference.mjs";
import { formatNumber } from "./ModelFacts.jsx";

const scenarios = [
  {
    label: "Гостиная",
    title: "Измерьте глаза сидя",
    body: "Сядьте на обычное место просмотра и измерьте высоту глаз от чистого пола. Отдельно внесите тумбу, саундбар и зазор — они могут поднять нижний край.",
  },
  {
    label: "Спальня",
    title: "Повторите привычную позу",
    body: "Не переносите высоту из гостиной. Измерьте глаза полулёжа и задайте направление взгляда; если экран выше, отдельно проверьте нужный наклон кронштейна.",
  },
  {
    label: "Кухня",
    title: "Выберите одну главную позу",
    body: "Решите, смотрите вы чаще сидя или стоя, и измерьте именно эту высоту глаз. Не усредняйте две позы: калькулятор должен отвечать на реальный сценарий.",
  },
];

export function HeightPlanningGuide() {
  const rows = buildHeightReferenceRows();

  return (
    <div className="border-t-2 border-ink py-8" data-height-planning-guide="true">
      <section aria-labelledby="height-room-scenarios" data-height-room-scenarios="true">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
          Сначала измерение, потом расчёт
        </p>
        <h2 className="mt-2 font-display text-3xl font-extrabold" id="height-room-scenarios">
          Высота зависит от комнаты и позы
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Универсальная отметка не заменяет замер. Для каждой комнаты зафиксируйте
          основную позу, высоту глаз, расстояние до экрана и мебель под телевизором.
        </p>
        <div className="mt-6 grid gap-px border border-ink bg-ink md:grid-cols-3">
          {scenarios.map((scenario, index) => (
            <article className="bg-paper p-5" key={scenario.label}>
              <p className="font-mono text-xs uppercase text-action">
                {index + 1}. {scenario.label}
              </p>
              <h3 className="mt-2 font-display text-2xl font-extrabold">{scenario.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{scenario.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="height-reference-title"
        className="mt-9"
        data-height-reference-table="true"
      >
        <h2 className="font-display text-3xl font-extrabold" id="height-reference-title">
          Таблица размеров экрана по диагонали
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted">
          Это не готовая рекомендация по высоте. Таблица показывает только геометрию
          экрана 16:9 при условном центре {HEIGHT_REFERENCE_CENTER_CM} см от пола,
          без подъёма из-за мебели. Подставьте собственную высоту глаз в калькулятор.
        </p>
        <p
          className="mt-4 font-mono text-xs uppercase text-action sm:hidden"
          data-height-table-scroll-hint="true"
        >
          Таблица прокручивается вправо →
        </p>
        <div className="mt-5 overflow-x-auto border border-ink">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="bg-ink font-mono text-xs uppercase text-white">
              <tr>
                <th className="px-4 py-3" scope="col">Диагональ</th>
                <th className="px-4 py-3" scope="col">Высота экрана</th>
                <th className="px-4 py-3" scope="col">Нижний край</th>
                <th className="px-4 py-3" scope="col">Центр</th>
                <th className="px-4 py-3" scope="col">Верхний край</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {rows.map((row) => (
                <tr key={row.diagonal}>
                  <th className="px-4 py-3 font-display text-lg font-extrabold" scope="row">
                    {row.diagonal}″
                  </th>
                  <td className="px-4 py-3">{formatNumber(row.screenHeightCm)} см</td>
                  <td className="px-4 py-3">{formatNumber(row.bottomHeightCm)} см</td>
                  <td className="px-4 py-3 font-semibold text-action">
                    {formatNumber(row.centerHeightCm)} см
                  </td>
                  <td className="px-4 py-3">{formatNumber(row.topHeightCm)} см</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
