#!/usr/bin/env node
/**
 * يتحقق من WIFE_REDIS_* ويرشد لـ Upstash إن نُقص.
 * Usage: node scripts/wife-redis-onboard.mjs [--write-template]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROD = path.join(ROOT, '.env.production.local');

function parse(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function loadMerged() {
  const merged = { ...process.env };
  for (const rel of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    const f = path.join(ROOT, rel);
    if (!fs.existsSync(f)) continue;
    Object.assign(merged, parse(fs.readFileSync(f, 'utf8')));
  }
  return merged;
}

const env = loadMerged();
const url = (env.WIFE_REDIS_REST_URL || '').trim();
const token = (env.WIFE_REDIS_REST_TOKEN || '').trim();

console.log('── WIFE Redis onboarding ──\n');

if (!url || !token) {
  console.log('❌ WIFE_REDIS_REST_URL / WIFE_REDIS_REST_TOKEN غير مضبوطين.\n');
  console.log('الخطوات:');
  console.log('  1. https://console.upstash.com → Create Database → Redis');
  console.log('  2. REST API → انسخ UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN');
  console.log('  3. أضف في .env.production.local:');
  console.log('     WIFE_REDIS_REST_URL=https://....upstash.io');
  console.log('     WIFE_REDIS_REST_TOKEN=...');
  console.log('  4. npm run gate:wife-prod-live\n');
  if (process.argv.includes('--write-template') && fs.existsSync(PROD)) {
    const text = fs.readFileSync(PROD, 'utf8');
    if (!text.includes('WIFE_REDIS_REST_URL=') || text.includes('# WIFE_REDIS_REST_URL=')) {
      fs.appendFileSync(
        PROD,
        '\n# Paste Upstash REST credentials below:\nWIFE_REDIS_REST_URL=\nWIFE_REDIS_REST_TOKEN=\n',
      );
      console.log('✓ أضيفت أسطر فارغة في .env.production.local — الصق المفاتيح ثم أعد التشغيل.');
    }
  }
  process.exit(1);
}

if (!/^https:\/\/.+/i.test(url)) {
  console.error('✗ WIFE_REDIS_REST_URL يجب أن يبدأ بـ https://');
  process.exit(1);
}

async function probe() {
  const ping = await fetch(`${url.replace(/\/+$/, '')}/ping`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ping.ok) {
    console.error(`✗ Redis ping فشل HTTP ${ping.status} — تحقق من URL/Token`);
    process.exit(1);
  }
  const key = `wife:onboard:${Date.now()}`;
  const base = url.replace(/\/+$/, '');
  const set = await fetch(`${base}/set/${encodeURIComponent(key)}/ok/EX/60`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!set.ok) {
    console.error(`✗ Redis SET فشل HTTP ${set.status}`);
    process.exit(1);
  }
  const get = await fetch(`${base}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await get.json();
  if (String(body?.result) !== 'ok') {
    console.error('✗ Redis round-trip فشل');
    process.exit(1);
  }
  console.log('✓ Upstash Redis يعمل — شغّل: npm run gate:wife-prod-live');
}

probe().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
