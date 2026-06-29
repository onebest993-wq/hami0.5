/**
 * Capture ALL console when entering execution + lawsuits sections.
 */
import { chromium } from 'playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080/';

const MINIMAL_EXEC = {
    id: 'e2e-console-exec-1',
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

const MINIMAL_LAWSUIT = {
    id: 990_001,
    type: 'lawsuit',
    status: 'active',
    caseNo: '100/2026',
    court: 'محكمة اختبار',
    docType: 'مدنية',
    date: '1/1/2026',
    parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
    history: [],
    notes: [],
    images: [],
    stages: [
        {
            id: 's1',
            name: 'البداءة',
            stageName: 'البداءة',
            status: 'active',
            caseNo: '100/2026',
            court: 'محكمة اختبار',
            parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعi', isClient: true, side: 'right' }],
            timeline: [],
            tasks: [],
        },
    ],
    activeStageIndex: 0,
};

const messages = [];
const pageErrors = [];
let step = 'init';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.addInitScript(({ exec, lawsuit }) => {
    try {
        localStorage.setItem('hami:last-screen', 'lawyer');
        for (const k of ['executionFiles', 'hami-execution-files', 'execution_files', 'lawyer_execution_files']) {
            localStorage.setItem(k, JSON.stringify([exec]));
        }
        localStorage.setItem('lawyer_files', JSON.stringify([lawsuit]));
    } catch {
        /* ignore */
    }
}, { exec: MINIMAL_EXEC, lawsuit: MINIMAL_LAWSUIT });

page.on('console', (msg) => {
    const text = msg.text();
    if (/^\[vite\]/i.test(text)) return;
    messages.push({ type: msg.type(), text, step });
});
page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, step });
});

async function wait(ms) {
    await page.waitForTimeout(ms);
}

step = 'boot';
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 45_000 });
await wait(2000);

const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
if (await devBypass.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await devBypass.click();
    await wait(1500);
}

step = 'execution-archive';
await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
await page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i }).waitFor({ timeout: 25_000 });
await wait(3000);

step = 'execution-dossier';
const execRow = page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first();
await execRow.waitFor({ state: 'visible', timeout: 15_000 });
await execRow.click();
await wait(6000);

step = 'law-reference';
const lawBtn = page.getByTestId('execution-law-reference-open');
if (await lawBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await lawBtn.click();
    await wait(3000);
    await page.keyboard.press('Escape');
    await wait(500);
}

step = 'home';
await page.keyboard.press('Escape');
await wait(500);
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.getByTestId('lawyer-dashboard-ready').waitFor({ state: 'visible', timeout: 45_000 });
await wait(1500);

step = 'lawsuits-workspace';
await page.getByTestId('hub-archive-lawsuit').click({ timeout: 25_000 });
await page.getByTestId('lawsuits-workspace').waitFor({ state: 'visible', timeout: 25_000 });
await wait(4000);

step = 'lawsuit-open';
const lawsuitRow = page.getByText(/100\/2026|مدعي اختبار/).first();
if (await lawsuitRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await lawsuitRow.click();
    await wait(5000);
}

await browser.close();

const interesting = messages.filter((m) => {
    if (m.type === 'log' || m.type === 'info') {
        return /warn|error|Warning|React|ref|key|deprecated|failed|Failed/i.test(m.text);
    }
    return m.type === 'error' || m.type === 'warning' || m.type === 'warn';
});

console.log('=== PAGE ERRORS ===');
for (const e of pageErrors) console.log(`[${e.step}] ${e.message}`);

console.log('\n=== INTERESTING CONSOLE ===');
for (const m of interesting) console.log(`[${m.step}] [${m.type}] ${m.text.slice(0, 600)}`);

console.log('\n=== ALL BY TYPE ===');
const byType = messages.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1;
    return acc;
}, {});
console.log(byType);
console.log('total messages:', messages.length);

if (interesting.length === 0 && pageErrors.length === 0) {
    console.log('No warnings captured in headless run');
}

process.exit(interesting.length + pageErrors.length > 0 ? 1 : 0);
