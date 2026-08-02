import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const cargoHome = path.resolve(process.env.CARGO_HOME ?? path.join(homedir(), ".cargo"));
const outputDirectory = path.join(projectRoot, "web/public/pkg");

if (process.env.RUSTFLAGS?.trim() && !process.env.CARGO_ENCODED_RUSTFLAGS) {
  throw new Error(
    "Для воспроизводимой WASM-сборки передавайте внешние флаги через CARGO_ENCODED_RUSTFLAGS, а не RUSTFLAGS",
  );
}

const inheritedFlags = (process.env.CARGO_ENCODED_RUSTFLAGS ?? "")
  .split("\u001f")
  .filter(Boolean);
const environment = {
  ...process.env,
  CARGO_ENCODED_RUSTFLAGS: [
    ...inheritedFlags,
    `--remap-path-prefix=${projectRoot}=/workspace`,
    `--remap-path-prefix=${cargoHome}=/cargo`,
  ].join("\u001f"),
  SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || "0",
};
delete environment.RUSTFLAGS;

const result = spawnSync(
  "wasm-pack",
  [
    "build",
    path.join(projectRoot, "crates/engine"),
    "--target",
    "web",
    "--out-dir",
    outputDirectory,
    "--release",
    "--",
    "--locked",
  ],
  {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const forbiddenPaths = [projectRoot, cargoHome].map((value) => Buffer.from(value));
for (const entry of readdirSync(outputDirectory, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = path.join(outputDirectory, entry.name);
  const contents = readFileSync(file);
  if (forbiddenPaths.some((value) => contents.includes(value))) {
    throw new Error(`WASM package содержит машинный абсолютный путь: ${entry.name}`);
  }
}
