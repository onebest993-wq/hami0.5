import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  const t = m.text();
  if (/Maximum update depth|Rendered more hooks|hami-boot-failure/i.test(t)) {
    errors.push('[console] ' + t.slice(0, 500));
  }
});

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch((e) => {
  errors.push('goto-failed: ' + e.message);
});
await page.waitForTimeout(6000);

const boot = await page.locator('#hami-boot-failure').count().catch(() => -1);
const pre = boot > 0 ? await page.locator('#hami-boot-failure pre').innerText().catch(() => '') : '';
const gate = await page.locator('[data-hami-auth-gate]').count().catch(() => -1);

console.log(JSON.stringify({ boot, gate, pre: pre.slice(0, 300), pageerrors: errors.length, firstErr: (errors[0] || '').slice(0, 400) }, null, 2));
await browser.close();
