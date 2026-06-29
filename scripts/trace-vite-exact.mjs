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

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !ent.name.includes('node_modules')) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(ent.name) && !ent.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const hooksDir = path.join(root, 'app/components/lawyer/ExecutionDashboard/hooks');
const hookFiles = walk(hooksDir);
const edges = [];

for (const f of hookFiles) {
  const from = viteChunk(f);
  if (from !== 'execution-hooks') continue;
  const src = fs.readFileSync(f, 'utf8');
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src))) {
    const dep = resolve(f, m[1]);
    if (!dep) continue;
    const to = viteChunk(dep);
    if (to === 'execution-dashboard-core') {
      edges.push([path.relative(root, f), path.relative(root, dep)]);
    }
  }
}

console.log(`hooks->core edges (exact vite rules): ${edges.length}`);
for (const e of edges) console.log(`  ${e[0]} -> ${e[1]}`);

// Also check index.ts re-exports
const indexPath = path.join(hooksDir, 'index.ts');
const indexSrc = fs.readFileSync(indexPath, 'utf8');
const exportRe = /from\s+['"](\.\/[^'"]+)['"]/g;
console.log('\nindex.ts re-exports to core:');
let em;
while ((em = exportRe.exec(indexSrc))) {
  const dep = resolve(indexPath, em[1]);
  if (dep && viteChunk(dep) === 'execution-dashboard-core') {
    console.log(' ', em[1], '->', path.relative(root, dep));
  }
}
