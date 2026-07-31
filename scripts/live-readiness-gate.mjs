#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [k, v] = raw.slice(2).split('=', 2);
    out[k] = v ?? 'true';
  }
  return out;
}

function normalizeBaseUrl(raw) {
  return String(raw || '').trim().replace(/\/+$/u, '');
}

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

async function probeJson(baseUrl, route, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const elapsedMs = Math.round(performance.now() - started);
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return {
      route,
      ok: response.ok,
      status: response.status,
      elapsedMs,
      body,
    };
  } catch (error) {
    return {
      route,
      ok: false,
      status: 0,
      elapsedMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : 'unknown_error',
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function fail(message) {
  console.error(`✗ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const requireLive = args.requireLive === 'true' || args['require-live'] === 'true';
  const envBase = normalizeBaseUrl(process.env.HAMI_GATE_BASE_URL || '');
  const baseUrl = normalizeBaseUrl(args.baseUrl) || envBase;

  if (!baseUrl) {
    if (requireLive) {
      console.error('Missing --baseUrl=https://... (or HAMI_GATE_BASE_URL)');
      process.exit(2);
    }
    console.log('ADVISORY SKIP — no --baseUrl / HAMI_GATE_BASE_URL (local structural OK)');
    console.log('Usage: npm run gate:live-readiness -- --baseUrl=https://...');
    process.exit(0);
  }

  const timeoutMs = Number(args.timeoutMs) > 0 ? Number(args.timeoutMs) : 4000;
  const writePath = String(args.write || '').trim();
  const requireRedis = String(args.requireRedis || 'true').trim() !== 'false';

  const probes = ['/api/public/healthz', '/api/public/readyz', '/api/public/bff'];
  const results = [];

  console.log(`=== Live readiness gate: ${baseUrl} ===\n`);
  for (const route of probes) {
    const result = await probeJson(baseUrl, route, timeoutMs);
    results.push(result);
    if (!result.ok) {
      fail(`${route} returned status ${result.status || 'error'}`);
      continue;
    }
    ok(`${route} responded ${result.status} in ${result.elapsedMs}ms`);
  }

  const readyz = results.find((entry) => entry.route === '/api/public/readyz');
  let redisConfigured = null;
  let supabaseOk = null;
  if (readyz?.body && typeof readyz.body === 'object') {
    const checks = readyz.body.checks && typeof readyz.body.checks === 'object' ? readyz.body.checks : null;
    redisConfigured = checks && 'redisConfigured' in checks ? Boolean(checks.redisConfigured) : null;
    supabaseOk = checks && 'supabase' in checks && checks.supabase && typeof checks.supabase === 'object'
      ? Boolean(checks.supabase.ok)
      : null;
  }

  const blockingIssues = [];
  if (!results.every((entry) => entry.ok)) blockingIssues.push('probe_failure');
  if (supabaseOk !== true) blockingIssues.push('supabase_not_ready');
  if (requireRedis && redisConfigured !== true) blockingIssues.push('redis_not_configured');

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    timeoutMs,
    requireRedis,
    summary: {
      ok: blockingIssues.length === 0,
      blockingIssues,
      redisConfigured,
      supabaseOk,
    },
    probes: results,
  };

  if (writePath) {
    const resolvedWritePath = path.resolve(writePath);
    ensureDirFor(resolvedWritePath);
    fs.writeFileSync(resolvedWritePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    ok(`evidence written to ${resolvedWritePath}`);
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));

  if (blockingIssues.length > 0) {
    process.exit(1);
  }
}

await main();
