/** Exclusive (seizure-only) static deps vs shared-with-other-clusters. */
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve('src');
const CORE = path.resolve(
  'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
);

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
  if (
    normalized.includes('handlerClusterContextShared') ||
    normalized.includes('buildHandlerClusterCoreInput') ||
    normalized.includes('executionDashboardCoreHandlerClusterTypes')
  )
    return 'shared';
  if (normalized.includes('HandlerClusterCoercive') || normalized.includes('CoreHandlerClusterCoercive'))
    return 'coercive';
  if (normalized.includes('HandlerClusterSeizure') || normalized.includes('CoreHandlerClusterSeizure'))
    return 'seizure';
  if (normalized.includes('HandlerClusterFollowup') || normalized.includes('CoreHandlerClusterFollowup'))
    return 'followup';
  if (normalized.includes('HandlerClusterLight') || normalized.includes('CoreHandlerClusterLight'))
    return 'light';
  if (
    normalized.includes('HandlerClusterDossierSupport') ||
    normalized.includes('CoreHandlerClusterDossierSupport')
  )
    return 'dossier';
  if (
    normalized.includes('HandlerClusterPartyDeath') ||
    normalized.includes('PartyLifecycle') ||
    normalized.includes('HandlerClusterEmployeeAssignment')
  )
    return 'party';
  if (
    normalized.includes('HandlerClusterPayment') ||
    normalized.includes('HandlerClusterPublicationNotice') ||
    normalized.includes('useExecutionDashboardPublicationNoticeHandlers')
  )
    return 'publication';
  if (
    normalized.includes('useExecutionDashboardPushTimelineEvent') ||
    normalized.includes('useExecutionDashboardRuntimeSyncEffects') ||
    normalized.includes('useExecutionDashboardSupabaseTimelineHydrate')
  )
    return 'runtime';
  if (normalized.includes('Foundation')) return 'foundation';
  if (normalized.includes('Eviction') && !normalized.includes('Coercive')) return 'eviction';
  if (
    normalized.includes('useExecutionDashboardNotesTasksHandlers') ||
    normalized.includes('useExecutionDashboardAppointmentHandlers') ||
    normalized.includes('useExecutionDashboardPaymentHandlers')
  )
    return 'handlers';
  return 'core';
}

function walk(entries) {
  const visited = new Set();
  const queue = [...entries];
  const sizes = new Map();
  while (queue.length) {
    const file = queue.shift();
    if (!file || visited.has(file) || !fs.existsSync(file)) continue;
    visited.add(file);
    sizes.set(file, fs.statSync(file).size);
    for (const spec of parseStaticImports(file)) {
      const resolved = resolveImport(file, spec);
      if (!resolved || !resolved.includes(`${path.sep}src${path.sep}`)) continue;
      if (resolved.includes('__tests__')) continue;
      // Don't traverse into vendor-like huge unrelated? keep all for exclusivity
      queue.push(resolved);
    }
  }
  return { visited, sizes };
}

function listBridgeEntries(predicate) {
  return fs
    .readdirSync(CORE)
    .filter((f) => f.startsWith('ExecutionDashboardHandlerCluster') && f.endsWith('Bridge.tsx'))
    .filter(predicate)
    .map((f) => path.join(CORE, f));
}

const seizureEntries = listBridgeEntries((f) => /Seizure/.test(f) && !/ThirdPartySeizure/.test(f));
// ThirdPartySeizure is NOT named seizure by manualChunks — exclude from seizure entries
// Actually ThirdPartySeizureBridge doesn't match HandlerClusterSeizure — correct to exclude

const otherEntries = listBridgeEntries((f) => !(/Seizure/.test(f) && !/ThirdPartySeizure/.test(f)));

const seizure = walk(seizureEntries);
const other = walk(otherEntries);

const exclusive = [...seizure.visited].filter((f) => !other.visited.has(f));
const shared = [...seizure.visited].filter((f) => other.visited.has(f));
const seizureNamed = exclusive.filter((f) => resolveCluster(f) === 'seizure');
const exclusiveAbsorbed = exclusive.filter((f) => !resolveCluster(f));

const sum = (files, sizes) => files.reduce((a, f) => a + (sizes.get(f) || 0), 0);
const rel = (f) => f.replace(/\\/g, '/').replace(/^.*New folder\//, '');
const top = (files, sizes, n = 40) =>
  files
    .map((f) => ({
      f: rel(f),
      kb: +((sizes.get(f) || 0) / 1024).toFixed(1),
      cluster: resolveCluster(f) || 'absorbed',
      bucket: categorize(f),
    }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, n);

function categorize(f) {
  const n = normalizeModuleId(f);
  if (n.includes('/domain/seizure/')) return 'domain-seizure';
  if (n.includes('executorSeizureDecisionQueue')) return 'decision-queue';
  if (n.includes('Inline') || n.includes('inline')) return 'inline-persist';
  if (n.includes('/utils/') && n.includes('seizure')) return 'utils-seizure';
  if (n.includes('/ExecutionDashboard/utils/')) return 'ed-utils';
  if (n.includes('/ExecutionDashboard/hooks/') && !n.includes('executionDashboardCore'))
    return 'ed-hooks';
  if (n.includes('/ExecutionDashboard/components/')) return 'ed-components';
  if (n.includes('Coercive')) return 'coercive-logic';
  if (n.includes('SalarySeizure') || n.includes('salarySeizure')) return 'salary';
  return 'other';
}

const byBucket = {};
for (const f of exclusiveAbsorbed) {
  const b = categorize(f);
  byBucket[b] = (byBucket[b] || 0) + (seizure.sizes.get(f) || 0);
}
const byBucketKb = Object.fromEntries(
  Object.entries(byBucket)
    .map(([k, v]) => [k, +(v / 1024).toFixed(1)])
    .sort((a, b) => b[1] - a[1]),
);

const report = {
  seizureEntryFiles: seizureEntries.map(rel),
  otherBridgeCount: otherEntries.length,
  exclusiveCount: exclusive.length,
  exclusiveKb: +(sum(exclusive, seizure.sizes) / 1024).toFixed(1),
  sharedWithOtherClustersCount: shared.length,
  sharedKb: +(sum(shared, seizure.sizes) / 1024).toFixed(1),
  seizureNamedKb: +(sum(seizureNamed, seizure.sizes) / 1024).toFixed(1),
  exclusiveAbsorbedKb: +(sum(exclusiveAbsorbed, seizure.sizes) / 1024).toFixed(1),
  /** Best estimate of what Rollup puts in seizure chunk (named + exclusive absorbed) */
  estimatedSeizureChunkSourceKb: +(
    (sum(seizureNamed, seizure.sizes) + sum(exclusiveAbsorbed, seizure.sizes)) /
    1024
  ).toFixed(1),
  exclusiveAbsorbedByBucketKb: byBucketKb,
  topExclusiveAbsorbed: top(exclusiveAbsorbed, seizure.sizes, 45),
  topSeizureNamed: top(seizureNamed, seizure.sizes, 20),
};

fs.writeFileSync('.audit/_probe_seizure_exclusive.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
