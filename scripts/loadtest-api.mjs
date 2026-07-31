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

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function timedFetch(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } });
    await res.arrayBuffer().catch(() => null);
    return { ok: res.ok, status: res.status, ms: performance.now() - start };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = String(args.url ?? '').trim();
  if (!url) {
    process.stderr.write('Missing --url\n');
    process.exit(2);
  }

  const requests = toInt(args.requests, 200);
  const concurrency = toInt(args.concurrency, 10);
  const timeoutMs = toInt(args.timeoutMs, 5000);

  let remaining = requests;
  let okCount = 0;
  let failCount = 0;
  const latencies = [];
  const started = performance.now();

  const worker = async () => {
    for (;;) {
      const next = remaining;
      if (next <= 0) break;
      remaining = next - 1;
      try {
        const r = await timedFetch(url, timeoutMs);
        latencies.push(r.ms);
        if (r.ok) okCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalMs = performance.now() - started;
  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const rps = requests / (totalMs / 1000);

  process.stdout.write(
    JSON.stringify(
      {
        url,
        requests,
        concurrency,
        timeoutMs,
        ok: okCount,
        fail: failCount,
        durationMs: Math.round(totalMs),
        rps: Number(rps.toFixed(2)),
        latencyMs: {
          p50: Math.round(p50),
          p95: Math.round(p95),
          p99: Math.round(p99),
          max: Math.round(latencies[latencies.length - 1] ?? 0),
        },
      },
      null,
      2,
    ) + '\n',
  );
}

await main();

