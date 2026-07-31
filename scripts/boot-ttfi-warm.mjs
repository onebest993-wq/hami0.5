/**
 * قياس TTFI warm — محاذاة مع boot-ttfi-audit (إعدادات + strip + timeout).
 * cold ثم primer ثم 3 warms على نفس الـ context.
 *
 * يتطلب: VITE_SHELL_AUTH_OPEN=true npm run build
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4177;
const url = `http://127.0.0.1:${PORT}/`;

async function assertPortFree(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(800) });
    if (res.ok || res.status) {
      throw new Error(
        `port ${port} already serves HTTP — kill the stale vite preview before warm TTFI (strictPort would otherwise attach to the wrong process)`,
      );
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err && String(err.message).includes('already serves')) {
      throw err;
    }
    /* ECONNREFUSED = free — good */
  }
}

function startPreview() {
  return spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
  );
}

async function waitReady(proc, ms = 45_000) {
  const start = Date.now();
  let stderr = '';
  proc.stderr?.on('data', (chunk) => {
    stderr += String(chunk);
  });
  proc.stdout?.on('data', () => undefined);
  while (Date.now() - start < ms) {
    if (proc.exitCode != null) {
      throw new Error(`preview exited early code=${proc.exitCode} stderr=${stderr.slice(0, 500)}`);
    }
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`preview not ready: ${url} stderr=${stderr.slice(0, 500)}`);
}

async function prepare(page) {
  await page.addInitScript(() => {
    try {
      // قياس صادق بدون SW/cache قديمة من جلسات preview سابقة على نفس المنفذ
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations?.().then((regs) => {
          regs.forEach((r) => r.unregister().catch(() => undefined));
        });
      }
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      sessionStorage.setItem('hami:last-screen', 'lawyer');
      sessionStorage.setItem('hami:lawyer-dashboard-tab', 'home');
      sessionStorage.removeItem('hami:lawyer-community-open');
      localStorage.setItem('hami:weekly-backup-reminder-at', String(Date.now()));
      const rawSettings = localStorage.getItem('lawyer_settings');
      let parsedSettings = {};
      if (rawSettings && rawSettings.trim()) {
        try {
          parsedSettings = JSON.parse(rawSettings);
        } catch {
          parsedSettings = {};
        }
      }
      const security =
        parsedSettings.security && typeof parsedSettings.security === 'object'
          ? parsedSettings.security
          : {};
      localStorage.setItem(
        'lawyer_settings',
        JSON.stringify({
          ...parsedSettings,
          version: parsedSettings.version ?? 2,
          security: {
            ...security,
            biometricLock: false,
            autoLockMinutes: 0,
          },
          homeLayout: {
            ...(parsedSettings.homeLayout && typeof parsedSettings.homeLayout === 'object'
              ? parsedSettings.homeLayout
              : {}),
            dockVisible: true,
            quickNoteVisible: false,
          },
        }),
      );
    } catch {
      /* ignore */
    }
    const strip = () => document.getElementById('hami-boot-failure')?.remove();
    strip();
    const root = document.documentElement;
    if (root && typeof root.nodeType === 'number') {
      const observer = new MutationObserver(strip);
      observer.observe(root, { childList: true, subtree: true });
    }
  });
}

async function waitInteractive(page) {
  const bypass = page.getByRole('button', { name: /تخطي المطور|دخول تجريبي|تخطي/i });
  if (await bypass.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await bypass.click().catch(() => undefined);
  }
  await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 90_000 });
  await Promise.any([
    page.getByTestId('home-bottom-chrome').waitFor({ state: 'attached', timeout: 30_000 }),
    page.getByTestId('home-main-zone').waitFor({ state: 'attached', timeout: 30_000 }),
    page.getByTestId('lawyer-dashboard-home-surface').waitFor({ state: 'attached', timeout: 30_000 }),
  ]);
  await page.getByTestId('lawyer-boot-shell').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
  await page.getByTestId('lawyer-boot-shell').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
}

async function readTtfi(page) {
  return page.evaluate(() => {
    const starts = performance.getEntriesByName('hami:boot:start', 'mark');
    const inters = performance.getEntriesByName('hami:boot:dashboard-interactive', 'mark');
    const start = starts[starts.length - 1]?.startTime ?? 0;
    const entry = inters[inters.length - 1];
    return entry ? Math.round(entry.startTime - start) : null;
  });
}

async function clearBootMarks(page) {
  await page
    .evaluate(() => {
      performance.clearMarks('hami:boot:start');
      performance.clearMarks('hami:boot:dashboard-interactive');
    })
    .catch(() => undefined);
}

async function visit(page) {
  await clearBootMarks(page);
  // منع SW من حقن كاش قديم على منفذ القياس (سبب شائع لـ GlobalErrorBoundary في preview)
  await page.unroute('**/sw.js').catch(() => undefined);
  await page.route('**/sw.js', (route) => route.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await waitInteractive(page);
  return readTtfi(page);
}

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  throw new Error('dist missing — build with VITE_SHELL_AUTH_OPEN=true first');
}
await assertPortFree(PORT);
const proc = startPreview();
try {
  await waitReady(proc);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => {
    pageErrors.push({ message: e.message, stack: String(e.stack || '').slice(0, 600) });
  });
  await prepare(page);

  let cold;
  try {
    cold = await visit(page);
  } catch (err) {
    const html = await page.content().catch(() => '');
    const text = await page.locator('body').innerText().catch(() => '');
    const boundaryError = await page
      .evaluate(() => window.__HAMI_LAST_BOUNDARY_ERROR || null)
      .catch(() => null);
    fs.mkdirSync(path.join(ROOT, 'perf-reports'), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, 'perf-reports', 'ttfi-warm-fail.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          url,
          title: await page.title().catch(() => ''),
          bodySample: String(text).slice(0, 800),
          htmlSample: String(html).slice(0, 4000),
          pageErrors: pageErrors.slice(0, 12),
          boundaryError,
          error: String(err && err.message ? err.message : err),
        },
        null,
        2,
      ),
    );
    throw err;
  }

  // primer
  await visit(page);

  const warmSamples = [];
  for (let i = 0; i < 3; i++) {
    warmSamples.push(await visit(page));
  }
  const valid = warmSamples.filter((n) => typeof n === 'number');
  const sorted = [...valid].sort((a, b) => a - b);
  const warmMedian = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const warmAvgMs = valid.length
    ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    : null;

  const out = {
    measuredAt: new Date().toISOString(),
    coldMs: cold,
    warmMs: warmSamples,
    warmAvgMs,
    warmMedianMs: warmMedian,
    targetCold220: cold != null && cold <= 220 ? 'MET' : 'OPEN',
    targetWarm150: warmMedian != null && warmMedian <= 150 ? 'MET' : 'OPEN',
    port: PORT,
  };
  fs.mkdirSync(path.join(ROOT, 'perf-reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'perf-reports', 'ttfi-warm.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
} finally {
  try {
    if (process.platform === 'win32' && proc.pid) {
      spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    /* */
  }
}
