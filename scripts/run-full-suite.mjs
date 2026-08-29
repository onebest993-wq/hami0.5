/**
 * تشغيل شامل لكل بوابات/أقسام التحقق — نتيجة JSON واحدة.
 * Usage: node scripts/run-full-suite.mjs
 *        node scripts/run-full-suite.mjs --skip-e2e --skip-device
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipE2e = process.argv.includes('--skip-e2e');
const skipDevice = process.argv.includes('--skip-device');
const skipFullUnit = process.argv.includes('--skip-full-unit');
const outPath = path.join(ROOT, '.cursor', 'full-suite-run-result.json');

/** @type {{ id: string; section: string; cmd: string; args: string[]; optional?: boolean }[]} */
const STEPS = [
  { id: 'typecheck', section: 'P3-correctness', cmd: 'npm', args: ['run', 'typecheck'] },
  { id: 'lint-errors', section: 'P3-correctness', cmd: 'npx', args: ['eslint', '.', '--ext', 'ts,tsx', '--quiet'] },
  { id: 'test-security', section: 'P4-security', cmd: 'npm', args: ['run', 'test:security'] },
  { id: 'gate-wife-production', section: 'P4-security', cmd: 'npm', args: ['run', 'gate:wife-production'] },
  { id: 'gate-prod-env-contract', section: 'P4-security', cmd: 'npm', args: ['run', 'gate:prod-env-contract'] },
  { id: 'gate-wife-prod-example', section: 'P4-security', cmd: 'npm', args: ['run', 'gate:wife-prod-example'] },
  { id: 'gate-core-boot', section: 'section-core-boot', cmd: 'npm', args: ['run', 'gate:core-boot'] },
  { id: 'gate-notifications', section: 'section-notifications', cmd: 'npm', args: ['run', 'gate:notifications'] },
  { id: 'gate-settings', section: 'section-settings', cmd: 'npm', args: ['run', 'gate:settings'] },
  { id: 'gate-tasks', section: 'section-tasks', cmd: 'npm', args: ['run', 'gate:tasks'] },
  { id: 'gate-global-search', section: 'section-global-search', cmd: 'npm', args: ['run', 'gate:global-search'] },
  { id: 'gate-profile', section: 'section-profile', cmd: 'npm', args: ['run', 'gate:profile'] },
  { id: 'gate-operations', section: 'section-operations', cmd: 'npm', args: ['run', 'gate:operations'] },
  { id: 'gate-legal', section: 'section-legal', cmd: 'npm', args: ['run', 'gate:legal'] },
  { id: 'gate-live-readiness', section: 'section-live-readiness', cmd: 'npm', args: ['run', 'gate:live-readiness'] },
  { id: 'gate-execution', section: 'section-execution', cmd: 'npm', args: ['run', 'gate:execution'] },
  { id: 'verify-phone-body-scope', section: 'section-execution', cmd: 'npm', args: ['run', 'verify:phone-body-scope'] },
  { id: 'verify-world-class', section: 'HWCAC', cmd: 'npm', args: ['run', 'verify:world-class'] },
  { id: 'verify-world-class-2', section: 'HWCAC', cmd: 'npm', args: ['run', 'verify:world-class', '--', '--skip-build'] },
  { id: 'verify-world-class-mobile', section: 'P5-mobile', cmd: 'npm', args: ['run', 'verify:world-class:mobile'] },
  { id: 'verify-w4-ci-parity', section: 'P6-operability', cmd: 'npm', args: ['run', 'verify:w4-ci-parity', '--', '--skip-build', '--skip-e2e'] },
  { id: 'verify-w5-mobile-proof', section: 'P5-mobile', cmd: 'npm', args: ['run', 'verify:w5-mobile-proof'] },
  { id: 'verify-w5-native-build', section: 'P5-mobile', cmd: 'npm', args: ['run', 'verify:w5-native-build', '--', '--skip-build'] },
  {
    id: 'verify-w5-device-runtime',
    section: 'P5-mobile',
    cmd: 'npm',
    args: ['run', 'verify:w5-device-runtime'],
    optional: true,
  },
  { id: 'verify-native-android', section: 'P5-mobile', cmd: 'npm', args: ['run', 'verify:native:android'] },
  { id: 'verify-native-ios', section: 'P5-mobile', cmd: 'npm', args: ['run', 'verify:native:ios'] },
  { id: 'test-execution', section: 'section-execution', cmd: 'npm', args: ['run', 'test:execution'] },
  { id: 'test-notifications', section: 'section-notifications', cmd: 'npm', args: ['run', 'test:notifications'] },
];

