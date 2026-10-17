// Makes small web copies of the party flyer for /dj/requests.
// The original PNG is ~4 MB; guests on phones only need a few hundred KB.
//
//   node scripts/optimize-flyer.mjs [source.png]
//
// Writes to public/pictures/flyer/. Re-run it if the flyer changes, then update
// `party.flyer` in src/data/party.ts if the file names change.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2] ?? "design/erick-36-flyer.png";
const base = path.basename(src, path.extname(src));
const outDir = "public/pictures/flyer";

await mkdir(outDir, { recursive: true });
const { width } = await sharp(src).metadata();

// WebP at three widths: card thumbnail (1x/2x) and the full-screen lightbox.
for (const w of [480, 960, 1400]) {
  const target = Math.min(w, width);
  await sharp(src).resize({ width: target }).webp({ quality: 80 }).toFile(path.join(outDir, `${base}-${w}.webp`));
}
// JPEG fallback, also used for link previews (og:image) and the "Save flyer" link.
await sharp(src).resize({ width: 1200 }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, `${base}-1200.jpg`));

console.log(`Flyer images written to ${outDir}/`);
