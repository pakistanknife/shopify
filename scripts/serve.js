// Tiny static dev server. Run: node scripts/serve.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2":"font/woff2"
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }

  fs.stat(filePath, (err, stat) => {
    // Directory-style URLs (e.g. /ur/) → serve <dir>/index.html
    if (!err && stat.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      fs.stat(indexPath, (e2, s2) => {
        if (!e2 && s2.isFile()) {
          res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.writeHead(404); res.end("not found: " + urlPath);
        }
      });
      return;
    }
    if (err || !stat.isFile()) { res.writeHead(404); res.end("not found: " + urlPath); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => {
  console.log("Pakistan Knife Co. dev server running:");
  console.log("  http://localhost:" + PORT);
});
