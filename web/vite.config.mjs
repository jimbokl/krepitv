import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function collectHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", "public"].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(absolute);
    return entry.name === "index.html" || (directory === root && entry.name === "404.html")
      ? [absolute]
      : [];
  });
}

const htmlInputs = Object.fromEntries(
  collectHtmlFiles(root).map((file) => [
    path.relative(root, file)
      .replace(/^404\.html$/, "404")
      .replace(/\/index\.html$/, "")
      .replace(/\//g, "-") || "главная",
    file,
  ]),
);

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist/client",
    rollupOptions: {
      input: htmlInputs,
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
