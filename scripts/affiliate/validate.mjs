#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJson,
  validateBatch,
  validateSnapshot,
  validateSource,
} from "./lib.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/affiliate/validate.mjs --kind source|batch|snapshot <file>",
    "  add --allow-example-hosts only for tests/fixtures",
  ].join("\n");
}

const args = process.argv.slice(2);
const kindIndex = args.indexOf("--kind");
const allowExampleHosts = args.includes("--allow-example-hosts");
const positional = args.filter((arg, index) => {
  if (arg === "--allow-example-hosts") return false;
  if (arg === "--kind" || index === kindIndex + 1) return false;
  return true;
});

if (kindIndex === -1 || !args[kindIndex + 1] || positional.length !== 1) {
  throw new Error(usage());
}

const kind = args[kindIndex + 1];
const validators = {
  source: validateSource,
  batch: validateBatch,
  snapshot: validateSnapshot,
};
if (!(kind in validators)) throw new Error(usage());

const file = resolve(positional[0]);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = path.join(root, "tests/fixtures");
if (
  allowExampleHosts &&
  file !== fixtureRoot &&
  !file.startsWith(`${fixtureRoot}${path.sep}`)
) {
  throw new Error("--allow-example-hosts is restricted to tests/fixtures");
}
const data = await readJson(file);
validators[kind](data, { allowExampleHosts });
console.log(`Valid ${kind}: ${file}`);
