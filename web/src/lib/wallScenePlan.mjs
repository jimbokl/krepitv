export const WALL_SCENE_VIEWBOX = Object.freeze({ width: 1000, height: 650 });

const WALL_PADDING = Object.freeze({ left: 78, right: 46, top: 42, bottom: 78 });

export function buildWallSceneDiagram(plan) {
  const wallWidth = requiredPositive(plan?.wall_width_cm, "Ширина стены");
  const wallHeight = requiredPositive(plan?.wall_height_cm, "Высота стены");
  const screenWidth = requiredPositive(plan?.screen_width_cm, "Ширина телевизора");
  const screenHeight = requiredPositive(plan?.screen_height_cm, "Высота телевизора");
  const centerX = requiredFinite(
    plan?.effective_center_x_cm ?? plan?.screen_center_x_cm,
    "Центр по горизонтали",
  );
  const centerY = requiredFinite(
    plan?.effective_center_y_cm ?? plan?.screen_center_y_cm,
    "Центр по вертикали",
  );
  const furnitureWidth = requiredNonNegative(plan?.furniture_width_cm, "Ширина тумбы");
  const furnitureHeight = requiredNonNegative(plan?.furniture_height_cm, "Высота тумбы");
  const eyeLine = requiredNonNegative(plan?.eye_line_height_cm, "Линия глаз");

  const availableWidth = WALL_SCENE_VIEWBOX.width - WALL_PADDING.left - WALL_PADDING.right;
  const availableHeight = WALL_SCENE_VIEWBOX.height - WALL_PADDING.top - WALL_PADDING.bottom;
  const scale = Math.min(availableWidth / wallWidth, availableHeight / wallHeight);
  const drawnWidth = wallWidth * scale;
  const drawnHeight = wallHeight * scale;
  const wall = {
    x: roundSvg(WALL_PADDING.left + (availableWidth - drawnWidth) / 2),
    y: roundSvg(WALL_PADDING.top + (availableHeight - drawnHeight) / 2),
    width: roundSvg(drawnWidth),
    height: roundSvg(drawnHeight),
  };

  const xForCm = (value) => wall.x + value * scale;
  const yForCm = (value) => wall.y + wall.height - value * scale;
  const rectFromCenter = (width, height, x, y) => ({
    x: roundSvg(xForCm(x - width / 2)),
    y: roundSvg(yForCm(y + height / 2)),
    width: roundSvg(width * scale),
    height: roundSvg(height * scale),
  });

  return {
    viewBox: `0 0 ${WALL_SCENE_VIEWBOX.width} ${WALL_SCENE_VIEWBOX.height}`,
    wall,
    screen: rectFromCenter(screenWidth, screenHeight, centerX, centerY),
    furniture: furnitureWidth > 0 && furnitureHeight > 0
      ? {
          x: roundSvg(xForCm((wallWidth - furnitureWidth) / 2)),
          y: roundSvg(yForCm(furnitureHeight)),
          width: roundSvg(furnitureWidth * scale),
          height: roundSvg(furnitureHeight * scale),
        }
      : null,
    eyeLineY: roundSvg(yForCm(Math.min(eyeLine, wallHeight))),
    center: {
      x: roundSvg(xForCm(centerX)),
      y: roundSvg(yForCm(centerY)),
    },
    scale,
  };
}

export function scenePointFromClient({ clientX, clientY, diagram, rect }) {
  if (!diagram?.wall || !rect || rect.width <= 0 || rect.height <= 0) return null;
  const svgX = ((clientX - rect.left) / rect.width) * WALL_SCENE_VIEWBOX.width;
  const svgY = ((clientY - rect.top) / rect.height) * WALL_SCENE_VIEWBOX.height;
  const wallX = ((svgX - diagram.wall.x) / diagram.wall.width) * 100;
  const wallY = ((diagram.wall.y + diagram.wall.height - svgY) / diagram.wall.height) * 100;
  return {
    xRatio: clamp(wallX / 100, 0, 1),
    yRatio: clamp(wallY / 100, 0, 1),
  };
}

export function plannerInputsForModel(values, model) {
  const numeric = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, Number(value)]),
  );
  return {
    diagonal: Number(model?.diagonal_inches ?? numeric.diagonal),
    screenWidth: model ? Number(model.width_mm) / 10 : 0,
    screenHeight: model ? Number(model.height_mm) / 10 : 0,
    wallWidth: numeric.wallWidth,
    wallHeight: numeric.wallHeight,
    centerX: numeric.centerX,
    centerY: numeric.centerY,
    furnitureWidth: numeric.furnitureWidth,
    furnitureHeight: numeric.furnitureHeight,
    eyeLine: numeric.eyeLine,
  };
}

export function describeWallSceneFurniture(plan) {
  const furnitureWidth = requiredNonNegative(plan?.furniture_width_cm, "Ширина тумбы");
  const furnitureHeight = requiredNonNegative(plan?.furniture_height_cm, "Высота тумбы");
  if (furnitureWidth <= 0 || furnitureHeight <= 0) {
    return {
      kind: "none",
      label: "Тумба",
      value: "Не указана",
      measurementCm: null,
    };
  }

  const wallWidth = requiredPositive(plan?.wall_width_cm, "Ширина стены");
  const screenWidth = requiredPositive(plan?.screen_width_cm, "Ширина телевизора");
  const centerX = requiredFinite(
    plan?.effective_center_x_cm ?? plan?.screen_center_x_cm,
    "Центр по горизонтали",
  );
  const screenLeft = centerX - screenWidth / 2;
  const screenRight = centerX + screenWidth / 2;
  const furnitureLeft = (wallWidth - furnitureWidth) / 2;
  const furnitureRight = furnitureLeft + furnitureWidth;
  const intersectsHorizontally = Math.min(screenRight, furnitureRight)
    > Math.max(screenLeft, furnitureLeft);

  if (!intersectsHorizontally) {
    return {
      kind: "separate",
      label: "Экран и тумба",
      value: "Не пересекаются",
      measurementCm: null,
    };
  }

  const overlap = requiredNonNegative(plan?.furniture_overlap_cm, "Перекрытие тумбы");
  if (overlap > 0) {
    return {
      kind: "overlap",
      label: "Перекрытие тумбы",
      value: null,
      measurementCm: overlap,
    };
  }

  return {
    kind: "gap",
    label: "Зазор над тумбой",
    value: null,
    measurementCm: requiredNonNegative(plan?.furniture_gap_cm, "Зазор над тумбой"),
  };
}

