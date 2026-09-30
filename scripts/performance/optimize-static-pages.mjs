import Beasties from "beasties";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { responsiveImages } from "./responsive-images.mjs";

export function addResponsiveImages(html) {
  function enhanceTag(tag, kind) {
    if (tag.includes("data-responsive-image=")) return tag;
    const match = tag.match(/(?:src|srcset)="\/assets\/images\/([^"/]+)\.(webp|avif|png)"/u);
    const image = match && responsiveImages[match[1]];
    if (!image) return tag;
    const format = kind === "source" && match[2] === "avif" ? "avif" : "webp";
    const srcset = image.widths.map((width) => `/assets/images/${match[1]}-${width}.${format} ${width}w`).join(", ");
    const clean = tag.replace(/\s(?:srcset|sizes)="[^"]*"/gu, "");
    return clean.replace(/>$/u, ` srcset="${srcset}" sizes="${image.sizes}" data-responsive-image="true">`);
  }
  return html.replace(/<picture\b[\s\S]*?<\/picture>|<img\b[^>]*>/gu, (block) => {
    if (block.startsWith("<picture")) {
      return block.replace(/<(img|source)\b[^>]*>/gu, enhanceTag);
    }
    const enhanced = enhanceTag(block, "img");
    if (enhanced === block) return block;
    const name = block.match(/src="\/assets\/images\/([^"/]+)\.(?:webp|avif|png)"/u)?.[1];
    const image = responsiveImages[name];
    const srcset = image.widths.map((width) => `/assets/images/${name}-${width}.avif ${width}w`).join(", ");
    // display:contents preserves the original image's grid/flex sizing.
    return `<picture style="display:contents"><source type="image/avif" srcset="${srcset}" sizes="${image.sizes}" data-responsive-image="true">${enhanced}</picture>`;
  });
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith(".html") ? [file] : [];
  }));
  return nested.flat();
}

export async function optimizeStaticPages(directory) {
  const root = directory instanceof URL ? fileURLToPath(directory) : directory;
  const optimizer = new Beasties({
    path: root,
    publicPath: "/",
    preload: "swap",
    noscriptFallback: true,
    inlineFonts: true,
    preloadFonts: false,
    pruneSource: false,
    reduceInlineStyles: false,
    logLevel: "silent",
  });
  const files = await htmlFiles(root);
  let optimizedCount = 0;
  for (const file of files) {
    const original = await readFile(file, "utf8");
    if (original.includes('data-critical-css="true"')) continue;
    // Verification documents have no stylesheet and must remain byte-identical.
    if (!/<link\b[^>]*\brel="stylesheet"/u.test(original)) continue;
    let optimized = await optimizer.process(addResponsiveImages(original));
    optimized = optimized.replace("<style>", '<style data-critical-css="true">');
    // The LCP heading uses this small Cyrillic face. Other fonts load on demand.
    const fonts = [...new Set([...optimized.matchAll(/url\(["']?(\/assets\/roboto-condensed-cyrillic-800-normal-[^)"']+\.woff2)["']?\)/gu)].map((match) => match[1]))];
    optimized = optimized.replace("</head>", `${fonts.map((href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`).join("")}\n</head>`);
    await writeFile(file, optimized);
    optimizedCount += 1;
  }
  console.log(`Критический CSS и адаптивные изображения: ${optimizedCount} HTML-страниц`);
}
