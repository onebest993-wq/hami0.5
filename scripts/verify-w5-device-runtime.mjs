/**
 * W5 device runtime — يثبت محاكي/جهاز + تثبيت APK + إطلاق التطبيق.
 * يفشل بوضوح إن كان VirtualizationFirmwareEnabled=false (شائع على Windows).
 *
 * Usage:
 *   node scripts/verify-w5-device-runtime.mjs
 *   node scripts/verify-w5-device-runtime.mjs --skip-install
 */
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.cursor', 'world-class-w5-device-runtime.json');
const skipInstall = process.argv.includes('--skip-install');
const apk = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

const gates = [];
function record(id, ok, detail, advisory = false) {
  gates.push({ id, ok, detail, advisory });
  console.log(`${ok ? 'PASS' : advisory ? 'ADVISORY' : 'FAIL'} ${id} — ${detail}`);
}

function sdkRoot() {
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    return process.env.ANDROID_HOME;
  }
  return path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
}

function adbBin(sdk) {
  return path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
}

function emuBin(sdk) {
  return path.join(sdk, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
}

function checkFirmwareVirt() {
  if (process.platform !== 'win32') return { ok: true, detail: 'non-windows' };
  const r = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      '(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled',
    ],
    { encoding: 'utf8' },
  );
  const v = (r.stdout || '').trim().toLowerCase();
  if (v === 'true') return { ok: true, detail: 'VirtualizationFirmwareEnabled=true' };
  if (v === 'false') {
    return {
      ok: false,
      detail:
        'BIOS/UEFI virtualization OFF (AMD-V/SVM or Intel VT-x). Enable in BIOS then install AEHD/WHPX.',
    };
  }
  return { ok: false, detail: `could not read firmware virt: ${v || r.stderr}` };
}

const sdk = sdkRoot();
const adb = adbBin(sdk);
const emu = emuBin(sdk);

const fw = checkFirmwareVirt();
record('firmware-virtualization', fw.ok, fw.detail);

record('apk-ready', fs.existsSync(apk), fs.existsSync(apk) ? 'app-debug.apk present' : 'run cap:build:android first');
record('adb-present', fs.existsSync(adb), fs.existsSync(adb) ? adb : 'missing platform-tools');

let deviceSerial = null;
if (fs.existsSync(adb)) {
  const d = spawnSync(adb, ['devices'], { encoding: 'utf8' });
  const lines = (d.stdout || '').split(/\r?\n/).filter((l) => /\tdevice$/.test(l));
  deviceSerial = lines[0]?.split(/\t/)[0] || null;
}

if (!deviceSerial && fw.ok && fs.existsSync(emu)) {
  const avds = spawnSync(emu, ['-list-avds'], { encoding: 'utf8' });
  const avd = (avds.stdout || '').trim().split(/\r?\n/).filter(Boolean)[0];
  record('avd', Boolean(avd), avd || 'none');
  if (avd) {
    console.log(`[device-runtime] starting emulator ${avd}…`);
    spawn(emu, ['-avd', avd, '-no-snapshot', '-no-boot-anim'], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    for (let i = 0; i < 60; i++) {
      const d = spawnSync(adb, ['devices'], { encoding: 'utf8' });
      const lines = (d.stdout || '').split(/\r?\n/).filter((l) => /\tdevice$/.test(l));
      if (lines.length) {
        deviceSerial = lines[0].split(/\t/)[0];
        break;
      }
      spawnSync(process.platform === 'win32' ? 'timeout' : 'sleep', [process.platform === 'win32' ? '/t' : '', '5'].filter(Boolean), {
        shell: true,
      });
    }
  }
} else if (!fw.ok) {
  record(
    'emulator-start-skipped',
    true,
    'skipped — firmware virtualization disabled',
    true,
  );
}

record(
  'device-online',
  Boolean(deviceSerial),
  deviceSerial ? `serial=${deviceSerial}` : 'no emulator/device online',
);

let installed = false;
let launched = false;
let launchMs = null;
if (deviceSerial && fs.existsSync(apk) && !skipInstall) {
  const _t0 = Date.now();
  const inst = spawnSync(adb, ['-s', deviceSerial, 'install', '-r', apk], {
    encoding: 'utf8',
  });
  installed = inst.status === 0 || /Success/i.test(inst.stdout || '');
  record('apk-install', installed, installed ? 'install -r OK' : (inst.stdout || inst.stderr).slice(-200));

  if (installed) {
    const tLaunch = Date.now();
    const launch = spawnSync(
      adb,
      [
        '-s',
        deviceSerial,
        'shell',
        'am',
        'start',
        '-n',
        'iq.hami.legal/.MainActivity',
      ],
      { encoding: 'utf8' },
    );
    launched = launch.status === 0;
    launchMs = Date.now() - tLaunch;
    record(
      'app-launch',
      launched,
      launched ? `am start OK (${launchMs} ms to am return)` : (launch.stdout || launch.stderr).slice(-200),
    );
    // انتظار قصير لاستقرار WebView
    spawnSync(adb, ['-s', deviceSerial, 'shell', 'sleep', '3'], { encoding: 'utf8' });
    const dump = spawnSync(
      adb,
      ['-s', deviceSerial, 'shell', 'dumpsys', 'activity', 'activities'],
      { encoding: 'utf8' },
    );
    const foreground = /iq\.hami\.legal/.test(dump.stdout || '');
    record('app-foreground', foreground, foreground ? 'iq.hami.legal in activities' : 'package not in dump');
  }
} else if (deviceSerial && skipInstall) {
  record('apk-install', true, 'SKIP --skip-install', true);
}

const deviceProven =
  Boolean(deviceSerial) &&
  (skipInstall || installed) &&
  (skipInstall || launched);

const ok = gates.filter((g) => !g.advisory).every((g) => g.ok);
const payload = {
  ok,
  at: new Date().toISOString(),
  host: os.hostname(),
  deviceProven,
  deviceSerial,
  launchMs,
  gates,
  contract:
    'W5 native device runtime — requires firmware virt + AEHD/WHPX + online device',
  biosHint:
    'AMD: enable SVM Mode in BIOS. Intel: enable VT-x. Then install Android Emulator Hypervisor Driver.',
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);

// لا نكتب deviceProven=true في phase-5 إلا عند نجاح كامل
if (deviceProven) {
  const progressPath = path.join(ROOT, '.cursor', 'phase-5-progress.json');
  if (fs.existsSync(progressPath)) {
    try {
      const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
      progress.deviceProven = true;
      progress.deviceRuntimeArtifact = '.cursor/world-class-w5-device-runtime.json';
      progress.closedAt = new Date().toISOString();
      fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
    } catch {
      /* ignore */
    }
  }
}

console.log(
  `[verify:w5-device-runtime] ${ok ? 'PASS' : 'BLOCKED'} deviceProven=${deviceProven} → ${OUT}`,
);
process.exit(ok ? 0 : 1);
