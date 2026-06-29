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
  if (id.includes('ExecutionDashboard/hooks/')) {
    if (
      /followupModal|FollowupModal|buildFollowupModalSnapshot|executionFollowupModalSnapshot|useExecutionFollowupModalSnapshot|followupModalTabTypes/.test(
        id,
      ) &&
      !id.includes('useFollowupModalPersistNavigation') &&
      !id.includes('enrichFollowupModalSnapshot')
    ) {
      return 'followup-shared';
    }
    return 'hooks';
  }
  if (id.includes('ExecutionDashboard/helpers/')) return 'helpers';
  if (id.includes('followupModalTabTypes')) return 'followup-shared';
  return 'other';
}

const importRe =
  /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

function resolve(from, spec) {
  if (spec.startsWith('@/')) {
    const rel = spec.slice(2);
    let p = path.join(root, 'app', rel);
    const candidates = [p, `${p}.ts`, `${p}.tsx`, `${p}.mts`, path.join(p, 'index.ts'), path.join(p, 'index.tsx')];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    return null;
  }
  if (!spec.startsWith('.')) return null;
  let p = path.resolve(path.dirname(from), spec);
  const candidates = [p, `${p}.ts`, `${p}.tsx`, `${p}.mts`, path.join(p, 'index.ts'), path.join(p, 'index.tsx')];
  for (const c of candidates) {
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
    const target = resolve(file, m[1]);
    if (target) out.push(target);
  }
  return out;
}

const entry = path.join(
  root,
  'app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const visited = new Set();
const queue = [entry];
const hooksToCore = [];

while (queue.length) {
  const node = queue.shift();
  if (visited.has(node)) continue;
  visited.add(node);
  const fromChunk = chunkFor(node);
  for (const dep of deps(node)) {
    const toChunk = chunkFor(dep);
    if (fromChunk === 'hooks' && toChunk === 'core') {
      hooksToCore.push(`${path.relative(root, node)} -> ${path.relative(root, dep)}`);
    }
    if (!visited.has(dep)) queue.push(dep);
  }
}

console.log(`Reachable from core: ${visited.size} modules`);
console.log(`hooks->core edges in reachable graph: ${hooksToCore.length}`);
for (const e of hooksToCore) console.log(' ', e);
