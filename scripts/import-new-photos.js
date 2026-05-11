// One-shot: convert the 7 new "1000*" source photos into the canonical
// sapphire-N.jpg / teak-N.jpg slots used by the site.
//
// Run:  npm install sharp  &&  node scripts/import-new-photos.js
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const IMG = path.join(__dirname, "..", "images");

const MAPPING = [
  // [source filename, target slot, "what it shows"]
  { src: "1000261819.png", dst: "sapphire-1.jpg", note: "Sapphire hero: knives in open box" },
  { src: "1000261873.png", dst: "sapphire-2.jpg", note: "Sapphire: knives next to closed box" },
  { src: "1000261877.png", dst: "sapphire-3.jpg", note: "Sapphire: knives in open box (alt angle)" },
  { src: "1000261754.jpg", dst: "teak-1.jpg",     note: "Teak HERO: knives in open box, ultra-wide" },
  { src: "1000261856.png", dst: "teak-2.jpg",     note: "Teak: knives in front of closed box" },
  { src: "1000261855.png", dst: "teak-3.jpg",     note: "Teak: knives on top of closed box" },
  { src: "1000261836.png", dst: "teak-4.jpg",     note: "Teak: knives in open box (alt angle)" },
];

(async () => {
  for (const { src, dst, note } of MAPPING) {
    const srcPath = path.join(IMG, src);
    const dstPath = path.join(IMG, dst);
    if (!fs.existsSync(srcPath)) { console.warn(`✗ skip ${src} (not found)`); continue; }

    // Convert PNG → JPG with quality 90, or copy JPG → JPG losslessly
    const meta = await sharp(srcPath).metadata();
    await sharp(srcPath)
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(dstPath);
    console.log(`✓ ${dst.padEnd(16)} ← ${src.padEnd(20)} (${meta.width}x${meta.height})  ${note}`);
  }

  // Delete sources (the obsolete teak-3.png was already cleaned in the
  // initial run on 2026-05-11; the canonical filename is now teak-3.jpg).
  for (const { src } of MAPPING) {
    const srcPath = path.join(IMG, src);
    if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
  }

  console.log("\nDone. Run scripts/optimize-images.js next to regenerate WebP variants.");
})().catch((e) => { console.error(e); process.exit(1); });
