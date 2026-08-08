/**
 * E2E: لا تحذيرات/أخطاء كونسول أثناء مسارات التنفيذ الحرجة.
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { bootToLawyerHome } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { seedExecutionStorageForFile } from './helpers/executionStorageFixtures';

const E2E_EXEC_ID = 'e2e-console-hygiene-1';

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

type ConsoleEntry = { type: string; text: string };

function attachConsoleCollector(page: Page) {
    const messages: ConsoleEntry[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
        const text = msg.text();
        if (/^\[vite\]/i.test(text)) return;
        if (/Download the React DevTools/i.test(text)) return;
        messages.push({ type: msg.type(), text });
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    return { messages, pageErrors };
}

function assertConsoleClean(messages: ConsoleEntry[], pageErrors: string[]) {
    const bad = messages.filter((m) => {
        if (/Failed to load resource.*\b500\b/i.test(m.text)) return false;
        if (/dev-api/i.test(m.text)) return false;
        if (m.type === 'error' || m.type === 'warning' || m.type === 'warn') return true;
        return /React|Warning|Error|not a function|ReferenceError|deprecated/i.test(m.text);
    });
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(bad, `console noise: ${bad.map((m) => `[${m.type}] ${m.text}`).join('\n')}`).toEqual([]);
}

async function bootLawyerWithExecution(page: Page) {
    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await seedExecutionStorageForFile(page, MINIMAL_EXECUTION_FILE);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);
}

test.describe('Execution console hygiene', () => {
    test('dossier open — header, trash, decisions — no console errors', async ({ page }) => {
        const { messages, pageErrors } = attachConsoleCollector(page);
        await bootLawyerWithExecution(page);

        await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
        await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
            timeout: 25_000,
        });

        const row = page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first();
        await row.click();
        await expect(page.getByRole('button', { name: 'محضر المتابعة' })).toBeVisible({ timeout: 25_000 });

        const header = page.getByRole('button', { name: /توسيع تفاصيل الإضبارة|طيّ تفاصيل الإضبارة/i });
        await header.click();
        await page.waitForTimeout(500);

        await page.getByRole('button', { name: 'سلة مهملات الإضبارة' }).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Escape');

        await page.evaluate(() => {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: { executionId: 'e2e-console-hygiene-1' },
                }),
            );
        });
        await page.waitForTimeout(1500);
        await page.keyboard.press('Escape').catch(() => undefined);

        // خدمات الخلفية (تنبيهات + تقويم + مزامنة) تُطلق بعد idle
        await page.waitForTimeout(6_000);

        assertConsoleClean(messages, pageErrors);
    });
});
