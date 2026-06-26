/**
 * E2E: لا تحذيرات/أخطاء كونسول أثناء مسارات التنفيذ الحرجة.
 */
import { test, expect, type Page } from '@playwright/test';

const EXECUTION_FILES_KEY = 'executionFiles';
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
        if (m.type === 'error' || m.type === 'warning' || m.type === 'warn') return true;
        return /React|Warning|Error|not a function|ReferenceError|deprecated/i.test(m.text);
    });
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(bad, `console noise: ${bad.map((m) => `[${m.type}] ${m.text}`).join('\n')}`).toEqual([]);
}

async function bootLawyerWithExecution(page: Page) {
    await page.addInitScript(
        ({ storageKey, file }) => {
            const payload = JSON.stringify([file]);
            for (const k of [storageKey, 'hami-execution-files', 'execution_files', 'lawyer_execution_files']) {
                localStorage.setItem(k, payload);
            }
        },
        { storageKey: EXECUTION_FILES_KEY, file: MINIMAL_EXECUTION_FILE },
    );
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await devBypass.click();
    }
    await expect(page.getByText(/جاري التحميل/i).first())
        .toBeHidden({ timeout: 25_000 })
        .catch(() => undefined);
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

        assertConsoleClean(messages, pageErrors);
    });
});
