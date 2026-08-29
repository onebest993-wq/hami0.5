/**
 * Map static edges from FullBoot/Orchestration/MainView into named tumor chunks.
 * Uses the same static-import walker as analyze-static-closure.mjs + vite chunk rules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  else if (spec.startsWith('node_modules/') || !spec.startsWith('.')) {
    // package import — only track supabase packages
    if (spec === '@supabase/supabase-js' || spec.startsWith('@supabase/')) {
      return `node_modules/${spec}`;
    }
    return null;
  } else return null;

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

/** Mirror vite.config.mts tumor chunk assignment (subset). */
function classifyTumor(id) {
  const n = id.replace(/\\/g, '/');

  if (
    n.includes('node_modules/@supabase') ||
    n.endsWith('src/lib/supabaseClient.js') ||
    n.endsWith('src/lib/supabase.ts') ||
    n.includes('/src/app/lib/supabase-client.ts') ||
    n.includes('/src/app/lib/supabase-client.js')
  ) {
    return 'vendor-supabase';
  }

  if (n.includes('/src/app/components/lawyer/dashboard/LawyerDashboardMinimalBootPath')) {
    return 'lawyer-dashboard-minimal-boot';
  }

  if (
    n.includes('/ArchivePortal/LawsuitArchiveChrome') ||
    n.includes('/ArchivePortal/components/LawsuitArchiveFileGrid')
  ) {
    return 'lawsuit-archive-grid';
  }

  if (
    n.includes('/ArchivePortal/ExecutionArchiveChrome') ||
    n.includes('/ArchivePortal/components/ExecutionArchiveFileGrid') ||
    n.includes('/ArchivePortal/components/ExecutionArchiveToolbar')
  ) {
    return 'archive-portal-execution';
  }

  // execution-handler-cluster family
  if (!n.includes('/src/app/components/lawyer/ExecutionDashboard/')) return null;
  if (!n.includes('/executionDashboardCore/')) return null;
  if (n.includes('/__tests__/')) return null;

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

  if (!inHandlerCluster) return null;

  if (
    n.includes('handlerClusterContextShared') ||
    n.includes('buildHandlerClusterCoreInput') ||
    n.includes('executionDashboardCoreHandlerClusterTypes')
  ) {
    return 'execution-handler-cluster-shared';
  }

  if (n.includes('HandlerClusterCoercive') || n.includes('CoreHandlerClusterCoercive')) {
    return 'execution-handler-cluster-coercive';
  }
  if (n.includes('HandlerClusterSeizure') || n.includes('CoreHandlerClusterSeizure')) {
    return 'execution-handler-cluster-seizure';
  }
  if (n.includes('HandlerClusterFollowup') || n.includes('CoreHandlerClusterFollowup')) {
    return 'execution-handler-cluster-followup';
  }
  if (n.includes('HandlerClusterLight') || n.includes('CoreHandlerClusterLight')) {
    return 'execution-handler-cluster-light';
  }
  if (n.includes('HandlerClusterDossierSupport') || n.includes('CoreHandlerClusterDossierSupport')) {
    return 'execution-handler-cluster-dossier';
  }
  if (
    n.includes('HandlerClusterPartyDeath') ||
    n.includes('PartyLifecycle') ||
    n.includes('HandlerClusterEmployeeAssignment')
  ) {
    return 'execution-handler-cluster-party';
  }
  if (
    n.includes('HandlerClusterPayment') ||
    n.includes('HandlerClusterPublicationNotice') ||
    n.includes('useExecutionDashboardPublicationNoticeHandlers')
  ) {
    return 'execution-handler-cluster-publication';
  }
  if (
    n.includes('useExecutionDashboardPushTimelineEvent') ||
    n.includes('useExecutionDashboardRuntimeSyncEffects') ||
    n.includes('useExecutionDashboardSupabaseTimelineHydrate')
  ) {
    return 'execution-handler-cluster-runtime';
  }
  if (n.includes('Foundation')) return 'execution-handler-cluster-foundation';
  if (n.includes('Eviction') && !n.includes('Coercive')) {
    return 'execution-handler-cluster-eviction';
  }
  if (
    n.includes('useExecutionDashboardNotesTasksHandlers') ||
    n.includes('useExecutionDashboardAppointmentHandlers') ||
    n.includes('useExecutionDashboardPaymentHandlers')
  ) {
    return 'execution-handler-cluster-handlers';
  }
  return 'execution-handler-cluster-core';
}

function closure(entry) {
  const seen = new Set();
  const queue = [entry];
  const edges = [];
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
      // Skip type-only named imports: import { type X, Y }
      const r = resolveSpec(cur, spec);
      if (!r) continue;
      edges.push({ from: cur, to: r, spec });
      if (!seen.has(r)) queue.push(r);
    }
  }
  return { seen, edges };
}

function quoteImportLine(from, spec) {
  const abs = path.join(ROOT, from);
  let src;
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.includes(spec) && !line.includes("'") && !line.includes('"')) continue;
    // multi-line import: scan a window
  }
  // Find import statement containing the spec
  const cleaned = src;
  const re = new RegExp(
    String.raw`(?:^|\n)([^\n]*import[^\n]*['"]${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^\n]*)`,
    'g',
  );
  const m = re.exec(cleaned);
  if (m) return m[1].trim();
  // multiline: look for from 'spec'
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(`'${spec}'`) || lines[i].includes(`"${spec}"`)) {
      // walk back to import
      let start = i;
      while (start > 0 && !/^\s*import\b/.test(lines[start]) && !lines[start].includes('import')) {
        start -= 1;
        if (i - start > 12) break;
      }
      return lines.slice(Math.max(0, start), i + 1).join('\n').trim();
    }
  }
  return `import ... from '${spec}'`;
}

const TARGET = new Set([
  'execution-handler-cluster-handlers',
  'archive-portal-execution',
  'execution-handler-cluster-runtime',
  'vendor-supabase',
  'lawsuit-archive-grid',
  'lawyer-dashboard-minimal-boot',
  'execution-handler-cluster-dossier',
  'execution-handler-cluster-followup',
  'execution-handler-cluster-core',
  'execution-handler-cluster-foundation',
]);

const entries = [
  'src/app/components/lawyer/dashboard/LawyerDashboardFullOrchestrationHost.tsx',
  'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx',
  'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
  'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx',
];

for (const entry of entries) {
  console.log(`\n======== ${entry} ========`);
  const { seen, edges } = closure(entry);
  const byTumor = new Map();
  for (const m of seen) {
    const c = classifyTumor(m);
    if (!c || !TARGET.has(c)) continue;
    if (!byTumor.has(c)) byTumor.set(c, []);
    byTumor.get(c).push(m);
  }
  console.log('tumor modules in closure:');
  for (const [c, mods] of [...byTumor.entries()].sort()) {
    console.log(`  ${c}:`);
    for (const m of mods.sort()) console.log(`    - ${m}`);
  }

  console.log('\ncross-boundary inbound edges (non-tumor → tumor):');
  const reported = new Set();
  for (const { from, to, spec } of edges) {
    const ct = classifyTumor(to);
    if (!ct || !TARGET.has(ct)) continue;
    const cf = classifyTumor(from);
    if (cf === ct) continue;
    const key = `${from}|${to}|${spec}`;
    if (reported.has(key)) continue;
    reported.add(key);
    const line = quoteImportLine(from, spec);
    console.log(`\n  [${ct}]`);
    console.log(`  ${from}`);
    console.log(`    → ${to}`);
    console.log(`    spec: ${spec}`);
    if (line) console.log(`    line: ${line}`);
  }
}
