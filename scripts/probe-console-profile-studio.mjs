import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const noisy = [];
const pageErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (msg) => {
  const type = msg.type();
  const text = msg.text();
  if (/^\[vite\]/i.test(text) || /DevTools/i.test(text)) return;
  if (
    type === 'error' ||
    type === 'warning' ||
    type === 'warn' ||
    /Warning:|Error|Failed|Maximum update|flushSync|TypeError|Cannot /i.test(text)
  ) {
    noisy.push({ type, text: text.slice(0, 900) });
  }
});
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err).slice(0, 1200)));
page.on('requestfailed', (req) => {
  const url = req.url();
  if (/favicon|hot-update|sourcemap/i.test(url)) return;
  failedRequests.push({ url, error: req.failure()?.errorText || 'failed' });
});

await page.addInitScript(() => {
  try {
    localStorage.setItem('hami_e2e_boot', '1');
    sessionStorage.setItem('hami:verbose-console', '1');
  } catch {
    /* ignore */
  }
});

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
await page.waitForTimeout(3500);
await page.evaluate(() => window.__hamiE2eForceOpenProfileTab?.());
await page.waitForTimeout(2000);

// settings open via evaluate if button hard to find
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /الاستوديو|إعدادات/.test(b.textContent || ''),
  );
  btn?.click();
});
await page.waitForTimeout(2000);

await page.evaluate(() => {
  document.querySelector('[data-testid="profile-settings-tab-containers"]')?.click();
});
await page.waitForTimeout(1000);

await page.evaluate(() => {
  const expand = document.querySelector('[data-testid^="profile-block-expand-"]');
  if (expand) expand.click();
  else {
    const add = [...document.querySelectorAll('button')].find((b) => /إضافة نص/.test(b.textContent || ''));
    add?.click();
  }
});
await page.waitForTimeout(1200);

await page.evaluate(() => {
  document.querySelector('[data-testid="text-style-scope-line"]')?.click();
  document.querySelector('[data-testid="image-rim-gold"]')?.click();
  document.querySelector('[data-testid="lawyer-profile-back"]')?.click();
});
await page.waitForTimeout(1000);

const payload = {
  at: new Date().toISOString(),
  url: page.url(),
  noisy,
  pageErrors,
  failedRequests: failedRequests.slice(0, 30),
};

fs.writeFileSync('.cursor/browser-console-probe.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
await browser.close();
