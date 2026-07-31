/**
 * Wave 6 — Cap section bake عبر WebView CDP (ليس Playwright Pixel فقط).
 *
 * Usage:
 *   node scripts/wave6-cap-section-bake.mjs
 *   node scripts/wave6-cap-section-bake.mjs --skip-install
 *
 * يتطلب: emulator/device + app-debug.apk + WebView debugging socket.
 */
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'perf-reports', 'wave6-cap-section-bake.json');
const CLOSE_HINT = path.join(ROOT, '.cursor', 'wave6-cap-bake-live.json');
const skipInstall = process.argv.includes('--skip-install');
const PKG = 'iq.hami.legal';
const ACTIVITY = `${PKG}/.MainActivity`;
const apk = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

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

function adb(sdk, args, timeout = 120_000) {
  return spawnSync(adbBin(sdk), args, { encoding: 'utf8', timeout });
}

function sleep(ms) {
  spawnSync(process.platform === 'win32' ? 'timeout' : 'sleep', [
    ...(process.platform === 'win32' ? ['/t', String(Math.ceil(ms / 1000)), '/nobreak'] : [String(ms / 1000)]),
  ], { shell: true, stdio: 'ignore' });
}

async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const { res, rej, t } = pending.get(msg.id);
      clearTimeout(t);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    }
  };
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  function send(method, params = {}, timeoutMs = 25_000) {
    const mid = ++id;
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`timeout ${method}`)), timeoutMs);
      pending.set(mid, { res, rej, t });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  return { ws, send };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result?.result?.value ?? null;
}

