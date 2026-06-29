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
  if (id.includes('followupModalTabTypes')) return 'followup-shared';
  return 'other';
}

const importRe =
  /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

function resolve(from, spec) {
  if (spec.startsWith('@/')) {
    const rel = spec.slice(2);
    let p = path.join(root, 'app', rel);
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
    if (ent.isDirectory() && !ent.name.includes('node_modules')) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(ent.name) && !ent.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const files = walk(root);
const graph = new Map();

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const deps = [];
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src))) {
    const target = resolve(f, m[1]);
    if (target) deps.push(target);
  }
  graph.set(f, deps);
}

function findPaths(startChunk, targetChunk, maxDepth = 8) {
  const starts = files.filter((f) => chunkFor(f) === startChunk);
  const paths = [];

  for (const start of starts) {
    const queue = [[start]];
    const seen = new Set();
    while (queue.length) {
      const pathNodes = queue.shift();
      const node = pathNodes[pathNodes.length - 1];
      if (pathNodes.length > maxDepth) continue;
      const key = `${node}|${pathNodes.length}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (pathNodes.length > 1 && chunkFor(node) === targetChunk) {
        paths.push(pathNodes.map((n) => path.relative(root, n)));
        if (paths.length >= 5) return paths;
        continue;
      }

      for (const dep of graph.get(node) || []) {
        if (!pathNodes.includes(dep)) queue.push([...pathNodes, dep]);
      }
    }
  }
  return paths;
}

console.log('hooks -> core paths:');
for (const p of findPaths('hooks', 'core')) {
  console.log('  ' + p.join(' -> '));
}

console.log('\ncore -> hooks paths (short):');
for (const p of findPaths('core', 'hooks').slice(0, 5)) {
  console.log('  ' + p.join(' -> '));
}
