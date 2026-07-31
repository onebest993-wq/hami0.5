/**
 * مسح الكونسول مع verbose/debug مفعّل — كما قد يراه المطوّر.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const messages = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (msg) => messages.push({ type: msg.type(), text: msg.text().slice(0, 2000) }));
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err).slice(0, 2000)));

await page.addInitScript(() => {
    localStorage.setItem('debug_mode', 'true');
    sessionStorage.setItem('hami:verbose-console', '1');
});

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
for (let i = 0; i < 40; i++) {
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible().catch(() => false)) await devBypass.click().catch(() => undefined);
    if (await page.getByTestId('lawyer-dashboard-ready').isVisible().catch(() => false)) break;
    await page.waitForTimeout(400);
}
await page.waitForTimeout(12000);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);

const payload = { messages, pageErrors };
fs.writeFileSync(path.resolve('.cursor/browser-console-debug-mode.json'), JSON.stringify(payload, null, 2));
console.log(JSON.stringify({
    count: messages.length,
    errors: messages.filter((m) => m.type === 'error').map((m) => m.text.slice(0, 400)),
    warnings: messages.filter((m) => m.type === 'warning' || m.type === 'warn').map((m) => m.text.slice(0, 400)),
    logs: messages.filter((m) => m.type === 'log').map((m) => m.text.slice(0, 200)).slice(0, 30),
    pageErrors: pageErrors.map((e) => e.slice(0, 400)),
}, null, 2));
await browser.close();
