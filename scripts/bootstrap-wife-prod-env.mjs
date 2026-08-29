#!/usr/bin/env node
/**
 * يجهّز .env.production.local لبوابة prod — بدون Redis (يجب إضافته يدوياً من Upstash).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROD_LOCAL = path.join(ROOT, '.env.production.local');
const ENV = path.join(ROOT, '.env');

function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const base = fs.existsSync(ENV) ? parseEnvFile(fs.readFileSync(ENV, 'utf8')) : {};
const existing = fs.existsSync(PROD_LOCAL) ? parseEnvFile(fs.readFileSync(PROD_LOCAL, 'utf8')) : {};
const merged = { ...base, ...existing };

const required = {
  VITE_SHELL_AUTH_OPEN: 'false',
  VITE_BFF_AUTH: 'true',
  WIFE_DISABLE_EDGE_KV_PROXY: 'true',
};

if (!merged.ADMIN_ACCESS_KEY || merged.ADMIN_ACCESS_KEY.length < 32) {
  required.ADMIN_ACCESS_KEY = crypto.randomBytes(32).toString('hex');
}

for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_UUID']) {
  if (base[key] && !merged[key]) merged[key] = base[key];
}

const out = {
  ...merged,
  ...required,
};

const lines = [
  '# WIFE production bootstrap — scripts/bootstrap-wife-prod-env.mjs',
  '# Last run: ' + new Date().toISOString(),
  'VITE_SHELL_AUTH_OPEN=' + out.VITE_SHELL_AUTH_OPEN,
  'VITE_BFF_AUTH=' + out.VITE_BFF_AUTH,
  'WIFE_DISABLE_EDGE_KV_PROXY=' + out.WIFE_DISABLE_EDGE_KV_PROXY,
  'ADMIN_ACCESS_KEY=' + out.ADMIN_ACCESS_KEY,
  'SUPABASE_URL=' + out.SUPABASE_URL,
  'SUPABASE_ANON_KEY=' + out.SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY=' + out.SUPABASE_SERVICE_ROLE_KEY,
  'ADMIN_UUID=' + out.ADMIN_UUID,
];

if (!out.WIFE_REDIS_REST_URL || !out.WIFE_REDIS_REST_TOKEN) {
  lines.push(
    '',
    '# REQUIRED — Upstash Redis REST (https://console.upstash.com):',
    '# Paste REST URL + Token below, then: npm run doctor:wife-redis && npm run gate:wife-prod-live',
    'WIFE_REDIS_REST_URL=' + (out.WIFE_REDIS_REST_URL || ''),
    'WIFE_REDIS_REST_TOKEN=' + (out.WIFE_REDIS_REST_TOKEN || ''),
  );
} else {
  lines.push('WIFE_REDIS_REST_URL=' + out.WIFE_REDIS_REST_URL, 'WIFE_REDIS_REST_TOKEN=' + out.WIFE_REDIS_REST_TOKEN);
}

fs.writeFileSync(PROD_LOCAL, lines.join('\n') + '\n');
console.log(`✓ Wrote ${PROD_LOCAL}`);
console.log(
  out.WIFE_REDIS_REST_URL
    ? '✓ WIFE_REDIS_* present'
    : '⚠ Add WIFE_REDIS_* from Upstash for deployReady',
);
