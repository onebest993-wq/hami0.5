import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function chunkFor(id) {
  id = id.replace(/\\/g, '/');
  if (
    id.includes('useFollowupModalPersistNavigation') ||
    id.includes('useExecutionDashboardView') ||
    id.includes('useExecutionDashboardState') ||
    id.includes('useExecutionDashboardCore')
  ) {
    return 'core';
  }
  if (id.includes('ExecutionDashboard/hooks/executionDashboardCore')) return 'core';
  if (
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
    return 'core';
  }
  if (id.includes('ExecutionDashboard/orchestrators')) return 'core';
  if (id.includes('executionDashboardUiChunkScope')) return 'core';
  if (
    /LazyChunk|ChunkScope|BootPrefetch|PhoneBodyGate|PhoneBodyPropKeys|ShellOverlayPropKeys|buildExecutionPhoneBodyProps|buildExecutionDashboardChunkScopeSources|pickExecution|assignExecution|executionDashboardChunkScope|executionPhoneBodyScope|executionShellOverlayScope/.test(
      id,
    )
  ) {
    return 'core';
  }
  if (
    /followupModalContext|followupModalSnapshot|followupModalTabTypes|followupTabKeepAlive|useExecutionFollowupModalSnapshot|FollowupTabKeepAlivePanel/.test(
      id,
    ) &&
    !id.includes('useFollowupModalPersistNavigation') &&
    !id.includes('enrichFollowupModalSnapshot')
  ) {
    return 'followup-shared';
  }
  if (id.includes('ExecutionDashboard/hooks/')) return 'hooks';
  if (id.includes('ExecutionDashboard/helpers/')) return 'helpers';
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
    if (ent.isDirectory() && ent.name !== '__tests__' && ent.name !== 'node_modules') walk(p, out);
    else if (/\.(tsx?|mts)$/.test(ent.name)) out.push(p);
  }
  return out;
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

const all = walk(path.join(root, 'app'));
const graph = new Map(all.map((f) => [f, deps(f)]));

function reachableFrom(seeds) {
  const seen = new Set();
  const q = [...seeds];
  while (q.length) {
    const n = q.pop();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const d of graph.get(n) || []) q.push(d);
  }
  return seen;
}

const coreSeeds = all.filter((f) => chunkFor(f) === 'core');
const hookSeeds = all.filter((f) => chunkFor(f) === 'hooks');
const fromCore = reachableFrom(coreSeeds);
const fromHooks = reachableFrom(hookSeeds);

const coreToHooks = [];
const hooksToCore = [];

for (const [from, list] of graph) {
  const fc = chunkFor(from);
  if (!fc) continue;
  for (const to of list) {
    const tc = chunkFor(to);
    if (fc === 'core' && tc === 'hooks' && fromCore.has(from) && fromHooks.has(to)) {
      coreToHooks.push([path.relative(root, from), path.relative(root, to)]);
    }
    if (fc === 'hooks' && tc === 'core' && fromHooks.has(from) && fromCore.has(to)) {
      hooksToCore.push([path.relative(root, from), path.relative(root, to)]);
    }
  }
}

console.log('core seeds:', coreSeeds.length, 'hooks seeds:', hookSeeds.length);
console.log('reachable core modules:', [...fromCore].filter((f) => chunkFor(f) === 'core').length);
console.log('reachable hooks modules:', [...fromHooks].filter((f) => chunkFor(f) === 'hooks').length);
console.log('live core->hooks edges:', coreToHooks.length);
console.log('live hooks->core edges:', hooksToCore.length);
for (const e of hooksToCore.slice(0, 20)) console.log(' H->C', e.join(' -> '));
for (const e of coreToHooks.slice(0, 10)) console.log(' C->H', e.join(' -> '));
