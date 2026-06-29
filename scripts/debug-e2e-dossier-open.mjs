/**
 * One-off diagnostic: boot lawyer shell, open archive, click dossier, dump page state.
 */
import { chromium } from '@playwright/test';

const EXECUTION_FILES_KEY = 'executionFiles';
const E2E_EXEC_ID = 'e2e-exec-critical-1';
const MINIMAL_EXECUTION_FILE = {
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

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await page.addInitScript(
    ({ storageKey, file }) => {
        const payload = JSON.stringify([file]);
        for (const k of [storageKey, 'hami-execution-files', 'execution_files', 'lawyer_execution_files']) {
            localStorage.setItem(k, payload);
        }
    },
    { storageKey: EXECUTION_FILES_KEY, file: MINIMAL_EXECUTION_FILE },
);

await page.goto('http://localhost:8080/');
await page.waitForLoadState('domcontentloaded');
const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
if (await devBypass.isVisible({ timeout: 8000 }).catch(() => false)) {
    await devBypass.click();
}
await page.getByTestId('hub-archive-execution').click({ timeout: 25000 });
await page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first().click({ timeout: 25000 });
await page.waitForTimeout(5000);

const bodyText = await page.locator('body').innerText();
const followupCount = await page.getByRole('button', { name: 'محضر المتابعة' }).count();
const loadingCount = await page.getByText(/جاري تحميل/i).count();
const errorCount = await page.getByText(/لم يتم العثور على بيانات التنفيذ/i).count();
const refErrorCount = await page.getByText(/ReferenceError/i).count();

console.log('--- followup button count:', followupCount);
console.log('--- loading text count:', loadingCount);
console.log('--- load error count:', errorCount);
console.log('--- ReferenceError count:', refErrorCount);
console.log('--- body snippet (first 2000 chars) ---');
console.log(bodyText.slice(0, 2000));
console.log('--- console/page errors (last 40) ---');
for (const line of logs.slice(-40)) console.log(line);

await browser.close();
