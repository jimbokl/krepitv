export const HEIGHT_REFERENCE_CENTER_CM = 110;
export const HEIGHT_REFERENCE_DIAGONALS = Object.freeze([32, 43, 50, 55, 65, 75]);

const SCREEN_ASPECT_WIDTH = 16;
const SCREEN_ASPECT_HEIGHT = 9;
const CENTIMETERS_PER_INCH = 2.54;

export function buildHeightReferenceRows(centerHeightCm = HEIGHT_REFERENCE_CENTER_CM) {
  const center = Number(centerHeightCm);
  if (!Number.isFinite(center) || center <= 0) return [];

  return HEIGHT_REFERENCE_DIAGONALS.map((diagonal) => {
    const screenHeight = (
      diagonal
      * CENTIMETERS_PER_INCH
      * SCREEN_ASPECT_HEIGHT
      / Math.hypot(SCREEN_ASPECT_WIDTH, SCREEN_ASPECT_HEIGHT)
    );
    return {
      diagonal,
      screenHeightCm: roundOne(screenHeight),
      bottomHeightCm: roundOne(center - screenHeight / 2),
      centerHeightCm: roundOne(center),
      topHeightCm: roundOne(center + screenHeight / 2),
    };
  });
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}
