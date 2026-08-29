#!/usr/bin/env node
/**
 * Redis live probe — يتحقق من WIFE_REDIS_* عند ضبطها؛ skip صادق بدون env.
 */
import { spawnSync } from 'node:child_process';

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

const url = env('WIFE_REDIS_REST_URL');
const token = env('WIFE_REDIS_REST_TOKEN');

if (!url || !token) {
  console.log('⚠ WIFE Redis probe: skipped (WIFE_REDIS_REST_URL/TOKEN not set)');
  process.exit(0);
}

const probeKey = `wife:probe:${Date.now()}`;
const setUrl = `${url.replace(/\/$/, '')}/set/${encodeURIComponent(probeKey)}/1/EX/30`;
const getUrl = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(probeKey)}`;

async function probe() {
  const setRes = await fetch(setUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!setRes.ok) {
    console.error(`✗ Redis SET failed HTTP ${setRes.status}`);
    process.exit(1);
  }
  const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!getRes.ok) {
    console.error(`✗ Redis GET failed HTTP ${getRes.status}`);
    process.exit(1);
  }
  const body = await getRes.json();
  const val = body?.result ?? body?.value;
  if (String(val) !== '1') {
    console.error(`✗ Redis round-trip mismatch: ${JSON.stringify(body)}`);
    process.exit(1);
  }
  console.log('✓ WIFE Redis live probe OK');
}

probe().catch((err) => {
  console.error('✗ Redis probe error:', err.message);
  process.exit(1);
});
