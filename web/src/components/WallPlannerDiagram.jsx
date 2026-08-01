import { useRef } from "react";
import {
  buildWallSceneDiagram,
  scenePointFromClient,
} from "../lib/wallScenePlan.mjs";
import { formatNumber } from "./ModelFacts.jsx";

export function WallPlannerDiagram({
  example = false,
  interactive = false,
  onMove,
  plan,
  screenLabel = "Телевизор",
}) {
  const diagram = buildWallSceneDiagram(plan);
  const pointerRef = useRef(null);

  function moveFromPointer(event) {
    if (!interactive || typeof onMove !== "function") return;
    const point = scenePointFromClient({
      clientX: event.clientX,
      clientY: event.clientY,
      diagram,
      rect: event.currentTarget.getBoundingClientRect(),
    });
    if (!point) return;
    onMove(point.xRatio * plan.wall_width_cm, point.yRatio * plan.wall_height_cm);
  }

  function pointerDown(event) {
    if (!interactive) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveFromPointer(event);
  }

  function pointerMove(event) {
    if (pointerRef.current !== event.pointerId) return;
    moveFromPointer(event);
  }

  function pointerUp(event) {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function keyDown(event) {
    if (!interactive || typeof onMove !== "function") return;
    const distance = event.shiftKey ? 5 : 1;
    const changes = {
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
      ArrowUp: [0, distance],
      ArrowDown: [0, -distance],
    };
    const change = changes[event.key];
    if (!change) return;
    event.preventDefault();
    onMove(
      plan.effective_center_x_cm + change[0],
      plan.effective_center_y_cm + change[1],
    );
  }

  return (
    <figure
      className="min-w-0 border border-ink bg-white p-3 sm:p-5"
      data-wall-planner-diagram={example ? "пример" : "результат"}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-action">
            {example ? "Пример до расчёта" : "Точная схема в масштабе"}
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold">
            {screenLabel} на стене {formatNumber(plan.wall_width_cm)} × {formatNumber(plan.wall_height_cm)} см
          </h3>
        </div>
        <span className="font-mono text-xs uppercase text-muted">
          {interactive ? "Перетащите экран или используйте стрелки" : "Размеры для ориентира"}
        </span>
      </div>

      <svg
        aria-labelledby="wall-planner-title wall-planner-description"
        className={`mt-4 block h-auto w-full max-w-full outline-none ${interactive ? "touch-none cursor-move focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2" : ""}`}
        onKeyDown={keyDown}
        onPointerCancel={pointerUp}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        tabIndex={interactive ? 0 : undefined}
        viewBox={diagram.viewBox}
      >
        <title id="wall-planner-title">Схема телевизора на стене</title>
        <desc id="wall-planner-description">
          Телевизор показан в масштабе вместе с тумбой, линией глаз и зазорами до краёв стены.
          {interactive ? " Схему можно перемещать указателем или клавишами со стрелками." : ""}
        </desc>
        <rect className="fill-paper" height="650" width="1000" x="0" y="0" />
        <rect className="fill-white stroke-ink" strokeWidth="5" {...diagram.wall} />
        <line
          className="stroke-technical"
          strokeDasharray="14 10"
          strokeWidth="4"
          x1={diagram.wall.x}
          x2={diagram.wall.x + diagram.wall.width}
          y1={diagram.eyeLineY}
          y2={diagram.eyeLineY}
        />
        {diagram.furniture ? (
          <rect className="fill-line stroke-ink" strokeWidth="4" {...diagram.furniture} />
        ) : null}
        <rect
          className="fill-ink stroke-action"
          rx="7"
          strokeWidth="6"
          {...diagram.screen}
        />
        <circle
          className="fill-action stroke-white"
          cx={diagram.center.x}
          cy={diagram.center.y}
          r="9"
          strokeWidth="4"
        />
        <DimensionLabel
          anchor="start"
          label={`${formatNumber(plan.left_clearance_cm)} см`}
          x={diagram.wall.x + 10}
          y={diagram.center.y - 14}
        />
        <DimensionLabel
          anchor="end"
          label={`${formatNumber(plan.right_clearance_cm)} см`}
          x={diagram.wall.x + diagram.wall.width - 10}
          y={diagram.center.y - 14}
        />
        <DimensionLabel
          anchor="middle"
          label={`сверху ${formatNumber(plan.top_clearance_cm)} см`}
          x={diagram.center.x}
          y={Math.max(diagram.wall.y + 25, diagram.screen.y - 14)}
        />
        <DimensionLabel
          anchor="middle"
          label={`снизу ${formatNumber(plan.bottom_clearance_cm)} см`}
          x={diagram.center.x}
          y={Math.min(diagram.wall.y + diagram.wall.height - 12, diagram.screen.y + diagram.screen.height + 28)}
        />
      </svg>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-relaxed text-muted">
        <Legend swatch="border-action bg-ink" text={`${formatNumber(plan.screen_width_cm)} × ${formatNumber(plan.screen_height_cm)} см`} />
        <Legend swatch="border-technical bg-white" text={`Линия глаз ${formatNumber(plan.eye_line_height_cm)} см`} />
        {diagram.furniture ? <Legend swatch="border-ink bg-line" text="Тумба по центру стены" /> : null}
      </figcaption>
    </figure>
  );
}

function DimensionLabel({ anchor, label, x, y }) {
  return (
    <text
      className="hidden fill-muted font-mono text-base font-semibold sm:block"
      dominantBaseline="middle"
      textAnchor={anchor}
      x={x}
      y={y}
    >
      {label}
    </text>
  );
}

function Legend({ swatch, text }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className={`size-4 shrink-0 border-2 ${swatch}`} />
      <span>{text}</span>
    </span>
  );
}
