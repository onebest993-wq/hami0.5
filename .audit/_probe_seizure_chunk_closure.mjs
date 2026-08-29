/** Probe static import closure for execution-handler-cluster-seizure entries. */
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve('src');

function tryFile(base) {
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
  for (const e of exts) {
    const p = base + e;
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.normalize(p);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@/')) {
    const rest = spec.slice(2);
    for (const cand of [
      path.join(SRC_ROOT, rest),
      path.join(SRC_ROOT, 'app', rest),
    ]) {
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
  ) {
    return 'shared';
  }
  if (normalized.includes('HandlerClusterCoercive') || normalized.includes('CoreHandlerClusterCoercive')) {
    return 'coercive';
  }
  if (normalized.includes('HandlerClusterSeizure') || normalized.includes('CoreHandlerClusterSeizure')) {
    return 'seizure';
  }
  if (normalized.includes('HandlerClusterFollowup') || normalized.includes('CoreHandlerClusterFollowup')) {
    return 'followup';
  }
  if (normalized.includes('HandlerClusterLight') || normalized.includes('CoreHandlerClusterLight')) {
    return 'light';
  }
  if (
    normalized.includes('HandlerClusterDossierSupport') ||
    normalized.includes('CoreHandlerClusterDossierSupport')
  ) {
    return 'dossier';
  }
  if (
    normalized.includes('HandlerClusterPartyDeath') ||
    normalized.includes('PartyLifecycle') ||
    normalized.includes('HandlerClusterEmployeeAssignment')
  ) {
    return 'party';
  }
  if (
    normalized.includes('HandlerClusterPayment') ||
    normalized.includes('HandlerClusterPublicationNotice') ||
    normalized.includes('useExecutionDashboardPublicationNoticeHandlers')
  ) {
    return 'publication';
  }
  if (
    normalized.includes('useExecutionDashboardPushTimelineEvent') ||
    normalized.includes('useExecutionDashboardRuntimeSyncEffects') ||
    normalized.includes('useExecutionDashboardSupabaseTimelineHydrate')
  ) {
    return 'runtime';
  }
  if (normalized.includes('Foundation')) return 'foundation';
  if (normalized.includes('Eviction') && !normalized.includes('Coercive')) return 'eviction';
  if (
    normalized.includes('useExecutionDashboardNotesTasksHandlers') ||
    normalized.includes('useExecutionDashboardAppointmentHandlers') ||
    normalized.includes('useExecutionDashboardPaymentHandlers')
  ) {
    return 'handlers';
  }
  return 'core';
}

const entries = [
  'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterSeizureHeavyBridge.tsx',
  'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterSeizureLogAssetModalBridge.tsx',
  'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterSeizureLogResolutionBridge.tsx',
].map((p) => path.resolve(p));

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
    queue.push(resolved);
  }
}

const sum = (files) => files.reduce((a, f) => a + (sizes.get(f) || 0), 0);
const rel = (f) => f.replace(/\\/g, '/').replace(/^.*New folder\//, '');
const top = (files, n = 25) =>
  files
    .map((f) => ({
      f: rel(f),
      kb: +((sizes.get(f) || 0) / 1024).toFixed(1),
      cluster: resolveCluster(f) || 'absorbed',
    }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, n);

const seizureAssigned = [...visited].filter((f) => resolveCluster(f) === 'seizure');
const absorbed = [...visited].filter((f) => !resolveCluster(f));
const otherCluster = [...visited].filter((f) => {
  const c = resolveCluster(f);
  return c && c !== 'seizure';
});

// Absorbed likely IN seizure chunk (exclusive deps); otherCluster leave via manualChunks
const report = {
  visited: visited.size,
  seizureAssignedCount: seizureAssigned.length,
  seizureAssignedKb: +(sum(seizureAssigned) / 1024).toFixed(1),
  absorbedCount: absorbed.length,
  absorbedKb: +(sum(absorbed) / 1024).toFixed(1),
  otherClusterCount: otherCluster.length,
  otherClusterKb: +(sum(otherCluster) / 1024).toFixed(1),
  /** heuristic: seizure chunk ≈ seizureAssigned + absorbed (not other named clusters) */
  likelySeizureRawSourceKb: +((sum(seizureAssigned) + sum(absorbed)) / 1024).toFixed(1),
  topAbsorbed: top(absorbed, 35),
  topSeizureAssigned: top(seizureAssigned, 25),
  topOtherClusterPulled: top(otherCluster, 20),
};

fs.writeFileSync('.audit/_probe_seizure_chunk_closure.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
