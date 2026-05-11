// Generate WebP responsive variants for every product photo + hero image.
// Output: <basename>-{480,960,1600}.webp next to the source JPG/PNG.
//
// Run:  npm install sharp  &&  node scripts/optimize-images.js
//
// QR codes are intentionally skipped — they need sharp pixel edges (PNG).
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const IMAGES = path.join(__dirname, "..", "images");
const WIDTHS = [480, 960, 1600];

// Source files to optimize (skip QR + .gitkeep + already-generated webp)
const sources = fs.readdirSync(IMAGES).filter((name) => {
  if (name.startsWith(".")) return false;
  if (name.startsWith("qr-")) return false;
  if (name.startsWith("logo-")) return false;
  if (name.endsWith(".webp")) return false;
  return /\.(jpe?g|png)$/i.test(name);
});

(async () => {
  for (const src of sources) {
    const srcPath = path.join(IMAGES, src);
    const base = src.replace(/\.(jpe?g|png)$/i, "");
    const meta = await sharp(srcPath).metadata();
    console.log(`\n${src} (${meta.width}x${meta.height})`);

    for (const w of WIDTHS) {
      // Don't upscale beyond original
      if (w > meta.width) {
        console.log(`  - ${w}w skipped (source narrower)`);
        continue;
      }
      const outName = `${base}-${w}.webp`;
      const outPath = path.join(IMAGES, outName);
      await sharp(srcPath)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(outPath);
      const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(`  ✓ ${outName} (${kb} KB)`);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
