import { readFile } from "node:fs/promises";
import path from "node:path";
import { reconcileMetrikaGoals } from "./metrika-goals.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const apply = process.argv.includes("--apply");
const counterId = argument("--counter", process.env.KREPITV_METRIKA_COUNTER_ID ?? "111176777");
const credentialsValue = argument(
  "--credentials",
  process.env.YANDEX_ANALYTICS_CREDENTIALS,
);

if (!credentialsValue) {
  throw new Error("Pass --credentials or YANDEX_ANALYTICS_CREDENTIALS");
}

const credentialsPath = path.resolve(credentialsValue);
const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
const result = await reconcileMetrikaGoals({
  apply,
  counterId,
  token: credentials.access_token,
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.plan.some((item) => item.status !== "satisfied")) {
  process.exitCode = apply ? 1 : 2;
}
