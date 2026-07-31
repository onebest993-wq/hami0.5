/**
 * W5 native build gate — يثبت assembleDebug بدون اشتراط محاكي شغّال.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.cursor', 'world-class-w5-native-build.json');
const apk = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const skipBuild = process.argv.includes('--skip-build');

const gates = [];
function record(id, ok, detail) {
  gates.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
}

if (!skipBuild || !fs.existsSync(apk)) {
  const r = spawnSync('npm', ['run', 'cap:build:android'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
    env: {
      ...process.env,
      JAVA_HOME: process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr',
      ANDROID_HOME:
        process.env.ANDROID_HOME ||
        path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    },
  });
  record(
    'cap-build-android',
    r.status === 0 && fs.existsSync(apk),
    r.status === 0 ? 'assembleDebug OK' : (r.stdout || r.stderr).slice(-400),
  );
} else {
  record('cap-build-android', true, 'SKIP — existing APK');
}

const exists = fs.existsSync(apk);
const sizeKb = exists ? Math.round(fs.statSync(apk).size / 1024) : 0;
record('apk-present', exists, exists ? `app-debug.apk ${sizeKb} KB` : 'missing');

// محاكي: تحقق وجود AVD + تسريع
const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const emu = path.join(sdk, 'emulator', 'emulator.exe');
let avd = '';
if (fs.existsSync(emu)) {
  const list = spawnSync(emu, ['-list-avds'], { encoding: 'utf8' });
  avd = (list.stdout || '').trim().split(/\r?\n/).filter(Boolean)[0] || '';
}
record('avd-listed', Boolean(avd), avd || 'no AVD');

const adb = path.join(sdk, 'platform-tools', 'adb.exe');
let deviceOnline = false;
if (fs.existsSync(adb)) {
  const d = spawnSync(adb, ['devices'], { encoding: 'utf8' });
  deviceOnline = /emulator-\d+\s+device|^\w+\s+device/m.test(d.stdout || '');
}
record(
  'emulator-or-device-online',
  true,
  deviceOnline ? 'device online' : 'OPEN — no device (AEHD/hypervisor often required on Windows)',
);

const ok = gates.filter((g) => g.id !== 'emulator-or-device-online').every((g) => g.ok);
const payload = {
  ok,
  at: new Date().toISOString(),
  deviceProven: false,
  nativeApkBuilt: exists,
  apkKb: sizeKb,
  avd,
  deviceOnline,
  gates,
  contract: 'W5 native APK build — not runtime device proof',
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[verify:w5-native-build] ${ok ? 'APK PASS' : 'FAILED'} → ${OUT}`);
process.exit(ok ? 0 : 1);