if (!skipFullUnit) {
  STEPS.push({ id: 'test-run-full', section: 'P3-correctness', cmd: 'npm', args: ['run', 'test:run'] });
}

if (!skipE2e) {
  STEPS.push(
    { id: 'e2e-boot', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:boot'] },
    { id: 'e2e-homeHub', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:homeHub'] },
    { id: 'e2e-notifications', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:notifications'] },
    { id: 'e2e-settings', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:settings'] },
    { id: 'e2e-global-search', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:global-search'] },
    { id: 'e2e-profile', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:profile'] },
    { id: 'e2e-tasks', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:tasks'] },
    { id: 'e2e-transactions', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:transactions'] },
    { id: 'e2e-forum', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:forum'] },
    { id: 'e2e-repository', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:repository'] },
    { id: 'e2e-wife', section: 'e2e', cmd: 'npm', args: ['run', 'test:e2e:wife'] },
    { id: 'e2e-uiux', section: 'e2e', cmd: 'npm', args: ['run', 'gate:uiux'] },
  );
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    // CI=true يكسر reuseExistingServer في Playwright عند وجود npm run dev على :8080
    env: {
      ...process.env,
      CI: 'true',
      PLAYWRIGHT_TEST: '1',
    },
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

function runE2e(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CI: '',
      // السماح بإعادة استخدام خادم التطوير المحلي إن وُجد
    },
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

const startedAt = new Date().toISOString();
/** @type {{ id: string; section: string; ok: boolean; optional: boolean; ms: number; detail: string }[]} */
const results = [];

console.log(`[full-suite] ${STEPS.length} steps — start ${startedAt}`);
if (skipDevice) {
  const i = STEPS.findIndex((s) => s.id === 'verify-w5-device-runtime');
  if (i >= 0) STEPS.splice(i, 1);
}

for (const step of STEPS) {
  const t0 = Date.now();
  console.log(`\n══ RUN ${step.id} (${step.section}) ══`);
  const r = step.section === 'e2e' ? runE2e(step.cmd, step.args) : run(step.cmd, step.args);
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  const detail = (ok ? r.stdout : r.stdout + '\n' + r.stderr).slice(-800).trim();
  results.push({
    id: step.id,
    section: step.section,
    ok,
    optional: Boolean(step.optional),
    ms,
    detail,
  });
  console.log(`${ok ? 'PASS' : step.optional ? 'FAIL(optional)' : 'FAIL'} ${step.id} (${ms}ms)`);
  if (!ok && detail) console.log(detail.slice(0, 400));
}

const required = results.filter((r) => !r.optional);
const optional = results.filter((r) => r.optional);
const okRequired = required.every((r) => r.ok);
const bySection = {};
for (const r of results) {
  if (!bySection[r.section]) bySection[r.section] = { pass: 0, fail: 0, items: [] };
  bySection[r.section][r.ok ? 'pass' : 'fail'] += 1;
  bySection[r.section].items.push({ id: r.id, ok: r.ok, optional: r.optional, ms: r.ms });
}

const payload = {
  ok: okRequired,
  startedAt,
  finishedAt: new Date().toISOString(),
  totals: {
    steps: results.length,
    requiredPass: required.filter((r) => r.ok).length,
    requiredFail: required.filter((r) => !r.ok).length,
    optionalPass: optional.filter((r) => r.ok).length,
    optionalFail: optional.filter((r) => !r.ok).length,
  },
  bySection,
  results,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`\n[full-suite] ${okRequired ? 'ALL REQUIRED PASS' : 'FAILED'} → ${outPath}`);
process.exit(okRequired ? 0 : 1);
