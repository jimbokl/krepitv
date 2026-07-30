import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbidden = [
  /\bLoading\b/,
  /\bSearch\b/,
  /\bSubmit\b/,
  /\bNext\b/,
  /\bPrevious\b/,
  /\bLearn more\b/,
  /\bSign in\b/,
  /\bGet started\b/,
  /\blorem ipsum\b/i,
];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const absolute = path.join(directory, entry);
    if ((await stat(absolute)).isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

const files = [
  ...(await walk(path.join(root, "src"))),
  ...(await walk(path.join(root, "modeli"))).filter((file) => file.endsWith(".html")),
  path.join(root, "index.html"),
  path.join(root, "podbor/index.html"),
];

for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      throw new Error(`Английская служебная строка ${pattern} в ${path.relative(root, file)}`);
    }
  }
  if (file.endsWith(".html") && !/<html\s+lang=["']ru["']/.test(text)) {
    throw new Error(`В ${path.relative(root, file)} не указан lang=ru`);
  }
}

console.log("Публичные исходники проверены: служебные английские строки не найдены");
