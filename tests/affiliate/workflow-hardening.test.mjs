import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/affiliate-health.yml", import.meta.url);
const ordersWorkflowUrl = new URL(
  "../../.github/workflows/affiliate-orders.yml",
  import.meta.url,
);
const pagesWorkflowUrl = new URL(
  "../../.github/workflows/pages.yml",
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
  assert.match(workflow, /actions\/configure-pages@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/upload-pages-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /pages\/builds/);
});

test("Pages deploys only the committed production artifact", async () => {
  const workflow = await readFile(pagesWorkflowUrl, "utf8");
  const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map(
    (match) => match[1],
  );

  assert.equal(actions.length, 4);
  for (const action of actions) {
    assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/);
  }
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(
    workflow,
    /push:[\s\S]*?branches:[\s\S]*?- main[\s\S]*?paths:[\s\S]*?- "docs\/\*\*"/,
  );
  assert.doesNotMatch(workflow, /schedule:|\.private|secrets\.|npm run|cargo|wasm/);
  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(
    workflow,
    /permissions:[\s\S]*?contents:\s*read[\s\S]*?pages:\s*write[\s\S]*?id-token:\s*write/,
  );
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /actions\/upload-pages-artifact@[0-9a-f]{40}[\s\S]*?path:\s*docs/);
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
  assert.match(workflow, /affiliate:orders-winners/);
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
  assert.match(
    workflow,
    /affiliate:orders-winners[\s\S]*?--manifest\s+data\/affiliate\/market-products\.json[\s\S]*?--hub-placements\s+data\/affiliate\/seo-hub-placements\.json[\s\S]*?--model-placements\s+data\/affiliate\/model-page-placements\.json/,
  );
  assert.match(workflow, /echo "path=\$aggregate_path" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /aggregate\.attribution_winners\.rows/);
  assert.match(workflow, /winner\.approved_payment_kopecks/);
  assert.match(workflow, /if:\s*always\(\)[\s\S]*?rm -rf \.private\/affiliate-orders/);
  const uploadStep = workflow.match(
    /- name: Сохранить только обезличенный агрегат[\s\S]*?(?=\n\s+- name: Уничтожить временный реестр)/,
  )?.[0] ?? "";
  assert.ok(uploadStep);
  assert.doesNotMatch(
    uploadStep,
    /state\.json|latest\.json|\/reports\/|affiliate-orders\/$|\*|order_key|orderId|placement_id|\bvid\b|\bclid\b|oauth|hmac/i,
  );
  assert.match(
    uploadStep,
    /path:\s*\$\{\{ steps\.aggregate\.outputs\.path \}\}/,
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

test("orders winners CLI is documented and keeps the legacy aggregate command", async () => {
  const [packageJson, cliSource] = await Promise.all([
    readFile(new URL("../../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(
      new URL("../../scripts/affiliate/report-orders.mjs", import.meta.url),
      "utf8",
    ),
  ]);
  assert.equal(
    packageJson.scripts["affiliate:orders-winners"],
    "node scripts/affiliate/report-orders.mjs --aggregate-only",
  );
  assert.equal(
    packageJson.scripts["affiliate:orders-aggregate"],
    "node scripts/affiliate/report-orders.mjs --aggregate-only",
  );
  assert.match(cliSource, /upload-safe totals and attribution winners/);
  assert.match(cliSource, /--manifest/);
  assert.match(cliSource, /--hub-placements/);
  assert.match(cliSource, /--model-placements/);

  const cli = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../../scripts/affiliate/report-orders.mjs", import.meta.url),
      ),
      "--help",
    ],
    { encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /--aggregate-only/);
  assert.match(cli.stdout, /attribution winners without private identifiers/);
});
