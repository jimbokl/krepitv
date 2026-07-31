import assert from "node:assert/strict";
import test from "node:test";
import tailwindConfig from "../tailwind.config.js";

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("основная и hover-кнопки сохраняют контраст белого текста не ниже WCAG AA", () => {
  const colors = tailwindConfig.theme.extend.colors;
  assert.ok(contrastRatio(colors.action, "#FFFFFF") >= 4.5);
  assert.ok(contrastRatio(colors["action-hover"], "#FFFFFF") >= 4.5);
});
