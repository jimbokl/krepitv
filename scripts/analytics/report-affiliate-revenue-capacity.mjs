import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildAffiliateRevenueCapacity } from "./affiliate-revenue-capacity.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function readJson(value, name) {
  if (!value) throw new Error(`Pass ${name}`);
  return JSON.parse(await readFile(path.resolve(value), "utf8"));
}

const offersPath = argument("--offers");
const ordersPath = argument("--orders");
const metrikaPath = argument("--metrika");
const outputValue = argument("--out");
const generatedAtValue = argument("--generated-at");

const [offerSnapshot, ordersAggregate, metrikaReport] = await Promise.all([
  readJson(offersPath, "--offers"),
  readJson(ordersPath, "--orders"),
  readJson(metrikaPath, "--metrika"),
]);
const report = buildAffiliateRevenueCapacity({
  generatedAt: generatedAtValue ? new Date(generatedAtValue) : new Date(),
  metrikaReport,
  offerSnapshot,
  ordersAggregate,
});
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (outputValue) {
  const outputPath = path.resolve(outputValue);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, { mode: 0o600 });
  await chmod(outputPath, 0o600);
}
process.stdout.write(serialized);

