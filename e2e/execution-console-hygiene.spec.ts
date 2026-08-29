/**
 * E2E: لا تحذيرات/أخطاء كونسول أثناء مسارات التنفيذ الحرجة.
 */
import { test, expect, type Page } from '@playwright/test';
import {
    bootExecutionLawyerShell,
    clickNativeElement,
    openExecutionArchiveFromHome,
    openExecutionDossierByRowText,
} from './helpers/executionE2EBoot';

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
        if (/Failed to load resource.*\b404\b/i.test(m.text)) return false;
        if (/Failed to load resource.*\b500\b/i.test(m.text)) return false;
        if (/Failed to load resource.*\b401\b/i.test(m.text)) return false;
        if (/the server responded with a status of 404/i.test(m.text)) return false;
        if (/the server responded with a status of 401/i.test(m.text)) return false;
        if (/dev-api/i.test(m.text)) return false;
        if (m.type === 'error' || m.type === 'warning' || m.type === 'warn') return true;
        return /React|Warning|Error|not a function|ReferenceError|deprecated/i.test(m.text);
    });
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(bad, `console noise: ${bad.map((m) => `[${m.type}] ${m.text}`).join('\n')}`).toEqual([]);
}

test.describe('Execution console hygiene', () => {
    test.setTimeout(120_000);

    test('dossier open — header, trash, decisions — no console errors', async ({ page }) => {
        const { messages, pageErrors } = attachConsoleCollector(page);
        await bootExecutionLawyerShell(page, { executionFile: MINIMAL_EXECUTION_FILE, collectPageErrors: false });
        await openExecutionArchiveFromHome(page);
        await openExecutionDossierByRowText(page, /مديرية تنفيذ E2E|2026\/تنفيذ\/101/);

        const header = page.getByTestId('execution-dossier-header-toggle');
        await expect(header).toBeVisible({ timeout: 20_000 });
        await clickNativeElement(header);
        await page.waitForTimeout(400);

        const trash = page.getByTestId('execution-dossier-trash');
        await expect(trash).toBeVisible({ timeout: 10_000 });
        await clickNativeElement(trash);
        await page.waitForTimeout(600);
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
