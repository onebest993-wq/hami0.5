/**
 * التقاط كل رسائل الكونسول بدون فلترة — لمحاكاة ما يراه المطوّر.
 * node scripts/probe-console-verbose.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.HAMI_PROBE_URL || 'http://localhost:8080';
const outPath = path.resolve('.cursor/browser-console-verbose.json');

const messages = [];
const pageErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', (msg) => {
    messages.push({
        type: msg.type(),
        text: msg.text().slice(0, 2000),
        loc: msg.location(),
    });
});
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err).slice(0, 3000)));
page.on('requestfailed', (req) => {
    failedRequests.push({
        url: req.url().slice(0, 400),
        error: req.failure()?.errorText || 'failed',
    });
});

// بدون hami_e2e_boot — مسار المستخدم الحقيقي
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90_000 }).catch(async () => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
});

for (let i = 0; i < 40; i++) {
    const ready = await page.getByTestId('lawyer-dashboard-ready').isVisible().catch(() => false);
    if (ready) break;
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible().catch(() => false)) {
        await devBypass.click({ timeout: 3000 }).catch(() => undefined);
    }
    const auth = page.getByRole('button', { name: /محام|دخول|متابعة|تسجيل/i }).first();
    if (await auth.isVisible().catch(() => false)) {
        await auth.click({ timeout: 3000 }).catch(() => undefined);
    }
    await page.waitForTimeout(500);
}

await page.waitForTimeout(5000);
await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
await page.waitForTimeout(8000);

const payload = {
    at: new Date().toISOString(),
    url: page.url(),
    title: await page.title(),
    messageCount: messages.length,
    messages,
    pageErrors,
    failedRequests: failedRequests.filter((r) => !/favicon|hot-update|sourcemap/i.test(r.url)),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify({
    messageCount: messages.length,
    pageErrors: pageErrors.length,
    failedRequests: payload.failedRequests.length,
    sample: messages.slice(0, 30).map((m) => `[${m.type}] ${m.text.slice(0, 200)}`),
}, null, 2));
await browser.close();
