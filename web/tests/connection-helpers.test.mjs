import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { CONNECTION_HELPERS, connectionToolId } from "../src/lib/connectionHelpers.mjs";
import { KNOWN_TOOL_IDS, toolUsageDetail } from "../src/lib/toolUsage.mjs";
const pages = JSON.parse(await fs.readFile(new URL("../../data/seo_pages.json", import.meta.url)));

test("все интерактивные помощники имеют каноникал, SSR-таблицу, источники и контролируемые поля", () => {
  assert.deepEqual(
    Object.keys(CONNECTION_HELPERS).sort(),
    [
      "offline-tv",
      "phone-hotspot",
      "tv-airplay-failure",
      "tv-arc-no-sound",
      "tv-cam-module",
      "tv-channel-order",
      "tv-dlna",
      "tv-hdmi-cec",
      "tv-pin-reset",
      "tv-transport",
      "tv-usb-recording",
      "usb-video-codec",
      "universal-remote",
    ].sort(),
  );
  for (const [id, config] of Object.entries(CONNECTION_HELPERS)) {
    const page = pages.find((p) => p.id === id);
    assert.equal(page.guide.steps.length, 3);
    assert.ok(page.guide.sources.length >= 2);
    assert.ok(page.guide.sources.every((s) => s.url.startsWith("https://")));
    assert.equal(config.fields.length, 3);
    for (const [label, options] of config.fields) {
      assert.ok(label.length > 10);
      assert.equal(new Set(options.map(([value]) => value)).size, options.length);
    }
    const toolId = connectionToolId(id);
    assert.ok(KNOWN_TOOL_IDS.includes(toolId));
    assert.deepEqual(toolUsageDetail({ toolId, action: "started", password: "private" }, page.path), { toolId, action: "started", sourcePath: page.path });
  }
});

test("два VESA-интента сохраняют разные данные, дату и каталог", () => {
  for (const id of ["vesa-200x200", "vesa-300x200"]) {
    const page = pages.find((p) => p.id === id);
    assert.equal(page.kind, "vesa");
    assert.equal(page.updated_at, "2026-09-19");
    assert.match(page.facts[0], /см/);
  }
});
