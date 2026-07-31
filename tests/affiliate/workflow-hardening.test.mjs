import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/affiliate-health.yml", import.meta.url);

test("affiliate workflow is scheduled with pinned actions and one scoped OAuth step", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);

  assert.match(workflow, /cron:\s*["']17 4,16 \* \* \*["']/);
  assert.ok(actions.length >= 4);
  for (const action of actions) {
    assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/);
  }
  assert.doesNotMatch(workflow, /uses:\s*[^\s#]+@(?:v\d+|stable)\b/);
  assert.match(
    workflow,
    /actions\/checkout@[0-9a-f]{40}[\s\S]*?persist-credentials:\s*false/,
  );

  const oauthReferences = workflow.match(
    /\$\{\{\s*secrets\.YANDEX_MARKET_AFFILIATE_OAUTH\s*\}\}/g,
  ) ?? [];
  assert.equal(oauthReferences.length, 1);
  assert.ok(
    workflow.indexOf("Проверить карточки с повторами") <
      workflow.indexOf("Установить зависимости интерфейса"),
  );
  assert.match(workflow, /GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.match(workflow, /gh auth setup-git\s*\n\s*git push origin HEAD:main/);
});
