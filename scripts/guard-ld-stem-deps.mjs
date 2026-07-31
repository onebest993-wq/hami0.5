/**
 * حارس أوسع من cold-entry: يفحص حزمة LawyerDashboard الجذرية فقط
 * (LawyerDashboard-<hash>.js) — لا تُسحب ثابتًا:
 *   secure-api-client | vendor-supabase | forum-moderator-ids | app-kv-store-admin | vendor-lucide
 *
 * لا يشمل overlays/tabs (LawyerDashboard*Overlay*|HomeTab|…) — تلك deferred عمدًا.
 *
 * الاستخدام: npm run build && node scripts/guard-ld-stem-deps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');

const FORBIDDEN = [
  /^secure-api-client-/i,
  /^vendor-supabase-/i,
  /^forum-moderator-ids-/i,
  /^forum-supabase-admin-/i,
  /^app-kv-store-admin-/i,
  /** cold-path InstantShell/chrome must use homeStemIcons — never melt lucide into LD stem */
  /^vendor-lucide-/i,
];

function fail(msg) {
  console.error(`[guard-ld-stem-deps] FAIL: ${msg}`);
  process.exit(1);
}

function parseStaticDeps(jsText) {
  const named = [...jsText.matchAll(/import(?:\{[^}]*\})?from"\.\/([^"]+)"/g)].map((m) => m[1]);
  const side = [...jsText.matchAll(/import"\.\/([^"]+)"/g)].map((m) => m[1]);
  return [...new Set([...named, ...side])];
}

if (!fs.existsSync(assetsDir)) {
  fail('dist/assets missing — run npm run build first');
}

/** الجذر فقط — ليس LawyerDashboardHomeTab / *OverlayEntry / BackgroundServices */
const ldChunks = fs
  .readdirSync(assetsDir)
  .filter((f) => /^LawyerDashboard-[A-Za-z0-9_-]+\.js$/i.test(f));

if (!ldChunks.length) {
  fail('no LawyerDashboard-<hash>.js stem chunk found');
}

const hits = [];
for (const chunk of ldChunks) {
  const text = fs.readFileSync(path.join(assetsDir, chunk), 'utf8');
  const deps = parseStaticDeps(text);
  const bad = deps.filter((d) => FORBIDDEN.some((re) => re.test(d)));
  if (bad.length) hits.push(`${chunk} → ${bad.join(', ')}`);
}

if (hits.length) {
  fail(`LD stem forbidden static deps:\n  - ${hits.join('\n  - ')}`);
}

console.log('[guard-ld-stem-deps] PASS');
console.log(`  ldStem=${ldChunks.join(', ')}`);
