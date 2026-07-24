// Copies the web app (single source of truth in ../casefile) into ./renderer
// so Electron packages a self-contained copy. Run automatically before start/dist.

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "casefile");
const dest = path.join(__dirname, "renderer");
const files = ["index.html", "styles.css", "app.js"];

fs.mkdirSync(dest, { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(src, f), path.join(dest, f));
}
console.log(`Synced ${files.length} files from casefile/ into renderer/.`);
