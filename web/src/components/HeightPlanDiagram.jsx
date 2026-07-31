import { useId } from "react";
import {
  buildHeightPlanDiagram,
  HEIGHT_PLAN_FLOOR_Y,
  HEIGHT_PLAN_VIEW_BOX_WIDTH,
} from "../lib/heightPlanDiagram.mjs";

const LABEL_X = 536;

const levelStyles = {
  top: {
    dotClassName: "fill-technical",
    lineClassName: "stroke-technical",
    textClassName: "text-technical",
  },
  center: {
    dotClassName: "fill-action",
    lineClassName: "stroke-action",
    textClassName: "text-action",
  },
  bottom: {
    dotClassName: "fill-verified",
    lineClassName: "stroke-verified",
    textClassName: "text-verified",
  },
};

export function HeightPlanDiagram({ result }) {
  const diagram = buildHeightPlanDiagram(result);
  const accessibleId = useId();

  if (!diagram) return null;

  const titleId = `${accessibleId}-height-plan-title`;
  const descriptionId = `${accessibleId}-height-plan-description`;

  return (
    <figure
      className="mt-6 min-w-0 overflow-hidden border border-ink bg-white p-3 sm:p-5"
      data-height-plan-diagram="true"
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
          Схема в масштабе
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold">
          Контрольные высоты экрана
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Все отметки показаны от чистого пола. Перед разметкой сверьте размеры
          корпуса и положение монтажных отверстий конкретного телевизора.
        </p>
      </div>

      <svg
        aria-labelledby={`${titleId} ${descriptionId}`}
        className="mt-4 block h-auto w-full max-w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={diagram.viewBox}
      >
        <title id={titleId}>Схема высоты установки телевизора</title>
        <desc id={descriptionId}>
          Экран на стене и три контрольные отметки от чистого пола: верхний
          край, центр экрана и нижний край.
        </desc>

        <rect
          className="fill-paper"
          height={diagram.wall.height}
          width={diagram.wall.width}
          x={diagram.wall.x}
          y={diagram.wall.y}
        />
        <line
          className="stroke-line"
          strokeWidth="3"
          x1={diagram.ruler.x}
          x2={diagram.ruler.x}
          y1={diagram.ruler.y1}
          y2={diagram.ruler.y2}
        />
        <rect
          className="fill-white stroke-ink"
          height={diagram.screen.height}
          rx="6"
          strokeWidth="5"
          width={diagram.screen.width}
          x={diagram.screen.x}
          y={diagram.screen.y}
        />

        {diagram.levels.map((level) => {
          const styles = levelStyles[level.key];

          return (
            <g key={level.key}>
              <line
                className="stroke-line"
                strokeDasharray="9 8"
                strokeWidth="2"
                x1={diagram.ruler.x}
                x2={diagram.screen.x}
                y1={level.actualY}
                y2={level.actualY}
              />
              <line
                className={styles.lineClassName}
                strokeDasharray={level.key === "center" ? "none" : "9 8"}
                strokeWidth={level.key === "center" ? "4" : "3"}
                x1={diagram.screen.x}
                x2={diagram.screen.x + diagram.screen.width}
                y1={level.actualY}
                y2={level.actualY}
              />
              <polyline
                className={styles.lineClassName}
                fill="none"
                points={level.leaderPoints}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <circle
                className={styles.dotClassName}
                cx={diagram.screen.x + diagram.screen.width}
                cy={level.actualY}
                r="6"
              />
              <text
                className={`fill-current font-mono text-xs uppercase ${styles.textClassName}`}
                x={LABEL_X}
                y={level.labelY - 7}
              >
                {level.label}
              </text>
              <text
                className="fill-current font-display text-xl font-bold text-ink"
                x={LABEL_X}
                y={level.labelY + 19}
              >
                {formatHeight(level.value)} см
              </text>
            </g>
          );
        })}

        <line
          className="stroke-ink"
          strokeWidth="5"
          x1="24"
          x2={HEIGHT_PLAN_VIEW_BOX_WIDTH - 24}
          y1={HEIGHT_PLAN_FLOOR_Y}
          y2={HEIGHT_PLAN_FLOOR_Y}
        />
        <text
          className="fill-current font-mono text-xs uppercase text-muted"
          x="36"
          y={HEIGHT_PLAN_FLOOR_Y + 30}
        >
          Чистый пол · 0 см
        </text>
      </svg>

      <figcaption className="mt-3 text-xs leading-relaxed text-muted">
        Схема передаёт взаимное положение трёх рассчитанных отметок. Она не
        показывает отверстия кронштейна и не заменяет проверку стены перед
        сверлением.
      </figcaption>
    </figure>
  );
}

function formatHeight(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}
