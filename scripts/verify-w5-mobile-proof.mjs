/**
 * W5 mobile proof — Playwright viewport + TTFI mobile + static gates.
 * لا يدّعي إثبات جهاز أصلي (deviceProven يبقى false بدون محاكي/جهاز).
 *
 * Usage:
 *   node scripts/verify-w5-mobile-proof.mjs
 *   node scripts/verify-w5-mobile-proof.mjs --skip-build --with-slow-mobile
 *   node scripts/verify-w5-mobile-proof.mjs --skip-e2e --skip-ttfi
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.cursor', 'world-class-w5-mobile-proof.json');
const skipE2e = process.argv.includes('--skip-e2e');
const skipTtfi = process.argv.includes('--skip-ttfi');
const skipBuild = process.argv.includes('--skip-build');
const withSlowMobile = process.argv.includes('--with-slow-mobile');

const CRITICAL_SAFE_AREA_FILES = [
  'src/app/components/lawyer/HamiSettings/SettingsShell.tsx',
  'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css',
  'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardRootFrame.tsx',
  'src/app/components/lawyer/ExecutionDashboard/executionModalMobileShell.ts',
  'src/app/components/lawyer/LegalCommandCenterDock.tsx',
];

/** فجوات safe-area السابقة — أُغلقت بتوكنات موجودة (Header + ED phone chrome) */
const DECLARED_SAFE_AREA_GAPS = [];

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
    env: { ...process.env, ...opts.env },
  });
  return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** @type {{ id: string; ok: boolean; detail: string; advisory?: boolean }[]} */
const gates = [];
function record(id, ok, detail, advisory = false) {
  gates.push({ id, ok, detail, advisory });
  const mark = ok ? 'PASS' : advisory ? 'ADVISORY' : 'FAIL';
  console.log(`${mark} ${id}${detail ? ` — ${detail}` : ''}`);
}

console.log('[verify:w5-mobile-proof] starting…');

{
  const s = run('npm', ['run', 'verify:world-class:mobile']);
  record(
    'structural-mobile',
    s.status === 0,
    s.status === 0 ? 'verify:world-class:mobile OK' : (s.stdout || s.stderr).slice(-300),
  );
}

{
  const hits = CRITICAL_SAFE_AREA_FILES.filter((rel) => {
    const p = path.join(ROOT, rel);
    return fs.existsSync(p) && /safe-area-inset|env\(safe-area/.test(fs.readFileSync(p, 'utf8'));
  });
  record(
    'safe-area-critical-static',
    hits.length >= 3,
    `${hits.length} files with safe-area — ${hits.map((h) => path.basename(h)).join(', ')}`,
  );
  record(
    'safe-area-gaps-declared',
    true,
    DECLARED_SAFE_AREA_GAPS.join(' | '),
    true,
  );
}

{
  const touchFiles = [
    'src/app/components/lawyer/LawyerDashboardParts/components/HeaderToolbarIcon.tsx',
    'src/app/components/lawyer/HamiSettings/SettingsShell.tsx',
    'src/app/components/lawyer/ExecutionDashboard/executionModalMobileShell.ts',
  ];
  const okTouch = touchFiles.every((rel) => {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) return false;
    const t = fs.readFileSync(p, 'utf8');
    return /min-h-\[44px\]|min-w-\[44px\]|min-h-11|2\.75rem|44px/.test(t);
  });
  record(
    'touch-44-critical-static',
    okTouch,
    okTouch ? 'header/settings/execution tokens present' : 'missing 44px tokens',
  );
}

