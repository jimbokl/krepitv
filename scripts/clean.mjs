import { rm } from "node:fs/promises";

await rm(new URL("../docs", import.meta.url), { recursive: true, force: true });
await rm(new URL("../web/dist", import.meta.url), { recursive: true, force: true });
