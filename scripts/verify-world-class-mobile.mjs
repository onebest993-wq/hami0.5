/**
 * W5 structural mobile gate — بدون ادّعاء إثبات جهاز.
 * يشغّل: phase5 Capacitor/Lite tests + verify:native:android إن وُجد android/.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(ROOT, '.cursor', 'world-class-mobile-gate-result.json');

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
  return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const gates = [];
function record(id, ok, detail) {
  gates.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${detail ? ` — ${detail}` : ''}`);
}

{
  const t = run('npx', [
    'vitest',
    'run',
    'src/app/runtime/__tests__/phase5CapacitorLite.test.ts',
  ]);
  record(
    'capacitor-lite-unit',
    t.status === 0,
    t.status === 0 ? 'phase5 Capacitor/Lite OK' : (t.stdout || t.stderr).slice(-300),
  );
}

const hasAndroid = fs.existsSync(path.join(ROOT, 'android', 'app', 'build.gradle'));
if (hasAndroid) {
  run('node', ['scripts/patch-android-biometric-permissions.mjs']);
  const n = run('npm', ['run', 'verify:native:android']);
  record(
    'android-native-structure',
    n.status === 0,
    n.status === 0 ? 'android project OK' : (n.stdout || n.stderr).slice(-300),
  );
} else {
  record(
    'android-native-structure',
    true,
    'SKIP — android/ not generated (gitignored); run cap:sync:android locally',
  );
}

const progressPath = path.join(ROOT, '.cursor', 'phase-5-progress.json');
let deviceProven = false;
if (fs.existsSync(progressPath)) {
  try {
    deviceProven = Boolean(JSON.parse(fs.readFileSync(progressPath, 'utf8')).deviceProven);
  } catch {
    deviceProven = false;
  }
}
record(
  'device-proven-declared',
  true,
  deviceProven ? 'deviceProven=true' : 'deviceProven=false — W5 exit requires device/emulator proof',
);

const ok = gates.every((g) => g.ok);
const payload = {
  ok,
  at: new Date().toISOString(),
  deviceProven,
  gates,
  contract: 'HWCAC W5 structural only — not full P5 device proof',
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[verify:world-class:mobile] ${ok ? 'STRUCTURAL PASS' : 'FAILED'} → ${outPath}`);
process.exit(ok ? 0 : 1);
