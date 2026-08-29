const fs = require("fs");
const p = "scripts/bundle-vercel-api.mjs";
let s = fs.readFileSync(p, "utf8");
if (s.includes("'.svg': 'empty'")) {
  console.log("svg-loader-already");
  process.exit(0);
}
const needle = "    packages: 'external',";
if (!s.includes(needle)) {
  console.log("needle-missing");
  process.exit(1);
}
const insert = needle + "\n    loader: { '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.jpeg': 'empty', '.webp': 'empty', '.gif': 'empty' },";
fs.writeFileSync(p, s.replace(needle, insert));
console.log("patched");
