import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "public", "vite.svg");
const iconsDir = path.join(projectRoot, "public", "icons");

const iconTargets = [
  { size: 192, filename: "icon-192.png" },
  { size: 512, filename: "icon-512.png" },
];

await mkdir(iconsDir, { recursive: true });

await Promise.all(
  iconTargets.map(async ({ size, filename }) => {
    const outputPath = path.join(iconsDir, filename);

    await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
  })
);

console.log("✅ PWA icons generated:");
for (const { size, filename } of iconTargets) {
  console.log(`- ${filename} (${size}x${size})`);
}
