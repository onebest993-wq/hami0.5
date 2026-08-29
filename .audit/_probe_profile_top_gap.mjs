/**
 * Live probe: profile chrome top gap + ancestor padding after open.
 * Usage: node .audit/_probe_profile_top_gap.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.HAMI_E2E_BASE_URL || 'http://localhost:8080';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 564, height: 900 } });
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') logs.push(m.text());
  });

  await page.addInitScript(() => {
    try {
      localStorage.setItem('hami:e2e', '1');
    } catch {}
  });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 90_000 });
  await page.getByTestId('header-profile-trigger').waitFor({ state: 'visible', timeout: 30_000 });

  // Capture frames around open for jump detection
  const frames = [];
  await page.evaluate(() => {
    window.__hamiProbeFrames = [];
    const tick = () => {
      const chrome = document.querySelector('[data-testid="lawyer-profile-chrome-header"]');
      const surface = document.querySelector('[data-testid="lawyer-dashboard-profile-surface"]');
      const ready = document.querySelector('[data-testid="lawyer-dashboard-ready"]');
      window.__hamiProbeFrames.push({
        t: performance.now(),
        open: document.documentElement.getAttribute('data-hami-profile-open'),
        chromeTop: chrome ? chrome.getBoundingClientRect().top : null,
        surfaceTop: surface ? surface.getBoundingClientRect().top : null,
        readyPadTop: ready ? getComputedStyle(ready).paddingTop : null,
      });
    };
    tick();
    const id = setInterval(tick, 16);
    window.__hamiProbeStop = () => clearInterval(id);
  });

  await page.getByTestId('header-profile-trigger').click({ force: true });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__hamiProbeStop?.());

  const report = await page.evaluate(() => {
    const chrome = document.querySelector('[data-testid="lawyer-profile-chrome-header"]');
    const surface = document.querySelector('[data-testid="lawyer-dashboard-profile-surface"]');
    const ready = document.querySelector('[data-testid="lawyer-dashboard-ready"]');
    const root = document.querySelector('[data-lawyer-profile-root]');
    const shell = document.querySelector('[data-testid="lawyer-profile-tab-shell"]');
    const underlay = document.querySelector('[data-hami-dashboard-underlay]');
    const chain = [];
    let el = chrome;
    for (let i = 0; i < 14 && el; i++) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      chain.push({
        tag: el.tagName,
        id: el.id || undefined,
        testid: el.getAttribute('data-testid') || undefined,
        cls: (el.className || '').toString().slice(0, 120),
        top: Math.round(r.top * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        padT: cs.paddingTop,
        marT: cs.marginTop,
        pos: cs.position,
        bg: cs.backgroundColor,
      });
      el = el.parentElement;
    }
    const safeTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)');
    return {
      open: document.documentElement.getAttribute('data-hami-profile-open'),
      envSafeTop: getComputedStyle(document.documentElement).paddingTop,
      rootPad: root ? getComputedStyle(root).paddingTop : null,
      rootBg: root ? getComputedStyle(root).backgroundColor : null,
      readyPad: ready ? getComputedStyle(ready).paddingTop : null,
      readyBg: ready ? getComputedStyle(ready).backgroundColor : null,
      surfaceTop: surface ? surface.getBoundingClientRect().top : null,
      surfaceBg: surface ? getComputedStyle(surface).backgroundColor : null,
      shellTop: shell ? shell.getBoundingClientRect().top : null,
      underlayTop: underlay ? underlay.getBoundingClientRect().top : null,
      chromeTop: chrome ? chrome.getBoundingClientRect().top : null,
      chromeLeft: chrome ? chrome.getBoundingClientRect().left : null,
      profileSafeTopVar: root
        ? getComputedStyle(root).getPropertyValue('--profile-safe-top')
        : null,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      frames: window.__hamiProbeFrames || [],
      chain,
    };
  });

  console.log(JSON.stringify(report, null, 2));
  if (logs.length) console.log('console errors', logs.slice(0, 5));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
