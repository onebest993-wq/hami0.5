#!/usr/bin/env node
/**
 * ينشئ ملف vercel-import-missing.env للصق في Vercel → Import .env
 * يستثني المفاتيح الموجودة already على Vercel (VITE_* الأربعة).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'vercel-import-missing.env');

const SKIP = new Set([
  'VITE_SHELL_AUTH_OPEN',
  'VITE_BFF_AUTH',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]);

function parse(rel) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const merged = {
  ...parse('.env'),
  ...parse('.env.production.local'),
  NODE_ENV: 'production',
};

const lines = [
  '# Import in Vercel → Add Environment Variable → Import .env',
  '# Environment: check Production only',
  '# Do NOT re-import VITE_* that already exist',
  '',
];

for (const [k, v] of Object.entries(merged)) {
  if (SKIP.has(k)) continue;
  if (!v) continue;
  if (k.startsWith('#')) continue;
  lines.push(`${k}=${v}`);
}

fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${lines.filter((l) => l.includes('=')).length} keys (excludes existing VITE_*)`);
console.log('');
console.log('Vercel steps:');
console.log('  1. Add Environment Variable');
console.log('  2. Import .env → pick vercel-import-missing.env');
console.log('  3. CHECK ☑ Production (required!)');
console.log('  4. Save');
