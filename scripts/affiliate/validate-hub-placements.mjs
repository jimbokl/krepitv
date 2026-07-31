#!/usr/bin/env node

import { resolve } from "node:path";
import { readJson } from "./lib.mjs";
import {
  validateHubPlacementManifest,
  validateHubPrivateSnapshot,
  validateHubPublicSnapshot,
} from "./hub-placements.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/affiliate/validate-hub-placements.mjs \\",
    "    --kind manifest|private|public <file> \\",
    "    [--manifest data/affiliate/seo-hub-placements.json]",
  ].join("\n");
}

const args = process.argv.slice(2);
const kindIndex = args.indexOf("--kind");
const kind = kindIndex === -1 ? null : args[kindIndex + 1];
const valueFlags = new Set(["--kind", "--manifest", "--source", "--seo-pages", "--mounts"]);
const positional = [];
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (valueFlags.has(argument)) {
    if (args[index + 1] === undefined || args[index + 1].startsWith("--")) {
      throw new Error(usage());
    }
    index += 1;
  } else positional.push(argument);
}
if (!new Set(["manifest", "private", "public"]).has(kind) || positional.length !== 1) {
  throw new Error(usage());
}

const file = resolve(positional[0]);
const manifestFile = resolve(
  valueAfter(args, "--manifest") ?? "data/affiliate/seo-hub-placements.json",
);
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const seoPagesFile = resolve(valueAfter(args, "--seo-pages") ?? "data/seo_pages.json");
const mountsFile = resolve(valueAfter(args, "--mounts") ?? "data/mounts.json");
const [value, manifest, source, seoPages, catalogMounts] = await Promise.all([
  readJson(file),
  kind === "manifest" && file === manifestFile ? Promise.resolve(null) : readJson(manifestFile),
  readJson(sourceFile),
  readJson(seoPagesFile),
  readJson(mountsFile),
]);
const configuredManifest = kind === "manifest" ? value : manifest;
validateHubPlacementManifest(configuredManifest, {
  source,
  seoPages,
  catalogMounts,
});
if (kind === "private") {
  validateHubPrivateSnapshot(value, { manifest: configuredManifest, source });
} else if (kind === "public") {
  validateHubPublicSnapshot(value, { manifest: configuredManifest, source });
}
console.log(`Valid hub ${kind}: ${file}`);
