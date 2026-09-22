import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.QA_BASE_URL ?? "http://127.0.0.1:4173";
const run = ".design-harness/runs/20260922-seo-10-20260922";
const outputDir = `${run}/evidence/screenshots`;
const viewports = { mobile: [320, 800], tablet: [768, 1024], desktop: [1440, 900] };
const pages = [
  ["usb-video-codec", "/televizor-ne-vosproizvodit-video-s-fleshki/"],
  ["tv-dlna", "/kak-smotret-video-s-kompyutera-na-televizore-po-seti/"],
  ["tv-usb-recording", "/kak-zapisat-peredachu-s-televizora-na-fleshku/"],
  ["tv-channel-order", "/kak-uporyadochit-kanaly-na-televizore/"],
  ["tv-hdmi-cec", "/hdmi-cec-na-televizore/"],
  ["tv-airplay-failure", "/ne-rabotaet-airplay-na-televizore/"],
  ["tv-transport", "/kak-perevozit-televizor/"],
  ["tv-cam-module", "/cam-modul-dlya-televizora/"],
  ["tv-pin-reset", "/zabyl-pin-kod-televizora/"],
  ["tv-arc-no-sound", "/net-zvuka-cherez-hdmi-arc/"],
];
const jobs = [];
for (const [id, route] of pages) {
  for (const viewport of Object.keys(viewports)) jobs.push({ id, route, viewport, state: "success" });
}
for (const state of ["default", "empty", "disabled", "focus", "loading", "error", "needs-review"]) {
  jobs.push({ id: pages[0][0], route: pages[0][1], viewport: "mobile", state });
}

await mkdir(outputDir, { recursive: true });
const results = [];

async function execute(job) {
  const [width, height] = viewports[job.viewport];
  const output = `${outputDir}/${job.id}-${job.viewport}-${job.state}.png`;
  const selector = ["success", "needs-review", "error"].includes(job.state)
    ? "[data-connection-result]"
    : "[data-connection-helper]";
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "scripts/qa/capture-page.mjs",
      "--url", base + job.route,
      "--width", String(width),
      "--height", String(height),
      "--connection-state", job.state,
      "--selector", selector,
      "--output", output,
    ], { stdio: ["ignore", "pipe", "pipe"] });
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

for (let index = 0; index < jobs.length; index += 3) {
  await Promise.all(jobs.slice(index, index + 3).map(execute));
}
await writeFile(path.join(run, "browser-results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(`PASS ${results.length} browser states across 10 tools and 3 viewports`);
