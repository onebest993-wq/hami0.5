/**
 * Find shared modules between Host/Boot/MainView and tumor seed modules.
 * Shared modules without their own manualChunks name get absorbed into tumor chunks,
 * causing Host to statically import the tumor chunk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Load vite config chunk classifiers by evaluating the .mts via dynamic import won't work easily.
// Re-implement the full resolve chain order from vite.config.mts for "has own chunk name".

const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];
const toPosix = (p) => p.split(path.sep).join('/');

function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 1;
      continue;
    }
    out += src[i];
  }
  return out;
}

function staticSpecs(src) {
  const cleaned = stripComments(src);
  const specs = new Set();
  for (const m of cleaned.matchAll(/(?:^|[\s;}])import\s+(?:[\w*{][^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
    specs.add(m[1]);
  }
  for (const m of cleaned.matchAll(/export\s+(?:\*|{[^}]*})\s*from\s*['"]([^'"]+)['"]/g)) {
    specs.add(m[1]);
  }
  return specs;
}

function typeOnlySpecs(src) {
  const cleaned = stripComments(src);
  const specs = new Set();
  for (const m of cleaned.matchAll(/import\s+type\s[^;]*?from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
  return specs;
}

function resolveSpec(fromRel, spec) {
  let base;
  if (spec.startsWith('@/app/')) base = path.join(ROOT, 'src/app', spec.slice('@/app/'.length));
  else if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(ROOT, path.dirname(fromRel), spec);
  else return null;
  const cands = [];
  if (path.extname(base)) cands.push(base);
  for (const e of EXTS) cands.push(base + e);
  for (const e of EXTS) cands.push(path.join(base, `index${e}`));
  for (const c of cands) {
    try {
      if (fs.statSync(c).isFile()) return toPosix(path.relative(ROOT, c));
    } catch {
      /* next */
    }
  }
  return null;
}

function closure(entry) {
  const seen = new Set();
  const queue = [entry];
  const parent = new Map();
  const edgeSpec = new Map(); // child -> {from, spec}
  while (queue.length) {
    const cur = queue.shift();
    if (seen.has(cur)) continue;
    seen.add(cur);
    let src;
    try {
      src = fs.readFileSync(path.join(ROOT, cur), 'utf8');
    } catch {
      continue;
    }
    const types = typeOnlySpecs(src);
    for (const spec of staticSpecs(src)) {
      if (types.has(spec)) continue;
      const r = resolveSpec(cur, spec);
      if (!r) continue;
      if (!parent.has(r)) {
        parent.set(r, cur);
        edgeSpec.set(r, { from: cur, spec });
      }
      if (!seen.has(r)) queue.push(r);
    }
  }
  return { seen, parent, edgeSpec };
}

function chain(mod, parent, edgeSpec, stopAt) {
  const parts = [];
  let cur = mod;
  const guard = new Set();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const e = edgeSpec.get(cur);
    if (e) parts.unshift(`${e.from} --(${e.spec})--> ${cur}`);
    else parts.unshift(cur);
    if (stopAt && stopAt.has(parent.get(cur))) break;
    cur = parent.get(cur);
    if (cur === stopAt || (stopAt && stopAt.has?.(cur))) break;
  }
  return parts;
}

