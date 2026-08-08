/**
 * يمنع عودة أثقل ما يُفسد أول بايت: خطوط Google في index.html،
 * وmodulepreload لشاشات/بائعين غير حرجين في dist بعد البناء.
 *
 * Usage:
 *   node scripts/guard-cold-entry-surface.mjs
 *   node scripts/guard-cold-entry-surface.mjs --dist   (after build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkDist = process.argv.includes('--dist');
let failed = false;

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(indexHtml)) {
  console.error('[cold-entry] BLOCKED: index.html still loads Google Fonts on the critical path');
  failed = true;
} else {
  console.log('[cold-entry] OK index.html — no Google Fonts on critical path');
}

if (checkDist) {
  const distIndex = path.join(ROOT, 'dist/index.html');
  if (!fs.existsSync(distIndex)) {
    console.error('[cold-entry] BLOCKED: dist/index.html missing — run build first');
    process.exit(1);
  }
  const html = fs.readFileSync(distIndex, 'utf8');
  const preloads = [...html.matchAll(/modulepreload[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  const allowed = /\/assets\/(vendor-react|boot-runtime)-[^/]+\.js$/i;
  const bad = preloads.filter((href) => !allowed.test(href));
  if (bad.length) {
    console.error('[cold-entry] BLOCKED: unexpected modulepreload on cold entry:');
    for (const b of bad) console.error(`  ${b}`);
    failed = true;
  } else {
    console.log(`[cold-entry] OK dist preloads (${preloads.length}): ${preloads.join(', ') || '(none)'}`);
  }
  if (/fonts\.googleapis\.com/i.test(html)) {
    console.error('[cold-entry] BLOCKED: dist/index.html still references Google Fonts');
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
