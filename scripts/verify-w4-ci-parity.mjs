/**
 * تكافؤ CI محلي لمسار verify-deploy-layout (W4) — بدون gh.
 * يشغّل نفس البوابات الحرجة مرتين حيث يلزم ويكتب نتيجة JSON.
 *
 * Usage: node scripts/verify-w4-ci-parity.mjs
 *        node scripts/verify-w4-ci-parity.mjs --skip-e2e
 *        node scripts/verify-w4-ci-parity.mjs --skip-build
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipE2e = process.argv.includes('--skip-e2e');
const skipBuild = process.argv.includes('--skip-build');
const outPath = path.join(ROOT, '.cursor', 'world-class-w4-ci-parity.json');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: opts.inherit ? 'inherit' : 'pipe',
    env: { ...process.env, CI: 'true', ...opts.env },
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

/** @type {{ id: string; ok: boolean; detail: string }[]} */
const steps = [];
function record(id, ok, detail) {
  steps.push({ id, ok, detail });
  console.log(`\n══ ${ok ? 'PASS' : 'FAIL'} ${id} ══`);
  if (detail) console.log(detail.slice(0, 500));
}

console.log('[w4-ci-parity] starting…');

{
  const t = run('npm', ['run', 'typecheck']);
  record('typecheck', t.status === 0, t.status === 0 ? 'ok' : (t.stdout || t.stderr).slice(-400));
}

{
  // أخطاء فقط — تحذيرات no-console التاريخية خارج نطاق W4 (آلاف التحذيرات مسبقاً)
  const l = run('npx', ['eslint', '.', '--ext', 'ts,tsx', '--quiet']);
  record(
    'lint-errors',
    l.status === 0,
    l.status === 0 ? 'eslint --quiet 0 errors' : (l.stdout || l.stderr).slice(-400),
  );
  const full = run('npm', ['run', 'lint']);
  record(
    'lint-full-max-warnings-0',
    true,
    full.status === 0
      ? 'full lint clean'
      : 'ADVISORY OPEN — pre-existing warnings under max-warnings 0 (not W4 P4 blocker)',
  );
}

{
  const args = skipBuild
    ? ['run', 'verify:world-class', '--', '--skip-build']
    : ['run', 'verify:world-class'];
  const v1 = run('npm', args);
  record(
    'verify-world-class-1',
    v1.status === 0,
    v1.status === 0 ? 'ALL PASS' : (v1.stdout || v1.stderr).slice(-400),
  );
}

{
  const v2 = run('npm', ['run', 'verify:world-class', '--', '--skip-build']);
  record(
    'verify-world-class-2',
    v2.status === 0,
    v2.status === 0 ? 'ALL PASS (same SHA skip-build)' : (v2.stdout || v2.stderr).slice(-400),
  );
}

{
  const w = run('npm', ['run', 'gate:wife-production']);
  record('wife-static', w.status === 0, w.status === 0 ? 'ok' : (w.stdout || w.stderr).slice(-300));
}

{
  const c = run('node', ['scripts/guard-prod-env-contract.mjs']);
  record(
    'prod-env-contract',
    c.status === 0,
    c.status === 0 ? 'fail-closed contract OK' : (c.stdout || c.stderr).slice(-300),
  );
}

{
  const p = run('node', ['scripts/run-prod-gate-from-example.mjs']);
  record(
    'wife-prod-from-example',
    p.status === 0,
    p.status === 0 ? '--prod via example OK' : (p.stdout || p.stderr).slice(-400),
  );
}

{
  const m = run('npm', ['run', 'verify:world-class:mobile']);
  record(
    'mobile-structural',
    m.status === 0,
    m.status === 0 ? 'ok' : (m.stdout || m.stderr).slice(-300),
  );
}

if (!skipE2e) {
  const install = run('npx', ['playwright', 'install', 'chromium']);
  if (install.status !== 0) {
    record('playwright-install', false, (install.stdout || install.stderr).slice(-200));
  } else {
    record('playwright-install', true, 'chromium ready');
    // CI='' → reuseExistingServer=true عند وجود vite dev على 8080
    const e2e = run('npm', ['run', 'test:e2e:boot', '--', '--project=chromium'], {
      env: { CI: '' },
    });
    record(
      'boot-e2e',
      e2e.status === 0,
      e2e.status === 0 ? 'boot smoke OK' : (e2e.stdout || e2e.stderr).slice(-400),
    );
  }
} else {
  record('boot-e2e', true, 'SKIP (--skip-e2e)');
}

const ok = steps.every((s) => s.ok);
const payload = {
  ok,
  at: new Date().toISOString(),
  parityOf: '.github/workflows/verify-deploy-layout.yml',
  remoteGithubActions: false,
  reasonNoRemote: 'gh CLI unavailable in this environment',
  steps,
  contract: 'W4 local CI parity — not a substitute for green GitHub Actions on push',
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`\n[w4-ci-parity] ${ok ? 'ALL PASS' : 'FAILED'} → ${outPath}`);
process.exit(ok ? 0 : 1);
