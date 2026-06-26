/**
 * Full console audit — boot, profile, execution archive (E2E-aligned boot).
 */
import { chromium } from 'playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080/';

const MINIMAL_EXEC = {
    id: 'console-audit-exec-1',
    fileNumber: '101',
    fileYear: '2026',
    directorate: 'مديرية تنفيذ E2E',
    executionNumber: '101',
    docNumber: '2026/تنفيذ/101',
    docType: 'حكم',
    status: 'active',
    debtors: [{ id: 'd1', name: 'مدين E2E', type: 'natural_person' }],
    creditors: [{ id: 'c1', name: 'دائن E2E' }],
    seizedAssets: [],
    timelineEvents: [],
    caseNotesLog: [],
    caseTasksPending: [],
    financialLedger: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const messages = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.addInitScript(({ exec }) => {
    try {
        localStorage.setItem('hami:last-screen', 'lawyer');
        const payload = JSON.stringify([exec]);
        for (const k of ['executionFiles', 'hami-execution-files', 'execution_files', 'lawyer_execution_files']) {
            localStorage.setItem(k, payload);
        }
    } catch {
        /* ignore */
    }
}, { exec: MINIMAL_EXEC });

page.on('console', (msg) => {
    const text = msg.text();
    if (/^\[vite\]/i.test(text)) return;
    if (/Download the React DevTools/i.test(text)) return;
    messages.push({ type: msg.type(), text });
});
page.on('pageerror', (err) => {
    pageErrors.push(err.message);
});

async function waitReady() {
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await devBypass.click();
    }
    await page.getByText(/جاري التحميل/i).first().waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
}

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await waitReady();

const execTile = page.getByTestId('hub-archive-execution');
if (await execTile.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await execTile.click();
    await page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i }).waitFor({ timeout: 25_000 });
    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape').catch(() => undefined);
}

await page.waitForTimeout(1500);
await browser.close();

const filtered = messages.filter((m) => {
    if (m.type === 'error' || m.type === 'warning' || m.type === 'warn') return true;
    return /React|Warning|Error|not a function|ReferenceError|deprecated/i.test(m.text);
});

console.log('=== PAGE ERRORS ===');
for (const e of pageErrors) console.log(e);

console.log('=== WARNINGS / ERRORS ===');
for (const m of filtered) console.log(`[${m.type}] ${m.text.slice(0, 400)}`);

console.log('total messages:', messages.length, 'filtered:', filtered.length);

if (filtered.length === 0 && pageErrors.length === 0) {
    console.log('✅ Console audit clean');
    process.exit(0);
}

process.exit(1);
