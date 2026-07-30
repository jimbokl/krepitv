import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("browser checker requires a saved Chrome window ID and a validated tab index", async () => {
  const source = await readFile(
    path.join(root, "scripts/affiliate/check-market-links-chrome.mjs"),
    "utf8",
  );

  assert.match(source, /\.private\/chrome-window-id/);
  assert.match(source, /await readFile\(chromeWindowIdFile,/);
  assert.match(
    source,
    /Number\.isSafeInteger\(chromeWindowId\) \|\| chromeWindowId <= 0/,
  );
  assert.match(source, /--chrome-tab-index/);
  assert.match(source, /chromeTabIndexValue === null \? null : Number/);
  assert.doesNotMatch(source, /--chrome-tab-index"\) \?\?/);
  assert.match(
    source,
    /Number\.isSafeInteger\(chromeTabIndex\) \|\| chromeTabIndex <= 0/,
  );
  assert.match(
    source,
    /String\(chromeWindowId\), String\(chromeTabIndex\)/,
  );
});

test("Chrome AppleScript targets only the saved window ID and tab index", async () => {
  const source = await readFile(
    path.join(root, "scripts/affiliate/chrome-market-request.applescript"),
    "utf8",
  );

  assert.match(source, /if \(count of argv\) is not 4/);
  assert.match(source, /set targetWindowId to \(item 3 of argv\) as integer/);
  assert.match(source, /set targetTabIndex to \(item 4 of argv\) as integer/);
  assert.match(source, /set targetWindow to window id targetWindowId/);
  assert.match(source, /set targetTab to tab targetTabIndex of targetWindow/);

  assert.doesNotMatch(source, /repeat\s+with\b/i);
  assert.doesNotMatch(source, /\bevery\s+(?:window|tab)s?\b/i);
  assert.doesNotMatch(source, /\bin\s+(?:window|tab)s\b/i);
  assert.doesNotMatch(source, /\bactive\s+tab\b/i);
  assert.doesNotMatch(source, /\bwindow\s+1\b/i);
});
