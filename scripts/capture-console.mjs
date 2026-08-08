/**
 * Extended console capture — boot to lawyer home and scan for noise.
 */
import { chromium } from 'playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080/';

const messages = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.addInitScript(() => {
    try {
        localStorage.setItem('hami_e2e_boot', '1');
        localStorage.setItem('hami:last-screen', 'lawyer');
    } catch {
        /* ignore */
    }
});

page.on('console', (msg) => {
    messages.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', (err) => {
    pageErrors.push(err.message);
});

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });

for (let i = 0; i < 25; i++) {
    const ready = await page.getByTestId('lawyer-dashboard-ready').isVisible().catch(() => false);
    if (ready) break;
    await page.waitForTimeout(400);
}

await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 45_000 });
await page.waitForTimeout(3000);

// Trigger a toast to verify SmartToast ref fix (AnimatePresence popLayout)
await page.evaluate(async () => {
    const { SmartToast } = await import('/src/app/components/ui/smartToastBus.ts');
    SmartToast.success('اختبار الكونسول');
});
await page.waitForTimeout(2000);

await browser.close();

const filtered = messages.filter(
    (m) => m.type === 'error' || m.type === 'warning' || m.type === 'warn',
);

console.log('--- all messages ---');
for (const m of messages) console.log(`[${m.type}] ${m.text.slice(0, 240)}`);

console.log('--- page errors ---');
for (const e of pageErrors) console.log(e);

console.log('--- warnings/errors ---');
for (const m of filtered) console.log(`[${m.type}] ${m.text}`);

console.log('total messages:', messages.length);

if (filtered.length === 0 && pageErrors.length === 0) {
    console.log('✅ Console clean (no warnings/errors/page errors)');
    process.exit(0);
}

process.exit(1);
