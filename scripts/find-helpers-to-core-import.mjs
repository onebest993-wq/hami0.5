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
  if (id.includes('executionDashboardLazyShellUi') || id.includes('DebtorFinancialProgressBar')) return 'execution-helpers';
  if (id.includes('executionModalStack')) return 'execution-helpers';
  if (
    id.includes('executorApprovalWorkflow') ||
    id.includes('publicationNoticeDebtor') ||
    id.includes('residentialEvictionGrace') ||
    id.includes('executionModuleStrategies')
  ) return 'execution-helpers';
  if (id.includes('followupModalTabTypes')) return 'execution-helpers';
  if (id.includes('ExecutionDashboard/orchestrators')) return 'execution-dashboard-core';
  if (id.includes('executionDashboardClaimFinancials')) return 'execution-helpers';
  if (id.includes('executionDashboardGraceSummoning')) return 'execution-helpers';
  if (id.includes('executionDashboardRuntimeChunkScope')) return 'execution-helpers';
  if (id.includes('ExecutionDashboard/hooks/')) return 'execution-dashboard-core';
  if (id.includes('requestsTabConstants')) return 'execution-helpers';
  if (id.includes('ExecutionDashboard/helpers/')) return 'execution-helpers';
  return null;
}

const importRe = /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

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

function traceToCore(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  const chunk = viteChunk(file.replace(/\\/g, '/'));
  if (chunk === 'execution-dashboard-core') return [[file]];
  const paths = [];
  const src = fs.readFileSync(file, 'utf8');
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(src))) {
    const dep = resolve(file, m[1]);
    if (!dep) continue;
    for (const sub of traceToCore(dep, seen)) paths.push([file, ...sub]);
  }
  return paths;
}

const files = walk(path.join(root, 'app'));
for (const f of files) {
  if (viteChunk(f.replace(/\\/g, '/')) !== 'execution-helpers') continue;
  for (const chain of traceToCore(f)) {
    if (chain.length < 2) continue;
    const last = chain[chain.length - 1];
    if (viteChunk(last.replace(/\\/g, '/')) === 'execution-dashboard-core') {
      console.log(chain.map((x) => path.relative(root, x)).join(' -> '));
      break;
    }
  }
}
