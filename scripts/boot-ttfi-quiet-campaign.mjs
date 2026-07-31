/**
 * حملة قياس إقلاع هادئة: preview واحد + N تنقّلات باردة مع فاصل.
 * الاستخدام:
 *   VITE_SHELL_AUTH_OPEN=true npm run build
 *   node scripts/boot-ttfi-quiet-campaign.mjs --runs=12 --gapMs=2500
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'perf-reports');
const PREVIEW_PORT = 4173;
const baseUrl = `http://127.0.0.1:${PREVIEW_PORT}/`;

const runs = Math.max(
  3,
  Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? 12),
);
const gapMs = Math.max(
  500,
  Number(process.argv.find((a) => a.startsWith('--gapMs='))?.split('=')[1] ?? 2500),
);
const coldBrowser = process.argv.includes('--coldBrowser');
const label =
  process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'quiet-campaign';

function spawnCmd(cmd, args) {
  return spawn(cmd, args, {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
}

async function waitForServer(url, ms = 45_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`server not ready: ${url}`);
}

async function measureOnce(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem('lawyer_settings_v2');
      const parsedSettings = raw ? JSON.parse(raw) : {};
      const security =
        parsedSettings.security && typeof parsedSettings.security === 'object'
          ? parsedSettings.security
          : {};
      localStorage.setItem(
        'lawyer_settings_v2',
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
  });

  const navStart = Date.now();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  const devBypass = page.getByRole('button', { name: /تخطي المطور|دخول تجريبي|تخطي/i });
  if (await devBypass.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await devBypass.click().catch(() => undefined);
  }

  await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'attached', timeout: 90_000 });
  await Promise.any([
    page.getByTestId('home-bottom-chrome').waitFor({ state: 'attached', timeout: 30_000 }),
    page.getByTestId('home-main-zone').waitFor({ state: 'attached', timeout: 30_000 }),
    page.getByTestId('lawyer-dashboard-home-surface').waitFor({ state: 'attached', timeout: 30_000 }),
  ]);
  await page.getByTestId('lawyer-boot-shell').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
  await page
    .getByTestId('lawyer-boot-shell')
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => undefined);

  const metrics = await page.evaluate(() => {
    const phases = [
      'start',
      'static-shell-visible',
      'app-render',
      'dashboard-chunk-loaded',
      'dashboard-interactive',
      'first-tab-open',
    ];
    const startMark = performance.getEntriesByName('hami:boot:start', 'mark')[0];
    const origin = startMark?.startTime ?? 0;
    const timeline = phases.map((phase) => {
      const entry = performance.getEntriesByName(`hami:boot:${phase}`, 'mark')[0];
      return { phase, ms: entry ? Math.round(entry.startTime - origin) : null };
    });
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((e) => e.name === 'first-contentful-paint');
    return {
      timeline,
      ttfiMs: timeline.find((r) => r.phase === 'dashboard-interactive')?.ms ?? null,
      firstTabOpenMs: timeline.find((r) => r.phase === 'first-tab-open')?.ms ?? null,
      chunkLoadedMs: timeline.find((r) => r.phase === 'dashboard-chunk-loaded')?.ms ?? null,
      fcpMs: fcp ? Math.round(fcp.startTime) : null,
    };
  });

  await context.close();
  return {
    wallClockMs: Date.now() - navStart,
    ...metrics,
  };
}

function summarize(samples) {
  const walls = samples.map((s) => s.wallClockMs).sort((a, b) => a - b);
  const firstTabs = samples
    .map((s) => s.firstTabOpenMs)
    .filter((n) => typeof n === 'number')
    .sort((a, b) => a - b);
  const quiet = walls.filter((w) => w <= 1000);
  const mid = (arr) =>
    arr.length === 0
      ? null
      : arr.length % 2
        ? arr[(arr.length - 1) / 2]
        : Math.round((arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2);
  return {
    n: walls.length,
    wallBest: walls[0] ?? null,
    wallMedian: mid(walls),
    wallP90: walls[Math.min(walls.length - 1, Math.floor(walls.length * 0.9))] ?? null,
    wallWorst: walls[walls.length - 1] ?? null,
    wallSorted: walls,
    quietUnder1sCount: quiet.length,
    quietUnder1sShare: walls.length ? Number((quiet.length / walls.length).toFixed(2)) : 0,
    firstTabBest: firstTabs[0] ?? null,
    firstTabMedian: mid(firstTabs),
    /** ختم عالمي تقريبي: ≥70% تحت 1s ووسيط ≤950 وأفضل ≤850 */
    sealCandidate:
      quiet.length / walls.length >= 0.7 &&
      (mid(walls) ?? 9999) <= 950 &&
      (walls[0] ?? 9999) <= 850,
  };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  let preview = null;
  try {
    preview = spawnCmd('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT)]);
    await waitForServer(baseUrl);
    // تسخين preview مرة واحدة قبل العينات (لا يُحسب)
    {
      const browserWarm = await chromium.launch({ headless: true });
      await measureOnce(browserWarm).catch(() => undefined);
      await browserWarm.close();
      await new Promise((r) => setTimeout(r, gapMs));
    }

    const samples = [];
    let sharedBrowser = coldBrowser ? null : await chromium.launch({ headless: true });
    for (let i = 0; i < runs; i += 1) {
      const browser = coldBrowser ? await chromium.launch({ headless: true }) : sharedBrowser;
      const row = await measureOnce(browser);
      samples.push(row);
      console.log(
        `[quiet ${i + 1}/${runs}${coldBrowser ? ' cold' : ''}] wall=${row.wallClockMs}ms firstTab=${row.firstTabOpenMs ?? 'n/a'} ttfi=${row.ttfiMs ?? 'n/a'}`,
      );
      if (coldBrowser) await browser.close();
      if (i < runs - 1) await new Promise((r) => setTimeout(r, gapMs));
    }
    if (sharedBrowser) await sharedBrowser.close();

    const summary = {
      label,
      measuredAt: new Date().toISOString(),
      runs,
      gapMs,
      coldBrowser,
      url: baseUrl,
      summary: summarize(samples),
      samples,
    };
    const outJson = path.join(outDir, `${label}.json`);
    fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');
    console.log('[quiet] summary', JSON.stringify(summary.summary, null, 2));
    console.log(`[quiet] saved ${outJson}`);
    process.exitCode = summary.summary.sealCandidate ? 0 : 2;
  } finally {
    preview?.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
