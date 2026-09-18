import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { INTENT_TOOLS, INTENT_TOOL_IDS } from "../src/lib/intentTools.mjs";
import { KNOWN_TOOL_IDS, toolUsageDetail } from "../src/lib/toolUsage.mjs";
import { resultCompletedDetail } from "../src/lib/resultCompleted.mjs";

const pages = JSON.parse(await readFile(new URL("../../data/seo_pages.json", import.meta.url), "utf8"));
const byId = new Map(pages.map((page) => [page.id, page]));

test("двадцать интерактивных проверок привязаны к отдельным существующим страницам с источниками", () => {
  assert.equal(INTENT_TOOL_IDS.length, 20);
  assert.equal(new Set(INTENT_TOOL_IDS).size, 20);
  for (const id of INTENT_TOOL_IDS) {
    const page = byId.get(id);
    const tool = INTENT_TOOLS[id];
    assert.ok(page, id);
    assert.ok(page.path.startsWith("/") && page.path.endsWith("/"), id);
    assert.equal(page.guide.steps.length, 3, id);
    assert.ok(page.guide.sources.length >= 2, id);
    assert.ok(page.guide.sources.every((source) => source.url.startsWith("https://")), id);
    for (const field of ["title", "question", "success", "failure"]) {
      assert.ok(typeof tool[field] === "string" && tool[field].length > (field === "title" ? 12 : 25), `${id}.${field}`);
    }
  }
});

test("каждый инструмент измеряется только контролируемым ID без пользовательского ввода", () => {
  for (const id of INTENT_TOOL_IDS) {
    const toolId = `intent_${id.replaceAll("-", "_")}`;
    assert.ok(KNOWN_TOOL_IDS.includes(toolId), id);
    assert.deepEqual(toolUsageDetail({ action: "started", toolId, answer: "private" }, byId.get(id).path), {
      action: "started",
      sourcePath: byId.get(id).path,
      toolId,
    });
    assert.deepEqual(resultCompletedDetail({ toolId, resultType: "checked", answer: "private" }, byId.get(id).path), {
      resultType: "checked",
      sourcePath: byId.get(id).path,
      toolId,
    });
  }
});
