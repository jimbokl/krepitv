import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const source = new URL("../web/dist/client/", import.meta.url);
const target = new URL("../docs/", import.meta.url);

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
// wasm-pack creates a package-local `*` rule. It is useful for npm packaging,
// but would silently remove the runtime from a GitHub Pages commit.
await rm(new URL("pkg/.gitignore", target), { force: true });
await writeFile(new URL("CNAME", target), "krepitv.ru\n", "utf8");
await writeFile(new URL(".nojekyll", target), "", "utf8");

console.log("Статический релиз подготовлен в docs/");
