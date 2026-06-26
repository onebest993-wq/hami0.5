/**
 * Capture console errors/warnings while exercising execution dossier UI.
 */
import { chromium } from 'playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080/';
const E2E_EXEC_ID = 'console-audit-exec-1';

const MINIMAL_EXEC = {
    id: E2E_EXEC_ID,
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
let step = 'init';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.addInitScript(({ file }) => {
    const payload = JSON.stringify([file]);
    for (const k of ['executionFiles', 'hami-execution-files', 'execution_files', 'lawyer_execution_files']) {
        localStorage.setItem(k, payload);
    }
}, { file: MINIMAL_EXEC });

page.on('console', (msg) => {
    const text = msg.text();
    if (/^\[vite\]/i.test(text)) return;
    messages.push({ type: msg.type(), text, step });
});
page.on('pageerror', (err) => pageErrors.push({ message: err.message, step }));

async function wait(ms) {
    await page.waitForTimeout(ms);
}

step = 'boot';
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await devBypass.click();
}
await page.getByText(/جاري التحميل/i).first().waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => undefined);
await wait(1500);

step = 'archive';
await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
await page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i }).waitFor({ timeout: 25_000 });
await wait(1500);

step = 'dossier-open';
const row = page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first();
await row.waitFor({ state: 'visible', timeout: 25_000 });
await row.click();
await page.getByRole('button', { name: 'محضر المتابعة' }).waitFor({ state: 'visible', timeout: 25_000 });
await wait(3000);

step = 'header-expand';
const header = page.getByRole('button', { name: /توسيع تفاصيل الإضبارة|طيّ تفاصيل الإضبارة/i });
if (await header.isVisible().catch(() => false)) {
    await header.click();
    await wait(1000);
}

step = 'trash';
const trash = page.getByRole('button', { name: 'سلة مهملات الإضبارة' });
if (await trash.isVisible().catch(() => false)) {
    await trash.click();
    await wait(1500);
    await page.keyboard.press('Escape');
}

step = 'decisions-event';
await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('hami-open-decisions-modal', { detail: { executionId: 'console-audit-exec-1' } }));
});
await wait(2000);
await page.keyboard.press('Escape').catch(() => undefined);

step = 'close';
try {
    const dossierClose = page.locator('.fixed.inset-0').getByRole('button', { name: 'إغلاق', exact: true });
    if (await dossierClose.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dossierClose.click({ force: true });
        await wait(1500);
    }
} catch {
    /* dossier may already be closed */
}

await browser.close();

const filtered = messages.filter((m) => {
    const t = m.type;
    if (t === 'error' || t === 'warning' || t === 'warn') return true;
    if (t === 'log' || t === 'info') {
        return /React|Warning|Error|deprecated|key prop|Cannot update|not a function|ReferenceError/i.test(m.text);
    }
    return false;
});

console.log('=== PAGE ERRORS ===');
for (const e of pageErrors) console.log(`[${e.step}] ${e.message}`);

console.log('\n=== WARNINGS / ERRORS ===');
for (const m of filtered) console.log(`[${m.step}] [${m.type}] ${m.text.slice(0, 500)}`);

console.log('\ntotal:', messages.length, 'filtered:', filtered.length);

process.exit(filtered.length + pageErrors.length > 0 ? 1 : 0);
