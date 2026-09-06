import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(ROOT, '.audit', 'architecture-boundaries-baseline.json');
const TMP_PATH = resolve(ROOT, '.audit', '_tmp_guard_eslint_arch_boundaries.json');

const SAVE = process.argv.includes('--save');
const FORCE = process.argv.includes('--force');

const globs = [
  '--format', 'json',
  '--no-error-on-unmatched-pattern',
  'src/app/api/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'src/app/services/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'src/app/domain/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'src/app/application/**/*.{ts,tsx,js,jsx,mjs,cjs}',
];

if (!existsSync(BASELINE_PATH)) {
  console.error('[arch-boundaries ratchet] FATAL — baseline file missing: ' + BASELINE_PATH);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const bApi = Number(baseline?.counts?.apiViolations ?? -1);
const bSvc = Number(baseline?.counts?.servicesViolations ?? -1);
const bDom = Number(baseline?.counts?.domainApplicationViolations ?? -1);
const bTot = Number(baseline?.counts?.totalViolations ?? -1);
if ([bApi, bSvc, bDom, bTot].some((n) => !Number.isFinite(n) || n < 0)) {
  console.error('[arch-boundaries ratchet] FATAL — malformed baseline. Expected 4 numeric non-negative counts. Got:', JSON.stringify(baseline?.counts));
  process.exit(2);
}

const isWin = process.platform === 'win32';
const exe = isWin ? 'npx.cmd' : 'npx';
const args = ['eslint', ...globs];

const result = spawnSync(exe, args, {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 200 * 1024 * 1024,
  shell: isWin,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let s = '';
if (result.stdout) s = String(result.stdout);
if (!s && existsSync(TMP_PATH)) s = readFileSync(TMP_PATH, 'utf8');
if (!s) {
  console.error('[arch-boundaries ratchet] FATAL — no eslint stdout. status=' + result.status + ' signal=' + result.signal);
  const err = String(result.stderr || '').slice(0, 3000);
  if (err) console.error('STDERR prefix:\n' + err);
  process.exit(3);
}
writeFileSync(TMP_PATH, s, 'utf8');

let raw = s;
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const first = Math.min(
  raw.indexOf('[') === -1 ? Infinity : raw.indexOf('['),
  raw.indexOf('{') === -1 ? Infinity : raw.indexOf('{')
);
if (first !== Infinity) raw = raw.slice(first);
const lastClose = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'));
if (lastClose !== -1) raw = raw.slice(0, lastClose + 1);

let data;
try { data = JSON.parse(raw); } catch (e) {
  console.error('[arch-boundaries ratchet] FATAL — eslint JSON parse fail: ' + e.message);
  console.error('PREFIX:\n' + raw.slice(0, 700));
  process.exit(4);
}

const cur = { api: 0, services: 0, domainApp: 0, total: 0 };
const RULE = 'no-restricted-imports';
const hitSamples = [];
for (const f of data || []) {
  const file = (f.filePath || '').replace(/\\/g, '/');
  let target = null;
  if (file.includes('/src/app/api/')) target = 'api';
  else if (file.includes('/src/app/services/')) target = 'services';
  else if (file.includes('/src/app/domain/') || file.includes('/src/app/application/')) target = 'domainApp';
  if (!target) continue;
  for (const m of f.messages || []) {
    if (m.ruleId === RULE) {
      cur[target]++;
      cur.total++;
      const base = file.split('/src/app/')[1] || file;
      if (hitSamples.length < 12) hitSamples.push('  • ' + target + ' | ' + base + ' | L' + m.line + ' | import=' + (m.source || '?'));
    }
  }
}

const deltas = {
  api: cur.api - bApi,
  services: cur.services - bSvc,
  domainApp: cur.domainApp - bDom,
  total: cur.total - bTot,
};

console.log('[arch-boundaries ratchet] 4-count baselines: api=' + bApi + '  services=' + bSvc + '  domain+app=' + bDom + '  total=' + bTot);
console.log('[arch-boundaries ratchet] 4-count current : api=' + cur.api + '  services=' + cur.services + '  domain+app=' + cur.domainApp + '  total=' + cur.total);
console.log('[arch-boundaries ratchet] 4-count delta   : api=' + fmtDelta(deltas.api) + '  services=' + fmtDelta(deltas.services) + '  domain+app=' + fmtDelta(deltas.domainApp) + '  total=' + fmtDelta(deltas.total));

const failReasons = [];
if (deltas.api > 0) failReasons.push('API layer violations increased +' + deltas.api);
if (deltas.services > 0) failReasons.push('SERVICES layer violations increased +' + deltas.services);
if (deltas.domainApp > 0) failReasons.push('DOMAIN+APPLICATION pure-logic layer violations increased +' + deltas.domainApp);
if (deltas.total > 0) failReasons.push('TOTAL arch boundary violations increased +' + deltas.total);

if (hitSamples.length) {
  console.log('[arch-boundaries ratchet] sample recent ' + hitSamples.length + ' no-restricted-imports hits:');
  for (const l of hitSamples) console.log(l);
}

if (SAVE) {
  const canSave =
    FORCE || (cur.api <= bApi && cur.services <= bSvc && cur.domainApp <= bDom && cur.total <= bTot);
  if (!canSave) {
    console.error('[arch-boundaries ratchet] --save refused — current > baseline on one or more fields. Use --force to override (not recommended).');
    process.exit(1);
  }
  baseline.generatedAt = new Date().toISOString();
  baseline.counts = {
    apiViolations: cur.api,
    servicesViolations: cur.services,
    domainApplicationViolations: cur.domainApp,
    totalViolations: cur.total,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  console.log('[arch-boundaries ratchet] --save OK — new baseline written to ' + BASELINE_PATH);
  process.exit(0);
}

if (failReasons.length) {
  console.error('[arch-boundaries ratchet] FAIL — one or more ratchet floors crossed:');
  for (const r of failReasons) console.error('  ❌ ' + r);
  console.error('[arch-boundaries ratchet] Fix the count(s). Refactor to use boundary-crossing imports toward Presentation->Domain->Infra arrows only; do NOT back-arrow forbidden.');
  process.exit(1);
}

const shrunkNote = (deltas.total < 0) ? ` (shrunk ${Math.abs(deltas.total)} violations — improvement encouraged!)` : '';
console.log('[arch-boundaries ratchet] OK — no new architectural boundary regressions' + shrunkNote);
process.exit(0);

function fmtDelta(n) {
  if (n === 0) return '=0';
  return (n > 0 ? '+' : '') + n;
}
