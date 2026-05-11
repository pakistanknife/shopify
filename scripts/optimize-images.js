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
// Three breakpoints — covers phones (480), standard desktop (960),
// and HiDPI / Retina desktops (1600). Each capped at source width so
// no upscaling ever happens.
const WIDTHS = [480, 960, 1600];
// Quality tuned for premium product photography (q92 still produces
// small files relative to source JPG, but keeps detail/sharpness).
const QUALITY = 92;

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
      // Cap target width to source width — never upscale, always emit a file.
      const targetW = Math.min(w, meta.width);
      const outName = `${base}-${w}.webp`;
      const outPath = path.join(IMAGES, outName);
      await sharp(srcPath)
        .resize({ width: targetW, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(outPath);
      const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
      const note = targetW < w ? ` (capped at ${targetW}px)` : "";
      console.log(`  ✓ ${outName} (${kb} KB)${note}`);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