function normalize(id) {
  return ('/' + id.replace(/\\/g, '/')).replace(/^\/*/, '/');
}

/** Approximate: does this module get its OWN named chunk from vite manualChunks? */
function ownChunkName(id) {
  const n = normalize(id);
  // vendor
  if (n.includes('node_modules/@supabase') || n.includes('/src/lib/supabase')) return 'vendor-supabase';
  // minimal boot seed
  if (n.includes('/LawyerDashboardMinimalBootPath')) return 'lawyer-dashboard-minimal-boot';
  // archive
  if (n.includes('/ArchivePortal/LawsuitArchiveChrome') || n.includes('/LawsuitArchiveFileGrid'))
    return 'lawsuit-archive-grid';
  if (
    n.includes('/ExecutionArchiveChrome') ||
    n.includes('/ExecutionArchiveFileGrid') ||
    n.includes('/ExecutionArchiveToolbar')
  )
    return 'archive-portal-execution';
  if (n.includes('/ArchivePortalLawsuitEntry')) return 'lawsuit-archive-portal';
  if (n.includes('/ArchivePortal.tsx')) return 'app-archive-portal';
  if (
    n.includes('LawsuitArchiveLifecycleBars') ||
    n.includes('ExecutionArchiveLifecycleBars') ||
    n.includes('ArchiveDossierToolbar') ||
    n.includes('criminalArchiveUtils')
  )
    return 'archive-portal-lite';
  // home paint / stem / coerce / orchestration lite — protectors
  if (n.includes('/homeStemIcons')) return 'lawyer-home-stem-icons';
  const homePaint = [
    '/HomeMainGrid',
    '/HomeMainGridFirstPaint',
    '/useHomeMainGridSlots',
    '/HomeHubErrorBoundary',
    '/HomeHubCardSkeleton',
    '/LawyerHomeAmbient',
    '/HomeBlockPatternOverlay',
    '/HomeMoroccanGlassDecor',
    '/homeLayout',
    '/homeWidgetPlacements',
    '/homeBlockLabels',
    '/resolveHomeBlockStyle',
    '/resolveHubRouteTileVisuals',
    '/homeBlockScale',
  ];
  if (homePaint.some((f) => n.includes(f))) return 'lawyer-home-paint';
  if (n.includes('/LawyerDashboardParts/utils') || n.includes('/executionPartyNormalize'))
    return 'lawyer-file-coerce';
  const orchLite = [
    '/profileShellPolicy',
    '/quantumTasksMetrics',
    '/fieldCurtainDayCountLite',
    '/criminalArchiveHearing',
    '/archiveYmd',
  ];
  if (orchLite.some((f) => n.includes(f))) return 'lawyer-orchestration-lite';
  // execution handler cluster
  if (n.includes('/ExecutionDashboard/') && n.includes('/executionDashboardCore/')) {
    const inHandlerCluster =
      n.includes('/ExecutionDashboardHandlerCluster') ||
      n.includes('/useExecutionDashboardCoreHandlerCluster') ||
      n.includes('handlerClusterContextShared') ||
      n.includes('buildHandlerClusterCoreInput') ||
      n.includes('executionDashboardCoreHandlerClusterTypes') ||
      n.includes('useExecutionDashboardNotesTasksHandlers') ||
      n.includes('useExecutionDashboardAppointmentHandlers') ||
      n.includes('useExecutionDashboardPaymentHandlers') ||
      n.includes('useExecutionDashboardPushTimelineEvent') ||
      n.includes('useExecutionDashboardRuntimeSyncEffects') ||
      n.includes('useExecutionDashboardSupabaseTimelineHydrate');
    if (inHandlerCluster) {
      if (n.includes('handlerClusterContextShared') || n.includes('buildHandlerClusterCoreInput') || n.includes('executionDashboardCoreHandlerClusterTypes'))
        return 'execution-handler-cluster-shared';
      if (n.includes('HandlerClusterFollowup') || n.includes('CoreHandlerClusterFollowup'))
        return 'execution-handler-cluster-followup';
      if (n.includes('HandlerClusterDossierSupport') || n.includes('CoreHandlerClusterDossierSupport'))
        return 'execution-handler-cluster-dossier';
      if (n.includes('Foundation')) return 'execution-handler-cluster-foundation';
      if (
        n.includes('useExecutionDashboardPushTimelineEvent') ||
        n.includes('useExecutionDashboardRuntimeSyncEffects') ||
        n.includes('useExecutionDashboardSupabaseTimelineHydrate')
      )
        return 'execution-handler-cluster-runtime';
      if (
        n.includes('useExecutionDashboardNotesTasksHandlers') ||
        n.includes('useExecutionDashboardAppointmentHandlers') ||
        n.includes('useExecutionDashboardPaymentHandlers')
      )
        return 'execution-handler-cluster-handlers';
      return 'execution-handler-cluster-core';
    }
  }
  return null;
}

const hosts = {
  FullOrchestrationHost: 'src/app/components/lawyer/dashboard/LawyerDashboardFullOrchestrationHost.tsx',
  FullBootPath: 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx',
  MainView: 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
};

const tumorSeeds = {
  'lawyer-dashboard-minimal-boot': [
    'src/app/components/lawyer/dashboard/LawyerDashboardMinimalBootPath.tsx',
  ],
  'archive-portal-execution': [
    'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
    'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx',
    'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveToolbar.tsx',
  ],
  'lawsuit-archive-grid': [
    'src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx',
    'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
  ],
  'execution-handler-cluster-handlers': [], // filled by glob
  'execution-handler-cluster-runtime': [],
  'execution-handler-cluster-dossier': [],
  'execution-handler-cluster-followup': [],
  'execution for-handler-cluster-core': [],
  'execution-handler-cluster-foundation': [],
  'vendor-supabase': ['src/lib/supabase.ts', 'src/lib/supabaseClient.js', 'src/app/lib/supabase-client.ts'],
};

// discover execution handler seeds via walk
function walkDir(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.includes('.test.')) acc.push(toPosix(path.relative(ROOT, p)));
  }
  return acc;
}

