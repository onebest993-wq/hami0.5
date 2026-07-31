/**
 * مسح تفاعلي للرئيسية + بطاقة التنبيهات — كل رسائل الكونسول.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const outPath = path.resolve('.cursor/browser-console-home.json');

const messages = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', (msg) => {
    messages.push({ type: msg.type(), text: msg.text().slice(0, 3000) });
});
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err).slice(0, 3000)));

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });

for (let i = 0; i < 40; i++) {
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible().catch(() => false)) {
        await devBypass.click({ timeout: 3000 }).catch(() => undefined);
    }
    if (await page.getByTestId('lawyer-dashboard-ready').isVisible().catch(() => false)) break;
    await page.waitForTimeout(400);
}

await page.waitForTimeout(3000);

const card = page.getByTestId('home-hub-card');
if (await card.isVisible().catch(() => false)) {
    await card.getByTestId('home-hub-tab-pins').click().catch(() => undefined);
    await page.waitForTimeout(800);
    await card.getByTestId('home-hub-tab-alerts').click().catch(() => undefined);
    await page.waitForTimeout(800);
}

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000);

const payload = {
    at: new Date().toISOString(),
    messageCount: messages.length,
    messages,
    pageErrors,
    errors: messages.filter((m) => m.type === 'error'),
    warnings: messages.filter((m) => m.type === 'warning' || m.type === 'warn'),
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify({
    messageCount: messages.length,
    errors: payload.errors.length,
    warnings: payload.warnings.length,
    all: messages.map((m) => `[${m.type}] ${m.text.slice(0, 300)}`),
    pageErrors,
}, null, 2));
await browser.close();
