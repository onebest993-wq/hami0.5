import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function viteChunk(id) {
  id = id.replace(/\\/g, '/');
  if (
    id.includes('useFollowupModalPersistNavigation') ||
    id.includes('useExecutionDashboardView') ||
    id.includes('useExecutionDashboardState') ||
    id.includes('useExecutionDashboardCore')
  ) {
    return 'execution-dashboard-core';
  }
  if (
    id.includes('ExecutionDashboard/hooks/executionDashboardCore') ||
    id.includes('useExecutionDashboardShellOrchestrators') ||
    id.includes('useExecutionDashboardClaimFinancials') ||
    id.includes('useExecutionDashboardGraceAndSummoning') ||
    id.includes('useExecutionDashboardFollowupSeizureTabs') ||
    id.includes('useExecutionDashboardOtherPartyMirror') ||
    id.includes('useExecutionDashboardSalarySeizureTabRows') ||
    id.includes('useExecutionDashboardCoerciveActionBridge') ||
    id.includes('useExecutionDashboardSeizureReleaseHandlers') ||
    id.includes('useExecutionDashboardThirdPartyReceiveHandlers') ||
    id.includes('useFollowupModalTabGuards')
  ) {
    return 'execution-dashboard-core';
  }
  if (
    id.includes('executionDashboardLazyChunkScope') ||
    id.includes('executionDashboardLazyRegistry') ||
    id.includes('executionFollowupModalLazy') ||
    id.includes('executionFollowupTabPrefetch')
  ) {
    return 'execution-lazy-registry';
  }
  if (id.includes('executionDashboardLazyShellUi') || id.includes('DebtorFinancialProgressBar')) {
    return 'execution-helpers';
  }
  if (id.includes('executionModalStack')) return 'execution-helpers';
  if (
    id.includes('executorApprovalWorkflow') ||
    id.includes('publicationNoticeDebtor') ||
    id.includes('residentialEvictionGrace') ||
    id.includes('executionModuleStrategies')
  ) {
    return 'execution-helpers';
  }
  if (id.includes('followupModalTabTypes')) return 'execution-helpers';
  if (
    /followupModalContext|followupModalSnapshot|followupTabKeepAlive|useExecutionFollowupModalSnapshot|FollowupTabKeepAlivePanel/.test(
      id,
    )
  ) {
    return 'execution-followup-shared';
  }
  if (id.includes('ExecutionDashboard/orchestrators')) return 'execution-dashboard-core';
  if (
    id.includes('executionDashboardStaticChunkScope') ||
    id.includes('executionDashboardConstants') ||
    id.includes('ExecutionDashboard/hooks/executionDashboardStaticChunkScope')
  ) {
    return 'execution-dashboard-static-scope';
  }
  if (id.includes('executionDashboardClaimFinancials')) return 'execution-helpers';
  if (id.includes('executionDashboardGraceSummoning')) return 'execution-helpers';
  if (id.includes('executionDashboardRuntimeChunkScope')) return 'execution-helpers';
  if (id.includes('executionDashboardUiChunkScope')) return 'execution-dashboard-core';
  if (id.includes('followupSnapshotFieldKeys')) return 'execution-followup-shared';
  if (id.includes('ExecutionDashboard/hooks/')) {
    if (
      /followupModal|FollowupModal|buildFollowupModalSnapshot|executionFollowupModalSnapshot|useExecutionFollowupModalSnapshot|enrichFollowupModalSnapshot/.test(
        id,
      ) &&
      !id.includes('useFollowupModalPersistNavigation')
    ) {
      return 'execution-followup-shared';
    }
    if (
      /LazyChunk|ChunkScope|BootPrefetch|PhoneBodyGate|PhoneBodyPropKeys|ShellOverlayPropKeys|buildExecutionPhoneBodyProps|buildExecutionDashboardChunkScopeSources|pickExecution|assignExecution|executionDashboardChunkScope|executionPhoneBodyScope|executionShellOverlayScope/.test(
        id,
      )
    ) {
      return 'execution-dashboard-core';
    }
    return 'execution-dashboard-core';
  }
  if (id.includes('requestsTabConstants')) return 'execution-helpers';
  if (id.includes('ExecutionDashboard/helpers/')) return 'execution-helpers';
  return null;
}

