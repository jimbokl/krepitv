export const HEIGHT_PLAN_VIEW_BOX_WIDTH = 760;
export const HEIGHT_PLAN_VIEW_BOX_HEIGHT = 520;
export const HEIGHT_PLAN_FLOOR_Y = 446;

const WALL_TOP = 32;
const SCREEN_X = 124;
const SCREEN_WIDTH = 340;
const LABEL_MIN_Y = 82;
const LABEL_MAX_Y = 382;
const LABEL_GAP = 74;

export function buildHeightPlanDiagram(result) {
  const bottom = finiteHeight(result?.bottom_height_cm);
  const center = finiteHeight(result?.center_height_cm);
  const top = finiteHeight(result?.top_height_cm);

  if (
    bottom == null
    || center == null
    || top == null
    || bottom < 0
    || top <= bottom
    || center < bottom
    || center > top
  ) {
    return null;
  }

  const screenHeight = top - bottom;
  const headroom = Math.max(screenHeight * 0.18, 8);
  const scaleMaximum = Math.max(top + headroom, 40);
  const scale = (HEIGHT_PLAN_FLOOR_Y - WALL_TOP) / scaleMaximum;
  const yForHeight = (height) => roundCoordinate(HEIGHT_PLAN_FLOOR_Y - height * scale);
  const actualYs = [yForHeight(top), yForHeight(center), yForHeight(bottom)];
  const labelYs = spreadLabelRows(actualYs);

  const values = [
    { key: "top", label: "Верхний край", value: top },
    { key: "center", label: "Центр экрана", value: center },
    { key: "bottom", label: "Нижний край", value: bottom },
  ];

  return {
    viewBox: `0 0 ${HEIGHT_PLAN_VIEW_BOX_WIDTH} ${HEIGHT_PLAN_VIEW_BOX_HEIGHT}`,
    wall: {
      x: 24,
      y: 24,
      width: HEIGHT_PLAN_VIEW_BOX_WIDTH - 48,
      height: HEIGHT_PLAN_FLOOR_Y - 24,
    },
    ruler: {
      x: 72,
      y1: WALL_TOP,
      y2: HEIGHT_PLAN_FLOOR_Y,
    },
    screen: {
      x: SCREEN_X,
      y: actualYs[0],
      width: SCREEN_WIDTH,
      height: roundCoordinate(actualYs[2] - actualYs[0]),
    },
    levels: values.map((level, index) => ({
      ...level,
      actualY: actualYs[index],
      labelY: labelYs[index],
      leaderPoints: [
        `${SCREEN_X + SCREEN_WIDTH},${actualYs[index]}`,
        `506,${actualYs[index]}`,
        `522,${labelYs[index]}`,
      ].join(" "),
    })),
  };
}

function finiteHeight(value) {
  const height = Number(value);
  return Number.isFinite(height) ? height : null;
}

function spreadLabelRows(actualYs) {
  const rows = actualYs.map((value) => clamp(value, LABEL_MIN_Y, LABEL_MAX_Y));

  for (let index = 1; index < rows.length; index += 1) {
    rows[index] = Math.max(rows[index], rows[index - 1] + LABEL_GAP);
  }

  if (rows.at(-1) > LABEL_MAX_Y) {
    const overflow = rows.at(-1) - LABEL_MAX_Y;
    for (let index = 0; index < rows.length; index += 1) rows[index] -= overflow;
  }

  for (let index = rows.length - 2; index >= 0; index -= 1) {
    rows[index] = Math.min(rows[index], rows[index + 1] - LABEL_GAP);
  }

  if (rows[0] < LABEL_MIN_Y) {
    const underflow = LABEL_MIN_Y - rows[0];
    for (let index = 0; index < rows.length; index += 1) rows[index] += underflow;
  }

  return rows.map(roundCoordinate);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundCoordinate(value) {
  return Math.round(value * 100) / 100;
}
