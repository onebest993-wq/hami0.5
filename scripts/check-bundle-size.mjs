/**
 * يتحقق من حجم حزمة الإنتاج بعد البناء — للنشر التجريبي.
 * الاستخدام: npm run build && node scripts/check-bundle-size.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

const LIMITS = {
  entryRawKb: 120,
  entryGzipKb: 45,
  criticalPathGzipKb: 320,
  anyChunkRawKb: 520,
};

function kb(bytes) {
  return Math.round(bytes / 1024);
}

function findPreloadedChunks(indexHtml) {
  const matches = [...indexHtml.matchAll(/modulepreload" crossorigin href="\/assets\/([^"]+)"/g)];
  return matches.map((m) => m[1]);
}

function findEntry(files) {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
  const match = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
  const entry = match ? match[1] : files.find((f) => f.startsWith('index-') && f.endsWith('.js')) ?? null;
  return { entry, preloaded: findPreloadedChunks(indexHtml), indexHtml };
}

if (!fs.existsSync(assetsDir)) {
  console.error('[check-bundle-size] dist/assets missing — run npm run build first');
  process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const { entry: entryName, preloaded } = findEntry(jsFiles);

if (!entryName) {
  console.error('[check-bundle-size] entry chunk not found');
  process.exit(1);
}

const criticalSet = new Set([entryName, ...preloaded]);

let failed = false;
const report = [];
let criticalPathGzip = 0;

for (const file of jsFiles) {
  const abs = path.join(assetsDir, file);
  const raw = fs.readFileSync(abs);
  const gzip = gzipSync(raw);
  const row = { file, rawKb: kb(raw.length), gzipKb: kb(gzip.length) };
  report.push(row);

  if (criticalSet.has(file)) {
    criticalPathGzip += row.gzipKb;
  }

  if (file === entryName) {
    if (row.rawKb > LIMITS.entryRawKb || row.gzipKb > LIMITS.entryGzipKb) {
      failed = true;
      console.error(
        `[check-bundle-size] entry ${file}: ${row.rawKb}KB raw / ${row.gzipKb}KB gzip — limit ${LIMITS.entryRawKb}/${LIMITS.entryGzipKb}KB`,
      );
    }
  } else if (row.rawKb > LIMITS.anyChunkRawKb) {
    console.warn(
      `[check-bundle-size] large chunk ${file}: ${row.rawKb}KB raw (informational, limit ${LIMITS.anyChunkRawKb}KB)`,
    );
  }
}

report.sort((a, b) => b.rawKb - a.rawKb);
console.log(`[check-bundle-size] critical path (preloaded): ~${criticalPathGzip}KB gzip`);
console.log('[check-bundle-size] top chunks:');
for (const row of report.slice(0, 8)) {
  console.log(`  ${row.file}: ${row.rawKb}KB raw, ${row.gzipKb}KB gzip`);
}

if (criticalPathGzip > LIMITS.criticalPathGzipKb) {
  failed = true;
  console.error(
    `[check-bundle-size] critical path ${criticalPathGzip}KB gzip exceeds ${LIMITS.criticalPathGzipKb}KB`,
  );
}

if (failed) {
  process.exit(1);
}

console.log('[check-bundle-size] OK');