if (!skipTtfi) {
  if (!skipBuild && !fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    const b = run('npm', ['run', 'build']);
    record('build', b.status === 0, b.status === 0 ? 'ok' : 'build failed');
  } else {
    record('build', true, skipBuild || fs.existsSync(path.join(ROOT, 'dist', 'index.html')) ? 'dist present / skip-build' : 'ok');
  }

  const ttfi = run('npm', [
    'run',
    'perf:boot-ttfi',
    '--',
    '--preview',
    '--device=mobile',
    '--label=w5-mobile-boot-ttfi',
  ]);
  const m = (ttfi.stdout || '').match(/TTFI \(dashboard-interactive\): (\d+|n\/a)/);
  const ms = m && m[1] !== 'n/a' ? Number(m[1]) : null;
  record(
    'ttfi-mobile-cold',
    ttfi.status === 0 && ms != null,
    ms == null ? (ttfi.stdout || ttfi.stderr).slice(-200) : `${ms} ms (Pixel 7 viewport; desktop budget 220 not applied)`,
  );

  if (withSlowMobile) {
    const slow = run('npm', [
      'run',
      'perf:boot-ttfi',
      '--',
      '--preview',
      '--device=mobile',
      '--throttle=slow-mobile',
      '--label=w5-mobile-boot-ttfi-slow',
    ]);
    const sm = (slow.stdout || '').match(/TTFI \(dashboard-interactive\): (\d+|n\/a)/);
    const sms = sm && sm[1] !== 'n/a' ? Number(sm[1]) : null;
    record(
      'ttfi-mobile-slow',
      true,
      sms == null ? 'advisory run incomplete' : `${sms} ms under CPU×4 + 4G (advisory)`,
      true,
    );
  }
}

if (!skipE2e) {
  run('npx', ['playwright', 'install', 'chromium']);
  // لا نفرض CI=true حتى يمكن reuse لـ vite على 8080 محلياً
  const boot = run(
    'npm',
    ['run', 'test:e2e:boot', '--', '--project=mobile-chrome', '--workers=1'],
    { env: { CI: '' } },
  );
  record(
    'e2e-boot-mobile-chrome',
    boot.status === 0,
    boot.status === 0 ? 'boot smoke Pixel 7 OK' : (boot.stdout || boot.stderr).slice(-400),
  );

  const settings = run('npm', ['run', 'test:e2e:settings:mobile'], { env: { CI: '' } });
  record(
    'e2e-settings-mobile',
    settings.status === 0,
    settings.status === 0 ? 'settings-mobile OK' : (settings.stdout || settings.stderr).slice(-400),
  );
  record(
    'swipe-gesture-automation',
    true,
    'OPEN — Framer dragControls swipe not reliably automatable; handle+close-tap covered in e2e',
    true,
  );
}

let deviceProven = false;
const progressPath = path.join(ROOT, '.cursor', 'phase-5-progress.json');
if (fs.existsSync(progressPath)) {
  try {
    deviceProven = Boolean(JSON.parse(fs.readFileSync(progressPath, 'utf8')).deviceProven);
  } catch {
    deviceProven = false;
  }
}
// Playwright viewport ≠ جهاز أصلي
if (deviceProven) {
  record('device-proven-flag', true, 'phase-5-progress deviceProven=true (manual)', true);
} else {
  record(
    'device-proven-flag',
    true,
    'deviceProven=false — لا محاكي/جهاز في هذه البيئة (لا ANDROID_SDK)',
    true,
  );
}

const ok = gates.filter((g) => !g.advisory).every((g) => g.ok);
const payload = {
  ok,
  at: new Date().toISOString(),
  deviceProven: false,
  contract:
    'HWCAC W5 viewport proof — Playwright Pixel 7 + TTFI mobile + static safe-area/touch; NOT native Capacitor emulator',
  declaredSafeAreaGaps: DECLARED_SAFE_AREA_GAPS,
  gates,
  artifacts: {
    proof: '.cursor/world-class-w5-mobile-proof.json',
    structural: '.cursor/world-class-mobile-gate-result.json',
    ttfi: 'perf-reports/w5-mobile-boot-ttfi.json',
    ttfiSlow: withSlowMobile ? 'perf-reports/w5-mobile-boot-ttfi-slow.json' : null,
  },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `[verify:w5-mobile-proof] ${ok ? 'VIEWPORT PASS' : 'FAILED'} → ${OUT} | deviceProven=false`,
);
process.exit(ok ? 0 : 1);
