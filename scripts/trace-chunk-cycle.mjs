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
      /followupModal|FollowupModal|buildFollowupModalSnapshot|executionFollowupModalSnapshot|useExecutionFollowupModalSnapshot/.test(
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
  return null;
}

const importRe =
  /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

function resolve(from, spec) {
  if (!spec.startsWith('.')) return null;
  let p = path.resolve(path.dirname(from), spec);
  const candidates = [
    p,
    `${p}.ts`,
    `${p}.tsx`,
    `${p}.mts`,
    path.join(p, 'index.ts'),
    path.join(p, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== '__tests__' && ent.name !== 'node_modules') {
      walk(p, out);
    } else if (/\.(tsx?|mts)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(path.join(root, 'app/components/lawyer/ExecutionDashboard'));
const edges = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const fromChunk = chunkFor(f);
  if (!fromChunk || fromChunk === 'followup-shared') continue;
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src))) {
    const target = resolve(f, m[1]);
    if (!target) continue;
    const toChunk = chunkFor(target);
    if (!toChunk || toChunk === fromChunk || toChunk === 'followup-shared') continue;
    edges.push({
      from: path.relative(root, f),
      to: path.relative(root, target),
      fromChunk,
      toChunk,
    });
  }
}

const cross = edges.filter(
  (e) =>
    (e.fromChunk === 'core' && e.toChunk === 'hooks') ||
    (e.fromChunk === 'hooks' && e.toChunk === 'core'),
);

console.log(`core<->hooks value edges: ${cross.length}`);
for (const e of cross) {
  console.log(`${e.fromChunk} -> ${e.toChunk}: ${e.from} -> ${e.to}`);
}
