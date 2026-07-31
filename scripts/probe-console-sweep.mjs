/**
 * مسح كونسول موسّع: إقلاع → مستودع → ملف/استوديو → إعدادات → منتدى
 * node scripts/probe-console-sweep.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const outPath = path.resolve('.cursor/browser-console-sweep.json');

const noisy = [];
const pageErrors = [];
const failedRequests = [];
const seen = new Set();

function pushMsg(type, text) {
  const key = `${type}|${text.slice(0, 240)}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (/^\[vite\]/i.test(text) || /Download the React DevTools/i.test(text)) return;
  if (/hot-update|sourcemap|favicon/i.test(text)) return;
  if (
    type === 'error' ||
    type === 'warning' ||
    type === 'warn' ||
    /Warning:|Error|Failed|Maximum update|flushSync|TypeError|Cannot |deprecated|act\(/i.test(
      text,
    )
  ) {
    noisy.push({ type, text: text.slice(0, 1200) });
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', (msg) => pushMsg(msg.type(), msg.text()));
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err).slice(0, 1500)));
page.on('requestfailed', (req) => {
  const url = req.url();
  if (/favicon|hot-update|sourcemap/i.test(url)) return;
  failedRequests.push({ url: url.slice(0, 300), error: req.failure()?.errorText || 'failed' });
});

await page.addInitScript(() => {
  try {
    localStorage.setItem('hami_e2e_boot', '1');
    sessionStorage.setItem('hami:verbose-console', '1');
  } catch {
    /* ignore */
  }
});

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(4000);

for (let i = 0; i < 25; i++) {
  const ready = await page.getByTestId('lawyer-dashboard-ready').isVisible().catch(() => false);
  if (ready) break;
  const auth = page.getByRole('button', { name: /محام|دخول|متابعة|تسجيل/i }).first();
  if (await auth.isVisible().catch(() => false)) {
    await auth.click({ timeout: 3000 }).catch(() => undefined);
  }
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(400);
}

await page.waitForTimeout(1200);

/* مستودع */
await page.evaluate(() => {
  window.dispatchEvent(new Event('hami:repository-prime-host'));
});
await page.waitForTimeout(200);
const repoBtn = page.locator('button.hami-dock-item', { hasText: 'المستودع الذكي' }).first();
if (await repoBtn.isVisible().catch(() => false)) {
  await repoBtn.dispatchEvent('pointerdown');
  await repoBtn.click({ timeout: 5000 }).catch(() => undefined);
} else {
  await page.evaluate(() => window.__hamiE2eForceOpenRepository?.());
}
await page.waitForTimeout(2000);
await page.keyboard.press('Escape').catch(() => undefined);
await page.waitForTimeout(500);

/* ملف + استوديو */
await page.evaluate(() => window.__hamiE2eForceOpenProfileTab?.());
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /الاستوديو|إعدادات الصفحة/.test(b.textContent || ''),
  );
  btn?.click();
});
await page.waitForTimeout(1200);
await page.keyboard.press('Escape').catch(() => undefined);
await page.waitForTimeout(400);
await page.evaluate(() => {
  document.querySelector('[data-testid="lawyer-profile-back"]')?.click();
});
await page.waitForTimeout(600);

/* إعدادات */
const gear = page.getByTestId('header-settings-trigger');
if (await gear.isVisible().catch(() => false)) {
  await gear.dispatchEvent('pointerdown');
  await gear.click({ timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(400);
}

/* منتدى / مجتمع إن وُجد */
const forumBtn = page.locator('button.hami-dock-item', { hasText: /المنتدى|المجتمع|شبكة/i }).first();
if (await forumBtn.isVisible().catch(() => false)) {
  await forumBtn.click({ timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(400);
} else {
  await page.evaluate(() => {
    window.__hamiE2eForceOpenCommunity?.();
    window.__hamiE2eForceOpenForum?.();
  });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape').catch(() => undefined);
}

/* تقويم */
const sched = page.locator('button.hami-dock-item', { hasText: /التقويم|المواعيد/i }).first();
if (await sched.isVisible().catch(() => false)) {
  await sched.dispatchEvent('pointerdown');
  await sched.click({ timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape').catch(() => undefined);
}

await page.waitForTimeout(800);

const payload = {
  at: new Date().toISOString(),
  url: page.url(),
  noisy,
  pageErrors,
  failedRequests: failedRequests.slice(0, 50),
  counts: {
    noisy: noisy.length,
    pageErrors: pageErrors.length,
    failedRequests: failedRequests.length,
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify(payload, null, 2));
await browser.close();
