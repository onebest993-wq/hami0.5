#!/usr/bin/env node
/**
 * Loads .env then .env.production (if present) and runs wife-production-gate.
 * Usage: node scripts/load-env-and-gate.mjs --prod --live --tests
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(rel, override = false) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, 'utf8');
  for (const line of text.split(/\r?\n/)) {
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

const gateArgs = process.argv.slice(2);
const result = spawnSync('node', ['scripts/wife-production-gate.mjs', ...gateArgs], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
