// One-shot: crop the QR matrix out of merchant posters and save clean
// web-friendly versions for the checkout page.
//
// Run:  npm install sharp  &&  node scripts/crop-qr.js
//
// Kept around so the crop can be redone if a source poster changes.
// `sharp` and node_modules are NOT committed — install on demand.
const sharp = require("sharp");
const path = require("path");

const IMAGES = path.join(__dirname, "..", "images");

const JOBS = [
  {
    label: "JazzCash poster (1132x1600 yellow)",
    src: path.join(IMAGES, "qr-jazzcash.jpg"),
    out: path.join(IMAGES, "qr-jazzcash.png"),
    cropW: 560,
    cropH: 560,
    top: 488
  },
  {
    label: "EasyPaisa digital bank (1080x1332 white)",
    src: path.join(IMAGES, "qr-easypaisa-src.jpg"),
    out: path.join(IMAGES, "qr-easypaisa.png"),
    cropW: 660,
    cropH: 660,
    top: 430
  }
];

(async () => {
  for (const job of JOBS) {
    try {
      const meta = await sharp(job.src).metadata();
      const left = Math.round((meta.width - job.cropW) / 2);
      await sharp(job.src)
        .extract({ left, top: job.top, width: job.cropW, height: job.cropH })
        .resize(600, 600, { fit: "contain", background: "#ffffff" })
        .png({ compressionLevel: 9 })
        .toFile(job.out);
      console.log("✓", job.label, "→", path.basename(job.out));
    } catch (e) {
      console.warn("✗", job.label, "—", e.message);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
