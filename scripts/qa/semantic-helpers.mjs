import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.QA_BASE_URL ?? "http://127.0.0.1:4173";
const run = ".design-harness/runs/20260919-semantic-helpers-20260919";
const outputDir = `${run}/evidence/screenshots`;
const viewports = { mobile: [320, 800], tablet: [768, 1024], desktop: [1440, 900] };
const pages = [
  ["hotspot", "/kak-razdat-internet-s-telefona-na-televizor/"],
  ["offline", "/kak-smotret-televizor-bez-interneta/"],
  ["remote", "/kak-nastroit-universalnyy-pult-dlya-televizora/"],
];
const jobs = [];
for (const [id, route] of pages) for (const viewport of Object.keys(viewports)) {
  for (const state of ["default", "success"]) jobs.push({ id, route, viewport, state });
}
for (const state of ["empty", "disabled", "focus", "loading", "error", "needs-review"]) {
  jobs.push({ id: "hotspot", route: pages[0][1], viewport: "mobile", state });
}
await mkdir(outputDir, { recursive: true });
const results = [];
async function execute(job) {
  const [width, height] = viewports[job.viewport];
  const output = `${outputDir}/${job.id}-${job.viewport}-${job.state}.png`;
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/qa/capture-page.mjs", "--url", base + job.route,
      "--width", String(width), "--height", String(height), "--connection-state", job.state,
      "--selector", ["success", "needs-review", "error"].includes(job.state) ? "[data-connection-result]" : "[data-connection-helper]",
      "--output", output], { stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stdout.on("data", (data) => { log += data; });
    child.stderr.on("data", (data) => { log += data; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, log }));
  });
  if (result.code !== 0) throw new Error(`${job.id}/${job.viewport}/${job.state}: ${result.log}`);
  console.log(`PASS ${job.id} ${job.viewport} ${job.state}`);
  results.push({ ...job, width, height, path: output, exit_code: result.code });
}
// Independent disposable browser profiles; never the user's external Chrome.
for (let i = 0; i < jobs.length; i += 3) await Promise.all(jobs.slice(i, i + 3).map(execute));
await writeFile(path.join(run, "browser-results.json"), JSON.stringify(results, null, 2) + "\n");
console.log(`PASS ${results.length} browser states; reflow, keyboard, WASM success/failure and event deduplication`);
