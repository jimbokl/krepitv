import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const buildScript = path.join(projectRoot, "scripts/build-wasm.mjs");
const packageDirectory = path.join(projectRoot, "web/public/pkg");
const packageFiles = [
  "krepitv_engine.js",
  "krepitv_engine.d.ts",
  "krepitv_engine_bg.wasm",
  "krepitv_engine_bg.wasm.d.ts",
  "package.json",
];

function build() {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function snapshot() {
  return new Map(
    packageFiles.map((name) => {
      const contents = readFileSync(path.join(packageDirectory, name));
      return [name, createHash("sha256").update(contents).digest("hex")];
    }),
  );
}

build();
const first = snapshot();
build();
const second = snapshot();
const changed = packageFiles.filter((name) => first.get(name) !== second.get(name));
if (changed.length) {
  throw new Error(`Повторная WASM-сборка изменила файлы: ${changed.join(", ")}`);
}

console.log("WASM package воспроизводим при повторной сборке");
