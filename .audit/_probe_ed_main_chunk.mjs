/** What lands in named ExecutionDashboard-* chunk (static closure from entry, minus named clusters / vendors). */
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve('src');

function tryFile(base) {
  for (const e of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
    const p = base + e;
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.normalize(p);
    } catch {
      /* */
    }
  }
  return null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@/')) {
    const rest = spec.slice(2);
    for (const cand of [path.join(SRC_ROOT, rest), path.join(SRC_ROOT, 'app', rest)]) {
      const hit = tryFile(cand);
      if (hit) return hit;
    }
    return null;
  }
  if (spec.startsWith('.')) return tryFile(path.resolve(path.dirname(fromFile), spec));
  return null;
}

function parseImports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const staticImps = [];
  const dynImps = [];
  for (const m of cleaned.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) dynImps.push(m[1]);
  for (const m of cleaned.matchAll(/(?:import|export)\s+(?:type\s+)?[^;]*?from\s*['"]([^'"]+)['"]/g)) {
    const full = m[0];
    if (/\bimport\s+type\b/.test(full) || /\bexport\s+type\b/.test(full)) continue;
    staticImps.push(m[1]);
  }
  return { staticImps, dynImps };
}

function normalizeModuleId(id) {
  return id.replace(/\\/g, '/');
}

/** Same as vite resolveExecutionHandlerClusterChunk — if returns string, module leaves ED main chunk. */
function resolveCluster(id) {
  const normalized = normalizeModuleId(id);
  if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/')) return undefined;
  if (!normalized.includes('/executionDashboardCore/')) return undefined;
  if (normalized.includes('/__tests__/')) return undefined;
  const inHandlerCluster =
    normalized.includes('/ExecutionDashboardHandlerCluster') ||
    normalized.includes('/useExecutionDashboardCoreHandlerCluster') ||
    normalized.includes('handlerClusterContextShared') ||
    normalized.includes('buildHandlerClusterCoreInput') ||
    normalized.includes('executionDashboardCoreHandlerClusterTypes') ||
    normalized.includes('useExecutionDashboardNotesTasksHandlers') ||
    normalized.includes('useExecutionDashboardAppointmentHandlers') ||
    normalized.includes('useExecutionDashboardPaymentHandlers') ||
    normalized.includes('useExecutionDashboardPushTimelineEvent') ||
    normalized.includes('useExecutionDashboardRuntimeSyncEffects') ||
    normalized.includes('useExecutionDashboardSupabaseTimelineHydrate');
  if (!inHandlerCluster) return undefined;
  return 'named-cluster';
}

function isLikelyVendorOrBoot(id) {
  const n = normalizeModuleId(id);
  return (
    n.includes('/node_modules/') ||
    n.includes('/src/app/services/SecureStore') ||
    n.includes('/src/app/services/CryptoService') ||
    n.includes('/src/utils/supabase')
  );
}

const entry = path.resolve('src/app/components/lawyer/ExecutionDashboard.tsx');
const visited = new Set();
const sizes = new Map();
const queue = [entry];
const stoppedAtCluster = [];
const stoppedAtDyn = [];

while (queue.length) {
  const file = queue.shift();
  if (!file || visited.has(file) || !fs.existsSync(file)) continue;
  visited.add(file);
  sizes.set(file, fs.statSync(file).size);

  if (resolveCluster(file)) {
    stoppedAtCluster.push(file);
    continue; // don't pull cluster internals into ED estimate
  }

  const { staticImps, dynImps } = parseImports(file);
  for (const spec of dynImps) {
    const resolved = resolveImport(file, spec);
    if (resolved) stoppedAtDyn.push(rel(resolved));
  }
  for (const spec of staticImps) {
    const resolved = resolveImport(file, spec);
    if (!resolved || !resolved.includes(`${path.sep}src${path.sep}`)) continue;
    if (resolved.includes('__tests__')) continue;
    if (isLikelyVendorOrBoot(resolved)) continue;
    queue.push(resolved);
  }
}

function rel(f) {
  return f.replace(/\\/g, '/').replace(/^.*New folder\//, '');
}

const inEd = [...visited].filter((f) => normalizeModuleId(f).includes('/ExecutionDashboard/'));
const outsideEd = [...visited].filter((f) => !normalizeModuleId(f).includes('/ExecutionDashboard/'));
const sum = (files) => files.reduce((a, f) => a + (sizes.get(f) || 0), 0);

function bucket(f) {
  const n = normalizeModuleId(f);
  if (n.includes('/executionDashboardCore/')) return 'core-non-cluster';
  if (n.includes('/hooks/')) return 'hooks';
  if (n.includes('/components/')) return 'components';
  if (n.includes('/utils/')) return 'utils';
  if (n.includes('/helpers/')) return 'helpers';
  if (n.endsWith('executionDashboardLazyRegistry.ts')) return 'lazy-registry';
  if (n.includes('ExecutionDashboard/')) return 'ed-root';
  return 'outside';
}

const byBucket = {};
for (const f of visited) {
  const b = bucket(f);
  byBucket[b] = (byBucket[b] || 0) + (sizes.get(f) || 0);
}

const top = (files, n = 40) =>
  files
    .map((f) => ({
      f: rel(f),
      kb: +((sizes.get(f) || 0) / 1024).toFixed(1),
      bucket: bucket(f),
    }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, n);

const report = {
  visitedCount: visited.size,
  visitedKb: +(sum([...visited]) / 1024).toFixed(1),
  inEdCount: inEd.length,
  inEdKb: +(sum(inEd) / 1024).toFixed(1),
  outsideEdCount: outsideEd.length,
  outsideEdKb: +(sum(outsideEd) / 1024).toFixed(1),
  byBucketKb: Object.fromEntries(
    Object.entries(byBucket)
      .map(([k, v]) => [k, +(v / 1024).toFixed(1)])
      .sort((a, b) => b[1] - a[1]),
  ),
  topInEd: top(inEd, 50),
  topOutside: top(outsideEd, 30),
  note: 'Dynamic imports stopped (not traversed). Named handler-cluster modules stopped at boundary.',
};

fs.writeFileSync('.audit/_probe_ed_main_chunk.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
