import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/affiliate-health.yml", import.meta.url);
const ordersWorkflowUrl = new URL(
  "../../.github/workflows/affiliate-orders.yml",
  import.meta.url,
);

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
  assert.match(workflow, /affiliate:validate-hubs/);
  assert.match(workflow, /affiliate:check-hubs/);
  assert.match(workflow, /affiliate:publish-hub-snapshot/);
  assert.match(workflow, /data\/affiliate\/public-hub-offers\.json/);
  assert.match(workflow, /data\/affiliate-hub-offers\.json/);
  assert.match(workflow, /affiliate:check-model-manifest/);
  assert.match(workflow, /affiliate:validate-models/);
  assert.match(workflow, /affiliate:check-models/);
  assert.match(workflow, /\.private\/market-affiliate-model-batch\.json/);
  assert.match(workflow, /affiliate:build-model-snapshot/);
  assert.match(workflow, /affiliate:publish-model-snapshot/);
  assert.match(workflow, /affiliate:validate-models-public/);
  assert.match(workflow, /data\/affiliate\/public-model-offers\.json/);
  assert.match(workflow, /data\/affiliate-model-offers\.json/);
  assert.match(workflow, /placement\.model_path/);
});

test("orders workflow keeps raw ledger ephemeral and retains only a safe aggregate", async () => {
  const workflow = await readFile(ordersWorkflowUrl, "utf8");
  const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map(
    (match) => match[1],
  );

  assert.match(workflow, /cron:\s*["']41 3 \* \* \*["']/);
  assert.equal(actions.length, 3);
  for (const action of actions) {
    assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/);
  }
  assert.match(
    workflow,
    /actions\/checkout@[0-9a-f]{40}[\s\S]*?persist-credentials:\s*false/,
  );
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /affiliate:orders-sync[\s\S]*?> \/dev\/null/);
  assert.match(workflow, /affiliate:orders-aggregate/);
  assert.match(
    workflow,
    /aggregate_path="\.private\/affiliate-orders\/aggregates\/\$\{month\}\.json"/,
  );
  assert.match(
    workflow,
    /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/,
  );
  assert.match(workflow, /path:\s*\$\{\{ steps\.aggregate\.outputs\.path \}\}/);
  assert.match(workflow, /if-no-files-found:\s*error/);
  assert.match(workflow, /retention-days:\s*90/);
  assert.match(workflow, /include-hidden-files:\s*true/);
  assert.match(workflow, /affiliate:check-model-manifest/);
  assert.match(workflow, /affiliate:validate-models/);
  assert.match(
    workflow,
    /--model-placements\s+data\/affiliate\/model-page-placements\.json/,
  );
  assert.match(workflow, /if:\s*always\(\)[\s\S]*?rm -rf \.private\/affiliate-orders/);
  const uploadStep = workflow.match(
    /- name: Сохранить только обезличенный агрегат[\s\S]*?(?=\n\s+- name: Уничтожить временный реестр)/,
  )?.[0] ?? "";
  assert.ok(uploadStep);
  assert.doesNotMatch(
    uploadStep,
    /state\.json|latest\.json|\/reports\/|affiliate-orders\/$|\*|order_key|orderId/i,
  );
  assert.doesNotMatch(
    workflow,
    /actions\/cache|git push|contents:\s*write/,
  );

  const oauthReferences = workflow.match(
    /\$\{\{\s*secrets\.YANDEX_MARKET_AFFILIATE_OAUTH\s*\}\}/g,
  ) ?? [];
  const hmacReferences = workflow.match(
    /\$\{\{\s*secrets\.KREPITV_ORDER_HMAC_SECRET\s*\}\}/g,
  ) ?? [];
  assert.equal(oauthReferences.length, 1);
  assert.equal(hmacReferences.length, 1);
});