const importRe =
  /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
const exportFromRe = /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g;

function resolve(from, spec) {
  if (spec.startsWith('@/')) {
    let p = path.join(root, 'app', spec.slice(2));
    for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, 'index.ts')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    return null;
  }
  if (!spec.startsWith('.')) return null;
  let p = path.resolve(path.dirname(from), spec);
  for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !ent.name.includes('node_modules')) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(ent.name) && !ent.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const files = walk(path.join(root, 'app'));
const graph = new Map();

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const deps = new Set();
  for (const re of [importRe, exportFromRe]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const dep = resolve(f, m[1]);
      if (dep) deps.add(dep);
    }
  }
  graph.set(f, [...deps]);
}

const chunkMemo = new Map();

function resolveChunk(file, stack = new Set()) {
  if (chunkMemo.has(file)) return chunkMemo.get(file);
  if (stack.has(file)) return 'unassigned';
  stack.add(file);

  const explicit = viteChunk(file.replace(/\\/g, '/'));
  if (explicit) {
    chunkMemo.set(file, explicit);
    return explicit;
  }

  let best = 'unassigned';
  for (const [importer, deps] of graph) {
    if (!deps.includes(file)) continue;
    const ic = resolveChunk(importer, stack);
    if (ic === 'execution-dashboard-core' || ic === 'execution-helpers') {
      best = ic;
      break;
    }
  }
  chunkMemo.set(file, best);
  return best;
}

function chunkOf(file) {
  return resolveChunk(file);
}

// warm memo
for (const f of files) chunkOf(f);

const crossEdges = [];
for (const [from, deps] of graph) {
  const fromChunk = chunkOf(from);
  if (fromChunk !== 'execution-dashboard-core' && fromChunk !== 'execution-helpers') continue;
  for (const dep of deps) {
    const toChunk = chunkOf(dep);
    if (fromChunk !== toChunk && (toChunk === 'execution-dashboard-core' || toChunk === 'execution-helpers')) {
      crossEdges.push({ from: path.relative(root, from), to: path.relative(root, dep), fromChunk, toChunk });
    }
  }
}

console.log('core -> helpers:');
for (const e of crossEdges.filter((x) => x.fromChunk === 'execution-dashboard-core' && x.toChunk === 'execution-helpers')) {
  console.log(`  ${e.from} -> ${e.to}`);
}

console.log('\nhelpers -> core:');
for (const e of crossEdges.filter((x) => x.fromChunk === 'execution-helpers' && x.toChunk === 'execution-dashboard-core')) {
  console.log(`  ${e.from} -> ${e.to}`);
}

// BFS for short cycle through unassigned
const _coreFiles = files.filter((f) => chunkOf(f) === 'execution-dashboard-core');
const _helperFiles = new Set(files.filter((f) => chunkOf(f) === 'execution-helpers'));

function _depsInChunk(file, targetChunk) {
  return (graph.get(file) || []).filter((d) => chunkOf(d) === targetChunk);
}

console.log('\nhelpers-chunk files importing hooks/core paths:');
for (const f of files) {
  if (chunkOf(f) !== 'execution-helpers') continue;
  const src = fs.readFileSync(f, 'utf8');
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(src))) {
    const spec = m[1];
    if (
      spec.includes('ExecutionDashboard/hooks') ||
      spec.includes('executionDashboardCore') ||
      spec.includes('useExecutionDashboardCore') ||
      /^\.(\/|\.\/).*hooks/.test(spec)
    ) {
      console.log(`  ${path.relative(root, f)} -> ${spec}`);
    }
  }
}