async function waitForSelector(send, selector, timeoutMs = 25_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const hit = await evaluate(
      send,
      `!!document.querySelector(${JSON.stringify(selector)})`,
    );
    if (hit) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function clickTestId(send, testId) {
  const safe = String(testId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return evaluate(
    send,
    `(() => {
      const el = document.querySelector('[data-testid="${safe}"]');
      if (!el) return false;
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      if (typeof el.click === 'function') el.click();
      return true;
    })()`,
  );
}

async function main() {
  const sdk = sdkRoot();
  const adbPath = adbBin(sdk);
  const gates = [];
  const record = (id, ok, detail) => {
    gates.push({ id, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
  };

  record('apk-ready', fs.existsSync(apk), fs.existsSync(apk) ? 'app-debug.apk' : 'missing APK');
  record('adb-present', fs.existsSync(adbPath), adbPath);

  let serial = null;
  {
    const d = adb(sdk, ['devices']);
    const lines = (d.stdout || '').split(/\r?\n/).filter((l) => /\tdevice$/.test(l));
    serial = lines[0]?.split(/\t/)[0] || null;
  }

  if (!serial && fs.existsSync(emuBin(sdk))) {
    const avds = spawnSync(emuBin(sdk), ['-list-avds'], { encoding: 'utf8' });
    const avd = (avds.stdout || '').trim().split(/\r?\n/).filter(Boolean)[0];
    if (avd) {
      console.log(`[wave6-cap-bake] starting emulator ${avd}…`);
      spawn(emuBin(sdk), ['-avd', avd, '-no-snapshot-load', '-no-boot-anim'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      for (let i = 0; i < 72; i++) {
        const d = adb(sdk, ['devices']);
        const lines = (d.stdout || '').split(/\r?\n/).filter((l) => /\tdevice$/.test(l));
        if (lines.length) {
          serial = lines[0].split(/\t/)[0];
          const boot = adb(sdk, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']);
          if ((boot.stdout || '').trim() === '1') break;
        }
        sleep(5000);
      }
    }
  }

  record('device-online', Boolean(serial), serial || 'no device');

  if (!serial || !fs.existsSync(apk)) {
    const payload = {
      ok: false,
      at: new Date().toISOString(),
      host: os.hostname(),
      sectionBakeCdp: false,
      gates,
      honesty: 'Cannot Cap-bake without online device + APK',
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(CLOSE_HINT, `${JSON.stringify(payload, null, 2)}\n`);
    process.exit(1);
  }

  if (!skipInstall) {
    const inst = adb(sdk, ['-s', serial, 'install', '-r', apk], 180_000);
    const ok = inst.status === 0 || /Success/i.test(inst.stdout || '');
    record('apk-install', ok, ok ? 'install -r OK' : (inst.stdout || inst.stderr || '').slice(-200));
  } else {
    record('apk-install', true, 'SKIP --skip-install');
  }

  adb(sdk, ['-s', serial, 'shell', 'am', 'force-stop', PKG]);
  /* فعّل تصحيح WebView قبل الإطلاق — بدونها غالباً لا يظهر webview_devtools_remote_* */
  adb(sdk, ['-s', serial, 'shell', 'setprop', 'debug.webview.enable', '1']);
  adb(sdk, [
    '-s',
    serial,
    'shell',
    'am',
    'set-debug-app',
    '--persistent',
    PKG,
  ]);
  sleep(1_000);
  const launch = adb(sdk, ['-s', serial, 'shell', 'am', 'start', '-W', '-n', ACTIVITY]);
  record('app-launch', launch.status === 0, (launch.stdout || '').trim().slice(0, 240) || 'am start');

  /** محاكي بارد: انتظر أطول + أعد الإطلاق مرة إن بقي pidof فارغاً */
  let pid = '';
  for (let i = 0; i < 30; i++) {
    sleep(i === 0 ? 10_000 : 2_000);
    pid = (adb(sdk, ['-s', serial, 'shell', 'pidof', PKG]).stdout || '').trim().split(/\s+/)[0] || '';
    if (pid) break;
    if (i === 8) {
      adb(sdk, ['-s', serial, 'shell', 'am', 'force-stop', PKG]);
      adb(sdk, ['-s', serial, 'shell', 'am', 'start', '-n', ACTIVITY]);
    }
  }
  if (!pid) {
    const log = adb(sdk, ['-s', serial, 'logcat', '-d', '-t', '80'], 30_000);
    record(
      'app-pid-logcat',
      false,
      (log.stdout || log.stderr || '').slice(-600) || 'no logcat',
    );
  }
  record('app-pid', Boolean(pid), pid || 'pidof empty');

  let sockMatch = null;
  for (let i = 0; i < 20; i++) {
    const unix = adb(sdk, ['-s', serial, 'shell', 'cat', '/proc/net/unix']);
    sockMatch = (unix.stdout || '').match(/@webview_devtools_remote_(\d+)/);
    if (sockMatch) break;
    sleep(1_000);
  }
  const sockPid = sockMatch?.[1] || pid;
  record('webview-devtools-socket', Boolean(sockMatch || pid), sockMatch ? sockMatch[1] : sockPid || 'missing');

  adb(sdk, ['forward', '--remove', 'tcp:9222']);
  const fwd = adb(sdk, ['forward', 'tcp:9222', `localabstract:webview_devtools_remote_${sockPid}`]);
  record('cdp-forward', fwd.status === 0, `9222 → webview_devtools_remote_${sockPid}`);

  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      if (res.ok) {
        targets = await res.json();
        if (Array.isArray(targets) && targets.length) break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  const page = (targets || []).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  record('cdp-target', Boolean(page), page?.url || 'no page target');

  /** @type {Record<string, unknown>} */
  const surfaces = {};
  let boot = null;
  let biometricProbe = null;

  if (page?.webSocketDebuggerUrl) {
    const { ws, send } = await cdpConnect(page.webSocketDebuggerUrl);
    await send('Runtime.enable');

    // seed local storage for empty-archive content markers (best-effort)
    await evaluate(
      send,
      `(() => {
        try {
          sessionStorage.setItem('hami:last-screen', 'lawyer');
          sessionStorage.setItem('hami:lawyer-dashboard-tab', 'home');
          localStorage.setItem('hami:weekly-backup-reminder-at', String(Date.now()));
          const raw = localStorage.getItem('lawyer_settings');
          let parsed = {};
          try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
          const security = parsed.security && typeof parsed.security === 'object' ? parsed.security : {};
          localStorage.setItem('lawyer_settings', JSON.stringify({
            ...parsed,
            version: parsed.version ?? 2,
            security: { ...security, biometricLock: false, autoLockMinutes: 0 },
          }));
        } catch (e) { return String(e); }
        return 'ok';
      })()`,
    );

    const readyOk = await waitForSelector(send, '[data-testid="lawyer-dashboard-ready"]', 60_000);
    const homeOk = await waitForSelector(
      send,
      '[data-testid="home-main-zone"],[data-testid="home-bottom-chrome"],[data-testid="home-main-grid"]',
      30_000,
    );
    boot = await evaluate(
      send,
      `(() => {
        const starts = performance.getEntriesByName('hami:boot:start', 'mark');
        const inters = performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark');
        const start = starts[starts.length - 1]?.startTime ?? 0;
        const entry = inters[inters.length - 1];
        return {
          ready: !!document.querySelector('[data-testid="lawyer-dashboard-ready"]'),
          home: !!document.querySelector('[data-testid="home-main-zone"],[data-testid="home-bottom-chrome"],[data-testid="home-main-grid"]'),
          title: document.title,
          href: location.href,
          probeTtfiMs: typeof window.__hamiTtfiMs === 'number' ? window.__hamiTtfiMs : null,
          ttfiMs: entry ? Math.round(entry.startTime - start) : null,
          bodySample: (document.body?.innerText || '').slice(0, 240),
        };
      })()`,
    );
    record('boot-ready', readyOk && homeOk, JSON.stringify(boot));

    biometricProbe = await evaluate(
      send,
      `(() => {
        try {
          const caps = window.Capacitor;
          if (!caps) return { isNative: false, platform: null, pluginKeys: [], reason: 'no-capacitor' };
          const platform = typeof caps.getPlatform === 'function' ? caps.getPlatform() : null;
          const isNative = typeof caps.isNativePlatform === 'function'
            ? !!caps.isNativePlatform()
            : platform === 'android' || platform === 'ios';
          const pluginKeys = caps.Plugins ? Object.keys(caps.Plugins) : [];
          const hasBiometricPlugin =
            pluginKeys.includes('BiometricAuth') || pluginKeys.includes('BiometricAuthNative');
          const hasPrivacyScreen = pluginKeys.includes('PrivacyScreen');
          return {
            isNative,
            platform,
            hasBiometricPlugin,
            hasPrivacyScreen,
            pluginKeys: pluginKeys.slice(0, 40),
          };
        } catch (e) {
          return { isNative: false, error: String(e && e.message || e) };
        }
      })()`,
    );

    // فحص توفر العتاد عبر checkBiometry — ليس challenge تفاعلي
    let biometryHardware = null;
    try {
      biometryHardware = await evaluate(
        send,
        `(async () => {
          try {
            const caps = window.Capacitor;
            const plugin = caps?.Plugins?.BiometricAuthNative || caps?.Plugins?.BiometricAuth || null;
            if (!plugin || typeof plugin.checkBiometry !== 'function') {
              return { probed: false, reason: 'no-checkBiometry' };
            }
            const result = await plugin.checkBiometry();
            return {
              probed: true,
              isAvailable: !!result?.isAvailable,
              biometryType: result?.biometryType ?? null,
              strongBiometryIsAvailable: result?.strongBiometryIsAvailable ?? null,
            };
          } catch (e) {
            return { probed: true, error: String(e && e.message || e) };
          }
        })()`,
      );
    } catch (e) {
      biometryHardware = { probed: false, error: String(e && e.message || e) };
    }
    if (biometricProbe && typeof biometricProbe === 'object') {
      biometricProbe = { ...biometricProbe, biometryHardware };
    }
    gates.push({
      id: 'biometric-hardware-probe',
      ok: Boolean(biometryHardware?.probed),
      detail: JSON.stringify(biometryHardware),
      advisory: true,
    });
    console.log(
      `${biometryHardware?.probed ? 'PASS' : 'WARN'} biometric-hardware-probe — ${JSON.stringify(biometryHardware)}`,
    );
    // إثبات جسر أصلي — لا يفشل الخبز إن تأخر تسجيل Plugins
    const nativeOk = Boolean(biometricProbe?.isNative || biometricProbe?.platform === 'android');
    gates.push({
      id: 'native-bridge-visible',
      ok: nativeOk,
      detail: JSON.stringify(biometricProbe),
      advisory: false,
    });
    console.log(`${nativeOk ? 'PASS' : 'FAIL'} native-bridge-visible — ${JSON.stringify(biometricProbe)}`);
    gates.push({
      id: 'biometric-plugin-registered',
      ok: Boolean(biometricProbe?.hasBiometricPlugin),
      detail: biometricProbe?.hasBiometricPlugin
        ? 'BiometricAuth/BiometricAuthNative in Capacitor.Plugins'
        : 'plugin key missing at probe time — structural android verify still required',
      advisory: false,
    });
    console.log(
      `${biometricProbe?.hasBiometricPlugin ? 'PASS' : 'FAIL'} biometric-plugin-registered — ${biometricProbe?.hasBiometricPlugin}`,
    );
    gates.push({
      id: 'privacy-screen-plugin-registered',
      ok: Boolean(biometricProbe?.hasPrivacyScreen),
      detail: biometricProbe?.hasPrivacyScreen
        ? 'PrivacyScreen in Capacitor.Plugins'
        : 'PrivacyScreen missing',
      advisory: false,
    });
    console.log(
      `${biometricProbe?.hasPrivacyScreen ? 'PASS' : 'FAIL'} privacy-screen-plugin-registered — ${biometricProbe?.hasPrivacyScreen}`,
    );

    const sectionPlan = [
      {
        id: 'home',
        click: null,
        chrome: '[data-testid="home-main-zone"],[data-testid="home-bottom-chrome"],[data-testid="home-main-grid"]',
        content: '[data-testid="home-main-zone"],[data-testid="home-main-grid"],[data-testid="home-hub-card"]',
      },
      {
        id: 'execution',
        click: 'hub-archive-execution',
        chrome: '[data-testid="execution-archive-shell"]',
        content: '[data-testid="executions-add-new"],[data-testid="execution-archive-shell"],[data-testid="execution-archive-search"]',
      },
      {
        id: 'lawsuit',
        click: 'hub-archive-lawsuit',
        chrome: '[data-testid="lawsuits-civil-archive-instant-shell"],[data-testid="lawsuits-workspace"]',
        content: '[data-testid="lawsuit-archive-empty"],[data-testid="lawsuits-workspace"],[data-testid="lawsuits-civil-archive-instant-shell"]',
      },
    ];

    for (const sec of sectionPlan) {
      const t0 = Date.now();
      let clicked = true;
      if (sec.click) {
        await evaluate(send, `window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
        await new Promise((r) => setTimeout(r, 400));
        clicked = Boolean(await clickTestId(send, sec.click));
      }
      const chromeOk = await waitForSelector(send, sec.chrome, 25_000);
      const contentOk = await waitForSelector(send, sec.content, 25_000);
      const ms = Date.now() - t0;
      surfaces[sec.id] = { clicked, chromeOk, contentOk, ms, click: sec.click };
      record(`section-${sec.id}`, chromeOk && contentOk, `chrome=${chromeOk} content=${contentOk} ${ms}ms clicked=${clicked}`);
    }

    ws.close();
  }

  const sectionBakeCdp = Boolean(
    surfaces.home?.chromeOk &&
      surfaces.execution?.chromeOk &&
      surfaces.lawsuit?.chromeOk &&
      surfaces.home?.contentOk &&
      surfaces.execution?.contentOk &&
      surfaces.lawsuit?.contentOk,
  );

  const hardGates = gates.filter((g) => !g.advisory);
  const ok = hardGates.every((g) => g.ok) && sectionBakeCdp;
  const payload = {
    ok,
    at: new Date().toISOString(),
    host: os.hostname(),
    deviceSerial: serial,
    pid: sockPid || pid,
    sectionBakeCdp,
    boot,
    surfaces,
    biometricProbe,
    gates,
    contract:
      'Wave 6 Cap section bake — WebView CDP via adb forward; home+execution+lawsuit chrome/content must attach',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(CLOSE_HINT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[wave6-cap-bake] ${ok ? 'PASS' : 'OPEN/FAIL'} sectionBakeCdp=${sectionBakeCdp} → ${OUT}`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
