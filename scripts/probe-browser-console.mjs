/**
 * التقاط كونسول المتصفح من التطبيق قيد التشغيل على :8080
 * Usage: node scripts/probe-browser-console.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const outPath = path.resolve('.cursor/browser-console-probe.json');

const messages = [];
const pageErrors = [];
const failedRequests = [];

function keep(type, text) {
  if (/^\[vite\]/i.test(text)) return false;
  if (/Download the React DevTools/i.test(text)) return false;
  if (type === 'debug' || type === 'info' || type === 'log') {
    return /Error|Warning|React|deprecated|not a function|Failed|CORS|404|500/i.test(text);
  }
  return type === 'error' || type === 'warning' || type === 'warn';
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (msg) => {
  const type = msg.type();
  const text = msg.text();
  if (keep(type, text)) messages.push({ type, text, loc: msg.location() });
});
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err?.message || err)));
page.on('requestfailed', (req) => {
  failedRequests.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
});

await page.addInitScript(() => {
  try {
    localStorage.setItem('hami_e2e_boot', '1');
  } catch {
    /* ignore */
  }
});

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(8_000);

// حاول الوصول للوحة المحامي إن وُجدت أزرار إقلاع
const ready = page.getByTestId('lawyer-dashboard-ready');
const authBtn = page.getByRole('button', { name: /محام|دخول|تسجيل/i }).first();
try {
  if (await ready.isVisible({ timeout: 3_000 }).catch(() => false)) {
    /* already home */
  } else if (await authBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await authBtn.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(5_000);
  }
} catch {
  /* ignore navigation helpers */
}

await page.waitForTimeout(3_000);

const payload = {
  at: new Date().toISOString(),
  url: page.url(),
  title: await page.title(),
  messages,
  pageErrors,
  failedRequests: failedRequests.filter((r) => !/favicon|hot-update|sourcemap/i.test(r.url)).slice(0, 40),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify(payload, null, 2));
await browser.close();
