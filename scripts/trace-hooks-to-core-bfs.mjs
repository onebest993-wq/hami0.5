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
    /followupModalContext|followupModalSnapshot|followupModalTabTypes|followupTabKeepAlive|useExecutionFollowupModalSnapshot|FollowupTabKeepAlivePanel/.test(
      id,
    )
  ) {
    return 'execution-followup-shared';
  }
  if (id.includes('ExecutionDashboard/orchestrators')) return 'execution-dashboard-core';
  if (id.includes('executionDashboardUiChunkScope')) return 'execution-dashboard-core';
  if (id.includes('followupSnapshotFieldKeys')) return 'execution-followup-shared';
  if (id.includes('ExecutionDashboard/hooks/')) {
    if (
      /followupModal|FollowupModal|buildFollowupModalSnapshot|executionFollowupModalSnapshot|useExecutionFollowupModalSnapshot/.test(
        id,
      ) &&
      !id.includes('useFollowupModalPersistNavigation') &&
      !id.includes('enrichFollowupModalSnapshot')
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
    return 'execution-hooks';
  }
  return 'other';
}

const importRe =
  /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

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

function deps(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src))) {
    const t = resolve(file, m[1]);
    if (t) out.push(t);
  }
  return out;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !ent.name.includes('node_modules')) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(ent.name) && !ent.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const all = walk(root);
const graph = new Map(all.map((f) => [f, deps(f)]));

const hookSeeds = all.filter((f) => viteChunk(f) === 'execution-hooks');
const paths = [];

for (const seed of hookSeeds) {
  const queue = [[seed]];
  const seen = new Set();
  while (queue.length) {
    const pathNodes = queue.shift();
    const node = pathNodes[pathNodes.length - 1];
    const key = node;
    if (seen.has(key)) continue;
    seen.add(key);
    if (pathNodes.length > 12) continue;
    if (pathNodes.length > 1 && viteChunk(node) === 'execution-dashboard-core') {
      paths.push(pathNodes.map((n) => path.relative(root, n)));
      break;
    }
    for (const d of graph.get(node) || []) {
      if (!pathNodes.includes(d)) queue.push([...pathNodes, d]);
    }
  }
}

console.log(`hooks->core paths found: ${paths.length}`);
for (const p of paths.slice(0, 15)) {
  console.log('\n' + p.join('\n  -> '));
}