export function buildWallSceneSvg(plan, { screenLabel = "Телевизор" } = {}) {
  const diagram = buildWallSceneDiagram(plan);
  const label = escapeXml(screenLabel);
  const furnitureFact = describeWallSceneFurniture(plan);
  const furnitureFactValue = furnitureFact.measurementCm == null
    ? furnitureFact.value
    : `${formatSvgNumber(furnitureFact.measurementCm)} см`;
  const warningLines = (plan?.warnings ?? []).flatMap((warning) => (
    wrapSvgText(`Предупреждение: ${warning}`, 88)
  ));
  const warningsY = 820;
  const svgHeight = Math.max(850, warningsY + Math.max(0, warningLines.length - 1) * 24 + 35);
  const warning = warningLines.length
    ? `<text x="78" y="${warningsY}" font-family="Arial, sans-serif" font-size="16" fill="#b42318">${warningLines.map((line, index) => `<tspan x="78" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`).join("")}</text>`
    : "";
  const furniture = diagram.furniture
    ? `<rect x="${diagram.furniture.x}" y="${diagram.furniture.y}" width="${diagram.furniture.width}" height="${diagram.furniture.height}" fill="#d8d4cc" stroke="#151412" stroke-width="3"/>`
    : "";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${svgHeight}" role="img" aria-labelledby="title description">`,
    `<title id="title">Схема размещения телевизора на стене</title>`,
    `<desc id="description">Стена ${formatSvgNumber(plan.wall_width_cm)} на ${formatSvgNumber(plan.wall_height_cm)} сантиметров. ${label}: ${formatSvgNumber(plan.screen_width_cm)} на ${formatSvgNumber(plan.screen_height_cm)} сантиметров.</desc>`,
    `<rect width="1000" height="${svgHeight}" fill="#f7f5f0"/>`,
    `<rect x="${diagram.wall.x}" y="${diagram.wall.y}" width="${diagram.wall.width}" height="${diagram.wall.height}" fill="#ffffff" stroke="#151412" stroke-width="4"/>`,
    furniture,
    `<line x1="${diagram.wall.x}" x2="${diagram.wall.x + diagram.wall.width}" y1="${diagram.eyeLineY}" y2="${diagram.eyeLineY}" stroke="#1457d9" stroke-width="3" stroke-dasharray="12 10"/>`,
    `<rect x="${diagram.screen.x}" y="${diagram.screen.y}" width="${diagram.screen.width}" height="${diagram.screen.height}" rx="6" fill="#151412" stroke="#c83a08" stroke-width="5"/>`,
    `<circle cx="${diagram.center.x}" cy="${diagram.center.y}" r="8" fill="#c83a08" stroke="#ffffff" stroke-width="3"/>`,
    `<line x1="78" x2="954" y1="662" y2="662" stroke="#151412" stroke-width="2"/>`,
    `<text x="78" y="695" font-family="Arial, sans-serif" font-size="18" fill="#151412">${label} · экран ${formatSvgNumber(plan.screen_width_cm)} × ${formatSvgNumber(plan.screen_height_cm)} см · центр ${formatSvgNumber(plan.effective_center_x_cm ?? plan.screen_center_x_cm)} × ${formatSvgNumber(plan.effective_center_y_cm ?? plan.screen_center_y_cm)} см</text>`,
    `<text x="78" y="730" font-family="Arial, sans-serif" font-size="17" fill="#151412">Зазоры: слева ${formatSvgNumber(plan.left_clearance_cm)} см · справа ${formatSvgNumber(plan.right_clearance_cm)} см · сверху ${formatSvgNumber(plan.top_clearance_cm)} см · снизу ${formatSvgNumber(plan.bottom_clearance_cm)} см</text>`,
    `<text x="78" y="765" font-family="Arial, sans-serif" font-size="17" fill="#151412">Линия глаз: ${formatSvgNumber(plan.eye_line_height_cm)} см · разница с центром экрана: ${formatSvgNumber(Math.abs(Number(plan.eye_line_delta_cm)))} см</text>`,
    `<text x="78" y="800" font-family="Arial, sans-serif" font-size="17" fill="#151412">${diagram.furniture ? `Тумба: ${formatSvgNumber(plan.furniture_width_cm)} × ${formatSvgNumber(plan.furniture_height_cm)} см · ` : ""}${escapeXml(furnitureFact.label)}: ${escapeXml(furnitureFactValue)}</text>`,
    warning,
    `</svg>`,
  ].join("");
}

function wrapSvgText(value, maxLength) {
  const words = String(value).trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function requiredPositive(value, label) {
  const number = requiredFinite(value, label);
  if (number <= 0) throw new Error(`${label}: требуется положительное число`);
  return number;
}

function requiredNonNegative(value, label) {
  const number = requiredFinite(value, label);
  if (number < 0) throw new Error(`${label}: число не может быть отрицательным`);
  return number;
}

function requiredFinite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}: введите число`);
  return number;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatSvgNumber(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Number(value));
}

function roundSvg(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
