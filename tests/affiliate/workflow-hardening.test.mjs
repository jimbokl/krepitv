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
const ciWorkflowUrl = new URL(
  "../../.github/workflows/ci.yml",
  import.meta.url,
);
const nodeVersionUrl = new URL("../../.node-version", import.meta.url);
const rustToolchainUrl = new URL("../../rust-toolchain.toml", import.meta.url);
const rootPackageUrl = new URL("../../package.json", import.meta.url);
const webPackageUrl = new URL("../../web/package.json", import.meta.url);

const node24ActionPins = new Map([
  ["actions/checkout", { sha: "3d3c42e5aac5ba805825da76410c181273ba90b1", version: "v7.0.1" }],
  ["actions/setup-node", { sha: "820762786026740c76f36085b0efc47a31fe5020", version: "v7.0.0" }],
  ["actions/upload-artifact", { sha: "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a", version: "v7.0.1" }],
  ["actions/upload-pages-artifact", { sha: "fc324d3547104276b827a68afc52ff2a11cc49c9", version: "v5.0.0" }],
  ["actions/configure-pages", { sha: "45bfe0192ca1faeb007ade9deae92b16b8254a0d", version: "v6.0.0" }],
  ["actions/deploy-pages", { sha: "368f82528645a54fb793d4d04e342629a3f51346", version: "v5.0.1" }],
]);

test("Vite SSR tests are serialized on constrained GitHub runners", async () => {
  const packageFile = JSON.parse(await readFile(webPackageUrl, "utf8"));
  assert.equal(
    packageFile.scripts?.["test:sites"],
    "node --test --test-concurrency=1 --test-force-exit tests/*.test.mjs",
  );
});

test("official JavaScript actions are pinned to audited Node 24 releases", async () => {
  const workflows = await Promise.all([
    workflowUrl,
    ordersWorkflowUrl,
    pagesWorkflowUrl,
    ciWorkflowUrl,
  ].map((url) => readFile(url, "utf8")));
  const observed = new Map([...node24ActionPins.keys()].map((name) => [name, 0]));

  for (const workflow of workflows) {
    for (const match of workflow.matchAll(
      /^\s*uses:\s*(actions\/[a-z-]+)@([0-9a-f]{40})\s+#\s+(v\d+(?:\.\d+){0,2})\s*$/gm,
    )) {
      const [, action, sha, version] = match;
      const expected = node24ActionPins.get(action);
      if (!expected) continue;
      assert.deepEqual({ sha, version }, expected, `${action} must use its audited Node 24 pin`);
      observed.set(action, observed.get(action) + 1);
    }
  }

  for (const [action, count] of observed) {
    assert.ok(count > 0, `${action} must remain present in the workflow set`);
  }
});

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
  assert.match(
    workflow,
    /install -d -m 700 \.private[\s\S]*?affiliate:check-market/,
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
  assert.match(workflow, /data\/affiliate-model-offers\/\$\{key\}\.json/);
  assert.match(workflow, /data\/tv_models\.json/);
  assert.match(workflow, /samsung-qe/);
  assert.match(workflow, /samsung-ue/);
  assert.doesNotMatch(
    workflow,
    /models\.map\(\(model\) => model\.id\.split\("-", 1\)\[0\]\)/,
  );
  assert.match(workflow, /placement\.model_path/);
  assert.match(workflow, /actions\/configure-pages@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/upload-pages-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /pages\/builds/);
});

