import { cp, mkdir, writeFile } from "node:fs/promises";

const source = new URL("../web/dist/client/", import.meta.url);
const target = new URL("../docs/", import.meta.url);

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await writeFile(new URL("CNAME", target), "krepitv.ru\n", "utf8");
await writeFile(new URL(".nojekyll", target), "", "utf8");

console.log("Статический релиз подготовлен в docs/");
