import sharp from "sharp";
import { fileURLToPath } from "node:url";

export const responsiveImages = {
  "home-hero-model": { widths: [480, 800, 1240], sizes: "(min-width: 1024px) 48vw, 100vw" },
  "home-step-model": { widths: [320, 640, 960], sizes: "(min-width: 1024px) 32vw, (min-width: 640px) 45vw, 100vw" },
  "home-step-wall": { widths: [320, 640, 960], sizes: "(min-width: 1024px) 32vw, (min-width: 640px) 45vw, 100vw" },
  "home-step-height": { widths: [320, 640, 960], sizes: "(min-width: 1024px) 32vw, (min-width: 640px) 45vw, 100vw" },
  "mount-wall-system": { widths: [320, 640, 960], sizes: "(min-width: 1024px) 12vw, (min-width: 640px) 20vw, 35vw" },
};

export async function generateResponsiveImages(root = new URL("../../web/public/assets/images/", import.meta.url)) {
  let bytes = 0;
  for (const [name, { widths }] of Object.entries(responsiveImages)) {
    const input = fileURLToPath(new URL(`${name}.webp`, root));
    for (const width of widths) {
      for (const format of ["avif", "webp"]) {
        const output = fileURLToPath(new URL(`${name}-${width}.${format}`, root));
        const pipeline = sharp(input).resize({ width, withoutEnlargement: true });
        const result = await (format === "avif" ? pipeline.avif({ quality: 52, effort: 6 }) : pipeline.webp({ quality: 78 })).toFile(output);
        bytes += result.size;
      }
    }
  }
  return bytes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Адаптивные изображения готовы: ${await generateResponsiveImages()} байт`);
}
