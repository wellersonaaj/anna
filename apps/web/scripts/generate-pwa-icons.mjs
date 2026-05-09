import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = join(root, "public/favicon.svg");

await sharp(svg).resize(180, 180).png().toFile(join(root, "public/apple-touch-icon.png"));
await sharp(svg).resize(192, 192).png().toFile(join(root, "public/pwa-192.png"));
await sharp(svg).resize(512, 512).png().toFile(join(root, "public/pwa-512.png"));

console.log("Generated apple-touch-icon.png, pwa-192.png, pwa-512.png");
