/**
 * Accurate seizure chunk estimate:
 * - Start from seizure-named modules only
 * - Traverse static deps
 * - STOP at other named clusters / shared (they live elsewhere)
 * - Remaining = what Rollup absorbs into seizure
 */
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

function listSeizureNamed() {
  const out = [];
  for (const f of fs.readdirSync(CORE)) {
    if (f.includes('__tests__')) continue;
    const full = path.join(CORE, f);
    if (!fs.statSync(full).isFile()) continue;
    if (resolveCluster(full) === 'seizure') out.push(full);
  }
  return out;
}

const seizureNamed = listSeizureNamed();
const visited = new Set();
const sizes = new Map();
const queue = [...seizureNamed];
const crossChunkStops = [];

while (queue.length) {
  const file = queue.shift();
  if (!file || visited.has(file) || !fs.existsSync(file)) continue;

  const cluster = resolveCluster(file);
  if (cluster && cluster !== 'seizure') {
    crossChunkStops.push({ f: rel(file), cluster });
    continue; // lives in another named chunk
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

function rel(f) {
  return f.replace(/\\/g, '/').replace(/^.*New folder\//, '');
}

function peelGroup(f) {
  const n = normalizeModuleId(f);
  const base = path.basename(n);
  if (/AssetModal|AuctionSession|SeizedPropertyModal|SaveHandlers|SavePublication/i.test(base))
    return 'seizure-assets';
  if (/Inline|inline|propertyInline|movableInline|InlineSave|InlinePersist/i.test(n))
    return 'seizure-inline';
  if (/Release|Receive|StandaloneMark|SalarySeizure|Resolution/i.test(base)) return 'seizure-resolution';
  if (/FollowupSeizure|SeizureRequest|SeizureRow|SeizureInit/i.test(base)) return 'seizure-followup-logic';
  if (/Financial|TrustLedger|FundsReceived/i.test(base)) return 'seizure-financial-utils';
  if (resolveCluster(f) === 'seizure') return 'seizure-named-core';
  if (n.includes('/domain/seizure/')) return 'domain-seizure';
  if (n.includes('executorSeizureDecisionQueue')) return 'decision-queue';
  return 'other-absorbed';
}

const byPeel = {};
for (const f of visited) {
  const g = peelGroup(f);
  byPeel[g] = byPeel[g] || { kb: 0, files: [] };
  byPeel[g].kb += sizes.get(f) || 0;
  byPeel[g].files.push(rel(f));
}
for (const g of Object.keys(byPeel)) {
  byPeel[g].kb = +(byPeel[g].kb / 1024).toFixed(1);
  byPeel[g].files = byPeel[g].files
    .map((f) => ({
      f,
      kb: +((sizes.get(path.resolve(f)) || sizes.get(path.join(process.cwd(), f)) || 0) / 1024).toFixed(1),
    }))
    .sort((a, b) => b.kb - a.kb);
  // fix kb lookup
  byPeel[g].files = [...visited]
    .filter((f) => peelGroup(f) === g)
    .map((f) => ({ f: rel(f), kb: +((sizes.get(f) || 0) / 1024).toFixed(1) }))
    .sort((a, b) => b.kb - a.kb);
}

const sum = [...visited].reduce((a, f) => a + (sizes.get(f) || 0), 0);

const report = {
  seizureNamedCount: seizureNamed.length,
  seizureNamedFiles: seizureNamed.map(rel),
  absorbedIntoSeizureCount: visited.size,
  estimatedSeizureChunkSourceKb: +(sum / 1024).toFixed(1),
  crossChunkStops: crossChunkStops.slice(0, 20),
  byPeelKb: Object.fromEntries(
    Object.entries(byPeel)
      .map(([k, v]) => [k, v.kb])
      .sort((a, b) => b[1] - a[1]),
  ),
  byPeel,
  topModules: [...visited]
    .map((f) => ({
      f: rel(f),
      kb: +((sizes.get(f) || 0) / 1024).toFixed(1),
      peel: peelGroup(f),
      cluster: resolveCluster(f) || 'absorbed',
    }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 40),
};

fs.writeFileSync('.audit/_probe_seizure_accurate.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  estimatedSeizureChunkSourceKb: report.estimatedSeizureChunkSourceKb,
  absorbedIntoSeizureCount: report.absorbedIntoSeizureCount,
  byPeelKb: report.byPeelKb,
  topModules: report.topModules,
  crossChunkStops: report.crossChunkStops,
}, null, 2));
