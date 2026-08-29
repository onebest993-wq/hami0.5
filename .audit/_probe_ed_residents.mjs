/** ED main chunk: static closure from entry, exclude ANY named handler-cluster module. */
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

function parseStaticImports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const out = [];
  for (const m of cleaned.matchAll(/(?:import|export)\s+(?:type\s+)?[^;]*?from\s*['"]([^'"]+)['"]/g)) {
    const full = m[0];
    if (/\bimport\s+type\b/.test(full) || /\bexport\s+type\b/.test(full)) continue;
    out.push(m[1]);
  }
  return out;
}

function normalizeModuleId(id) {
  return id.replace(/\\/g, '/');
}

function isNamedHandlerCluster(id) {
  const normalized = normalizeModuleId(id);
  if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/')) return false;
  if (!normalized.includes('/executionDashboardCore/')) return false;
  if (normalized.includes('/__tests__/')) return false;
  return (
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
    normalized.includes('useExecutionDashboardSupabaseTimelineHydrate')
  );
}

function peel(f) {
  const n = normalizeModuleId(f);
  if (n.includes('executionDashboardLazyRegistry')) return 'lazy-registry';
  if (n.includes('SeizedAsset') || n.includes('seizure') || n.includes('Seizure')) return 'seizure-resident';
  if (n.includes('Followup') || n.includes('followup')) return 'followup-resident';
  if (n.includes('Pipeline') || n.includes('Boot') || n.includes('Persist') || n.includes('Scope'))
    return 'core-pipelines';
  if (n.includes('/orchestrat') || n.includes('Orchestrator')) return 'orchestrators';
  if (n.includes('ChunkHost') || n.includes('RuntimeSurface') || n.includes('RootFrame'))
    return 'shell-host';
  if (n.includes('/components/')) return 'components-static';
  if (n.includes('/hooks/')) return 'hooks-other';
  if (n.includes('/utils/') || n.includes('/helpers/')) return 'utils';
  if (n.includes('/executionDashboardCore/')) return 'core-other';
  if (n.includes('/ExecutionDashboard/')) return 'ed-misc';
  return 'outside-shared';
}

const entry = path.resolve('src/app/components/lawyer/ExecutionDashboard.tsx');
const visited = new Set();
const sizes = new Map();
const queue = [entry];
const stopped = [];

while (queue.length) {
  const file = queue.shift();
  if (!file || visited.has(file) || !fs.existsSync(file)) continue;

  if (isNamedHandlerCluster(file)) {
    stopped.push(file);
    continue;
  }

  visited.add(file);
  sizes.set(file, fs.statSync(file).size);

  for (const spec of parseStaticImports(file)) {
    const resolved = resolveImport(file, spec);
    if (!resolved || !resolved.includes(`${path.sep}src${path.sep}`)) continue;
    if (resolved.includes('__tests__')) continue;
    queue.push(resolved);
  }
}

const rel = (f) => f.replace(/\\/g, '/').replace(/^.*New folder\//, '');
const inEd = [...visited].filter((f) => normalizeModuleId(f).includes('/ExecutionDashboard/'));

const byPeel = {};
for (const f of inEd) {
  const g = peel(f);
  byPeel[g] = (byPeel[g] || 0) + (sizes.get(f) || 0);
}

const report = {
  inEdModules: inEd.length,
  inEdSourceKb: +(inEd.reduce((a, f) => a + (sizes.get(f) || 0), 0) / 1024).toFixed(1),
  outsideModules: visited.size - inEd.length,
  outsideSourceKb: +([...visited]
    .filter((f) => !normalizeModuleId(f).includes('/ExecutionDashboard/'))
    .reduce((a, f) => a + (sizes.get(f) || 0), 0) / 1024).toFixed(1),
  stoppedAtNamedClusters: stopped.length,
  byPeelInEdKb: Object.fromEntries(
    Object.entries(byPeel)
      .map(([k, v]) => [k, +(v / 1024).toFixed(1)])
      .sort((a, b) => b[1] - a[1]),
  ),
  topInEd: inEd
    .map((f) => ({ f: rel(f), kb: +((sizes.get(f) || 0) / 1024).toFixed(1), peel: peel(f) }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 45),
};

fs.writeFileSync('.audit/_probe_ed_residents.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
