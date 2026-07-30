const NO_BREAK_SPACE = "\u00a0";

export function formatFieldLabel(label, unit) {
  return `${label},${NO_BREAK_SPACE}${unit}`;
}
