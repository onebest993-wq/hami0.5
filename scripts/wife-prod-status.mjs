#!/usr/bin/env node
/**
 * ملخص حالة WIFE prod — blockers + أوامر التالي.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');

function parse(rel) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

const prod = parse('.env.production.local');
const redisUrl = prod.WIFE_REDIS_REST_URL || '';
const redisTok = prod.WIFE_REDIS_REST_TOKEN || '';
const redisOk = redisUrl.length > 10 && redisTok.length > 8;

console.log('\n── WIFE Prod Status ──\n');
console.log(`Code gate (dev):     run npm run gate:wife-prod-readiness`);
console.log(`Redis configured:    ${redisOk ? '✓ yes' : '✗ no — paste Upstash in .env.production.local'}`);
console.log(`Edge live (410):     run npm run gate:wife-prod-live:only`);
console.log(`Professional audit:  npm run test:security:professional-audit`);

if (!redisOk) {
  console.log('\n⛔ Blocker: WIFE_REDIS_REST_URL + WIFE_REDIS_REST_TOKEN');
  console.log('   1. https://console.upstash.com → Create Redis → REST API');
  console.log('   2. Paste into .env.production.local (lines 15–16)');
  console.log('   3. npm run doctor:wife-redis && npm run gate:wife-prod-live:only\n');
  process.exit(1);
}

const doctor = spawnSync('node', ['scripts/wife-redis-onboard.mjs'], { cwd: ROOT, encoding: 'utf8' });
if (doctor.status !== 0) {
  console.log(doctor.stdout || doctor.stderr);
  process.exit(1);
}

console.log('\n✓ Redis OK — run: npm run gate:wife-prod-live:only');