test("Pages builds and deploys the current source artifact", async () => {
  const [workflow, packageFile] = await Promise.all([
    readFile(pagesWorkflowUrl, "utf8"),
    readFile(rootPackageUrl, "utf8").then(JSON.parse),
  ]);
  const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map(
    (match) => match[1],
  );

  assert.equal(actions.length, 7);
  for (const action of actions) {
    assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/);
  }
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(
    workflow,
    /push:[\s\S]*?branches:[\s\S]*?- main[\s\S]*?paths:[\s\S]*?- "crates\/\*\*"[\s\S]*?- "docs\/\*\*"/,
  );
  assert.doesNotMatch(workflow, /schedule:|\.private|secrets\.|git push/);
  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(
    workflow,
    /build:[\s\S]*?permissions:\s*\n\s*contents:\s*read/,
  );
  assert.match(
    workflow,
    /deploy:[\s\S]*?needs:\s*build[\s\S]*?permissions:[\s\S]*?pages:\s*write[\s\S]*?id-token:\s*write/,
  );
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /node-version-file:\s*\.node-version/);
  assert.match(workflow, /toolchain:\s*1\.93\.1/);
  assert.match(workflow, /wasm-pack --version 0\.13\.1 --locked/);
  assert.match(workflow, /npm --prefix web ci --no-audit --no-fund/);
  assert.equal(
    packageFile.scripts?.["build:release"],
    "node scripts/clean.mjs && npm run build:content && npm run build:wasm && npm run build:web && npm run build:publish",
  );
  assert.equal(
    packageFile.scripts?.build,
    "npm run build:release && npm run verify",
  );
  assert.match(workflow, /npm run build:release/);
  assert.doesNotMatch(workflow, /run:\s*npm run build\s*(?:\n|$)/);
  assert.match(
    workflow,
    /git diff --exit-code -- \. ':\(exclude\)docs\/pkg\/krepitv_engine_bg\.wasm'/,
  );
  assert.match(
    workflow,
    /cmp -s web\/public\/pkg\/krepitv_engine_bg\.wasm docs\/pkg\/krepitv_engine_bg\.wasm/,
  );
  assert.match(workflow, /actions\/upload-pages-artifact@[0-9a-f]{40}[\s\S]*?path:\s*docs/);
  assert.ok(workflow.indexOf("npm run build:release") < workflow.indexOf("actions/upload-pages-artifact"));
  assert.ok(workflow.indexOf("actions/upload-pages-artifact") < workflow.indexOf("deploy:"));
});

test("source CI runs the complete pinned build without deploy or secrets", async () => {
  const [workflow, nodeVersion, rustToolchain] = await Promise.all([
    readFile(ciWorkflowUrl, "utf8"),
    readFile(nodeVersionUrl, "utf8").then((value) => value.trim()),
    readFile(rustToolchainUrl, "utf8"),
  ]);
  const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map(
    (match) => match[1],
  );

  assert.equal(nodeVersion, "22.23.2");
  assert.match(rustToolchain, /channel\s*=\s*"1\.93\.1"/);
  assert.match(rustToolchain, /components\s*=\s*\["rustfmt"\]/);
  assert.match(rustToolchain, /targets\s*=\s*\["wasm32-unknown-unknown"\]/);

  assert.equal(actions.length, 4);
  for (const action of actions) {
    assert.match(action, /^[^@\s]+@[0-9a-f]{40}$/);
  }
  assert.match(workflow, /push:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(workflow, /pull_request:[\s\S]*?paths:/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /node-version-file:\s*\.node-version/);
  assert.match(workflow, /toolchain:\s*1\.93\.1/);
  assert.match(workflow, /components:\s*rustfmt/);
  assert.match(workflow, /targets:\s*wasm32-unknown-unknown/);
  assert.match(workflow, /wasm-pack --version 0\.13\.1 --locked/);
  assert.match(workflow, /npm --prefix web ci --no-audit --no-fund/);
  assert.match(workflow, /npm run build/);
  assert.match(
    workflow,
    /git diff --exit-code -- \. ':\(exclude\)docs\/pkg\/krepitv_engine_bg\.wasm'/,
  );
  assert.match(
    workflow,
    /cmp -s web\/public\/pkg\/krepitv_engine_bg\.wasm docs\/pkg\/krepitv_engine_bg\.wasm/,
  );
  assert.match(workflow, /timeout-minutes:\s*20/);
  assert.doesNotMatch(
    workflow,
    /secrets\.|contents:\s*write|pages:\s*write|id-token:\s*write|deploy-pages|upload-pages-artifact|git push/,
  );
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
    /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/,
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
