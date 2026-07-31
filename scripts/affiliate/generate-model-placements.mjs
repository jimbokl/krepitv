#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateModelPlacementManifest } from "./model-placements.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaults = {
  source: path.join(root, "data/affiliate/market-products.json"),
  models: path.join(root, "data/tv_models.json"),
  mounts: path.join(root, "data/mounts.json"),
  output: path.join(root, "data/affiliate/model-page-placements.json"),
};

function usage() {
  return [
    "Usage:",
    "  node scripts/affiliate/generate-model-placements.mjs --out [path]",
    "  node scripts/affiliate/generate-model-placements.mjs --check [path]",
    "Optional inputs:",
    "  --source path --models path --mounts path",
    "Without a path, --out/--check use data/affiliate/model-page-placements.json.",
  ].join("\n");
}

function optionalPath(args, index, fallback) {
  const next = args[index + 1];
  return next && !next.startsWith("--")
    ? { value: path.resolve(next), consumed: 1 }
    : { value: fallback, consumed: 0 };
}

export function parseGenerateModelPlacementArgs(args) {
  const result = {
    source: defaults.source,
    models: defaults.models,
    mounts: defaults.mounts,
    mode: null,
    output: defaults.output,
  };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (!["--source", "--models", "--mounts", "--out", "--check"].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}\n${usage()}`);
    }
    if (seen.has(flag)) throw new Error(`Duplicate argument: ${flag}\n${usage()}`);
    seen.add(flag);

    if (["--source", "--models", "--mounts"].includes(flag)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${flag}\n${usage()}`);
      }
      result[flag.slice(2)] = path.resolve(value);
      index += 1;
      continue;
    }

    if (result.mode !== null) {
      throw new Error("Choose exactly one of --out or --check");
    }
    result.mode = flag.slice(2);
    const parsed = optionalPath(args, index, defaults.output);
    result.output = parsed.value;
    index += parsed.consumed;
  }
  if (!result.mode) throw new Error(`Choose --out or --check\n${usage()}`);
  return result;
}

async function readJson(file) {
  const raw = await readFile(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${file}: invalid JSON`);
  }
}

export async function runGenerateModelPlacements(args = process.argv.slice(2)) {
  const options = parseGenerateModelPlacementArgs(args);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return { status: "help" };
  }
  const [source, models, catalogMounts] = await Promise.all([
    readJson(options.source),
    readJson(options.models),
    readJson(options.mounts),
  ]);
  const manifest = generateModelPlacementManifest({ source, models, catalogMounts });
  const canonical = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.mode === "check") {
    const current = await readFile(options.output, "utf8").catch((error) => {
      if (error?.code === "ENOENT") {
        throw new Error(`${options.output}: generated manifest is missing`);
      }
      throw error;
    });
    if (current !== canonical) {
      throw new Error(
        `${options.output}: does not exactly match deterministic model placements; run with --out`,
      );
    }
    process.stdout.write(
      `Model placement manifest is current: ${manifest.models.length} models, ${manifest.expected_offer_count} offers\n`,
    );
    return { status: "current", manifest, output: options.output };
  }

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, canonical, "utf8");
  process.stdout.write(
    `Generated ${manifest.expected_offer_count} placements for ${manifest.models.length} models -> ${options.output}\n`,
  );
  return { status: "written", manifest, output: options.output };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await runGenerateModelPlacements();
}
