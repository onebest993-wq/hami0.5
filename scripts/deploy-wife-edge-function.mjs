#!/usr/bin/env node
/**
 * ينشر make-server-f09713ba مع verify_jwt=false حتى live probe يرى 410 صريحاً.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadEnvFile(rel, override = false) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (override || !(key in process.env) || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.production', true);
loadEnvFile('.env.local', true);
loadEnvFile('.env.production.local', true);

const url = process.env.SUPABASE_URL || '';
const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error('✗ SUPABASE_URL missing — cannot resolve project ref');
  process.exit(1);
}

const args = [
  'supabase',
  'functions',
  'deploy',
  'make-server-f09713ba',
  '--project-ref',
  ref,
  '--no-verify-jwt',
  '--use-api',
];

console.log(`Deploying Edge function make-server-f09713ba → ${ref} …`);
const res = spawnSync('npx', args, { cwd: ROOT, stdio: 'inherit', shell: true });
if (res.status !== 0) process.exit(res.status ?? 1);
console.log('\n✓ Deployed. Set Edge secrets in Dashboard:');
console.log('  WIFE_DISABLE_EDGE_KV_PROXY=true');
console.log('  ADMIN_ACCESS_KEY=<same as .env.production.local>');
