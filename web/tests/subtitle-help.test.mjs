import assert from "node:assert/strict";
import test from "node:test";
import { APPEARANCES, OBSERVATIONS, SOURCES, SUBTITLE_HELP, cleanSubtitleAnswers, readSubtitlePlan, subtitleHelpText } from "../src/lib/subtitleHelp.mjs";
import { subtitleInteractionDetail, emitSubtitleInteraction } from "../src/lib/subtitleInteraction.mjs";

test("helper accepts only closed choices, never stored personal fields", () => {
  assert.deepEqual(cleanSubtitleAnswers({ appearance: "notice", source: "youtube", observation: "sidecar", goal: "delete", email: "private" }), { appearance: "notice", source: "youtube", observation: "", goal: "disable" });
  assert.equal(APPEARANCES.length, 4);
  for (const source of SOURCES) assert.ok(OBSERVATIONS[source.id].some(item => item.id === "unclear"));
  assert.equal(cleanSubtitleAnswers({ source: "youtube", goal: "enable", observation: "no_text" }).observation, "no_text");
  assert.equal(cleanSubtitleAnswers({ source: "youtube", goal: "disable", observation: "no_text" }).observation, "");
});

test("every Rust route has a complete independent instruction for both goals", () => {
  for (const route of ["broadcast", "teletext", "notice", "youtube", "app", "external", "usb_track", "usb_file", "video_check", "tv_possible", "unknown"]) {
    for (const goal of ["disable", "enable"]) {
      const plan = readSubtitlePlan({ route, goal });
      assert.ok(plan.title && plan.action && plan.check && plan.next);
      assert.match(subtitleHelpText(plan), /#istochniki/u);
    }
  }
  assert.match(subtitleHelpText(readSubtitlePlan({ route: "youtube", goal: "disable" }), "", "youtube-tv-subtitles"), /subtitry-youtube-na-televizore\/#istochniki/u);
  for (const value of [null, {}, { route: "invented", goal: "disable" }, { route: "broadcast", goal: "delete" }]) assert.throws(() => readSubtitlePlan(value));
});

test("official platform paths have scopes, HTTPS and no brand-to-OS inference", () => {
  assert.equal(SUBTITLE_HELP.platforms.length, 7);
  for (const platform of SUBTITLE_HELP.platforms) {
    assert.ok(platform.scope && platform.path && platform.label);
    assert.match(platform.url, /^https:\/\/(www\.samsung\.com|www\.lg\.com|support\.google\.com)\//u);
  }
  const plan = readSubtitlePlan({ route: "broadcast", goal: "disable" });
  assert.match(subtitleHelpText(plan, "lg-26"), /Функции слуха/u);
  assert.doesNotMatch(subtitleHelpText(readSubtitlePlan({ route: "app", goal: "disable" }), "lg-26"), /Функции слуха/u);
});

test("subtitle interaction is closed, bounded, and cannot carry answers or personal input", () => {
  const safe = { action: "reason", step: "result", route: "notice", reason: "text_remains", attempt: 2 };
  assert.deepEqual(subtitleInteractionDetail({ ...safe, text: "private", email: "private" }), safe);
  for (const change of [{ action: "whatever" }, { route: "unknown-path" }, { reason: "private" }, { attempt: 0 }, { attempt: 1.5 }, { attempt: 1001 }, { step: "free_text" }]) assert.equal(subtitleInteractionDetail({ ...safe, ...change }), null);
  const events = [];
  assert.equal(emitSubtitleInteraction({ CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent: e => events.push(e) }, safe), true);
  assert.deepEqual(events[0].detail, safe);
  assert.equal(emitSubtitleInteraction(null, safe), false);
});
