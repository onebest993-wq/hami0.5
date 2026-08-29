import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
const assets = "dist/assets";
if (!fs.existsSync("dist/index.html")) {
  console.log("NO_DIST");
  process.exit(0);
}
const html = fs.readFileSync("dist/index.html", "utf8");
const entry = (html.match(/src="\/assets\/(index-[^"]+\.js)"/) || [])[1];
const pre = [...html.matchAll(/modulepreload" crossorigin href="\/assets\/([^"]+)"/g)].map((m) => m[1]);
function walk(start) {
  const v = new Set();
  const q = [start];
  while (q.length) {
    const f = q.shift();
    if (!f || v.has(f)) continue;
    v.add(f);
    const p = path.join(assets, f);
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/from"\.\/([^"]+\.js)"/g)) q.push(m[1]);
  }
  return v;
}
const crit = new Set([entry, ...pre, ...walk(entry)].filter(Boolean));
let gz = 0;
const rows = [];
for (const f of crit) {
  const p = path.join(assets, f);
  if (!fs.existsSync(p)) continue;
  const b = fs.readFileSync(p);
  const g = gzipSync(b).length;
  gz += g;
  rows.push({ f, gz: Math.round((g / 1024) * 10) / 10, raw: Math.round((b.length / 1024) * 10) / 10 });
}
rows.sort((a, b) => b.gz - a.gz);
console.log("critical files", rows.length, "gzip sum", Math.round(gz / 1024), "KB");
for (const r of rows.slice(0, 25)) console.log(String(r.gz).padStart(6), "gzip", String(r.raw).padStart(7), "raw", r.f);