const execCore = walkDir(path.join(ROOT, 'src/app/components/lawyer/ExecutionDashboard'));
for (const m of execCore) {
  const c = ownChunkName(m);
  if (c && c.startsWith('execution-handler-cluster-') && tumorSeeds[c]) {
    tumorSeeds[c].push(m);
  }
}
// fix typo key
tumorSeeds['execution-handler-cluster-core'] = tumorSeeds['execution for-handler-cluster-core'] || [];
delete tumorSeeds['execution for-handler-cluster-core'];
for (const m of execCore) {
  const c = ownChunkName(m);
  if (c === 'execution-handler-cluster-core') tumorSeeds[c].push(m);
}

const hostClosures = {};
for (const [name, entry] of Object.entries(hosts)) {
  hostClosures[name] = closure(entry);
  console.log(`${name} closure: ${hostClosures[name].seen.size} modules`);
}

for (const [tumor, seeds] of Object.entries(tumorSeeds)) {
  const seedSet = new Set();
  const seedParents = new Map();
  const seedEdges = new Map();
  for (const seed of seeds) {
    if (!fs.existsSync(path.join(ROOT, seed))) continue;
    const c = closure(seed);
    for (const m of c.seen) seedSet.add(m);
    for (const [k, v] of c.parent) if (!seedParents.has(k)) seedParents.set(k, v);
    for (const [k, v] of c.edgeSpec) if (!seedEdges.has(k)) seedEdges.set(k, v);
  }
  console.log(`\n################ ${tumor} (seeds=${seeds.length}, closure≈${seedSet.size})`);

  for (const [hostName, hc] of Object.entries(hostClosures)) {
    // Shared modules that Host needs AND tumor seed closure contains,
    // AND that do NOT have their own chunk name (would be absorbed into tumor).
    // Also include tumor-owned modules themselves if Host imports them.
    const shared = [...hc.seen].filter((m) => seedSet.has(m));
    const absorbCandidates = shared.filter((m) => {
      const own = ownChunkName(m);
      return !own || own === tumor;
    });
    // Direct edges from host-side (not in seed-only) into tumor-owned or absorbed
    const cross = [];
    // Walk host edges conceptually: for each shared absorb candidate, show host path to it
    if (absorbCandidates.length === 0) {
      console.log(`  ${hostName}: no shared absorb candidates`);
      continue;
    }
    // Prefer candidates that are tumor-owned OR first-party shared leaves
    const interesting = absorbCandidates
      .filter((m) => ownChunkName(m) === tumor || !ownChunkName(m))
      .sort((a, b) => a.localeCompare(b));

    console.log(`  ${hostName}: ${interesting.length} shared modules that can sit in ${tumor}`);
    // Show top-level entry edges: modules whose parent in HOST closure is NOT in seedSet
    // = the actual cut points from host graph into the absorbed region
    const cutPoints = interesting.filter((m) => {
      const p = hc.parent.get(m);
      if (!p) return true; // entry
      // parent outside absorbed set OR parent has different own chunk
      const parentAbsorbed = interesting.includes(p) || seedSet.has(p);
      const pe = hc.edgeSpec.get(m);
      if (!pe) return false;
      // cut if parent is in host closure but NOT classified as this tumor's absorbed set exclusively from seed
      return !interesting.includes(p);
    });

    console.log(`  cut-point modules (${cutPoints.length}):`);
    for (const m of cutPoints.slice(0, 40)) {
      const e = hc.edgeSpec.get(m);
      const own = ownChunkName(m) || '(absorbed)';
      if (!e) {
        console.log(`    ENTRY ${m} [${own}]`);
        continue;
      }
      console.log(`    ${e.from}`);
      console.log(`      --(${e.spec})--> ${m} [${own}]`);
    }
    if (cutPoints.length > 40) console.log(`    ... +${cutPoints.length - 40} more`);
  }
}
