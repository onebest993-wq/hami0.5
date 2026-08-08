/**
 * E2E: 10 مسارات حرجة — ExecutionDashboard (بدون ReferenceError / GlobalErrorBoundary)
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
    collectFatalBootPageErrors,
    bootToLawyerHome,
} from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { seedExecutionStorageForFile } from './helpers/executionStorageFixtures';
import {
    closeExecutionDossierE2E,
    expectExecutionArchiveConfirmDialog,
    expectExecutionTrashConfirmHeading,
} from './helpers/executionE2EFixtures';

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

async function bootLawyerShell(page: Page) {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await seedExecutionStorageForFile(page, MINIMAL_EXECUTION_FILE);

    await page.goto('/');
    await ensureLawyerDashboard(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);

    return collectFatalBootPageErrors(pageErrors);
}

async function openExecutionArchive(page: Page) {
    await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
        timeout: 25_000,
    });
}

/** بعد إغلاق الإضبارة تبقى طبقة مخزن التنفيذ (وليس بطاقة Home) */
async function ensureExecutionDossierClosed(page: Page) {
    const dossier = page.getByTestId('execution-dashboard-dossier');
    await expect(async () => {
        const count = await dossier.count();
        if (count === 0) return;
        const visible = await dossier.isVisible().catch(() => false);
        expect(visible).toBeFalsy();
    }).toPass({ timeout: 25_000 });
}

async function openFirstExecutionDossier(page: Page) {
    await ensureExecutionDossierClosed(page);
    const row = page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first();
    await expect(row).toBeVisible({ timeout: 25_000 });
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page.getByTestId('execution-dashboard-dossier')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('execution-followup-memo')).toBeVisible({ timeout: 25_000 });
}

async function closeExecutionDossier(page: Page) {
    await closeExecutionDossierE2E(page);
    await openExecutionArchive(page);
}

function assertNoScopeReferenceErrors(pageErrors: string[]) {
    const fatal = pageErrors.filter(
        (msg) =>
            /is not defined/i.test(msg) ||
            /ReferenceError/i.test(msg) ||
            (/Micro|activeTab|Tag/i.test(msg) && /not defined/i.test(msg)),
    );
    expect(fatal).toEqual([]);
}

test.describe('Execution critical paths', () => {
    test.describe.configure({ timeout: 120_000, mode: 'serial' });
    test('1 — lawyer boot without scope ReferenceError', async ({ page }) => {
        const errors = await bootLawyerShell(page);
        assertNoScopeReferenceErrors(errors);
        await expect(page.locator('text=ReferenceError')).toHaveCount(0);
    });

    test('2 — open execution archive hub', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);
    });

    test('3 — open execution dossier without GlobalErrorBoundary', async ({ page }) => {
        const errors = await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);

        await expect(page.getByText(/ReferenceError/i)).toHaveCount(0, { timeout: 15_000 });
        await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 15_000 });
        assertNoScopeReferenceErrors(errors);
    });

    test('4 — dossier content smoke after open', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);
        await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 20_000 });
        await expect(page.getByText(/ReferenceError/i)).toHaveCount(0, { timeout: 10_000 });
    });

    test('5 — reload dossier stays stable', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/ReferenceError/i)).toHaveCount(0, { timeout: 10_000 });
    });

    test('6 — hami-open-decisions-modal event does not throw', async ({ page }) => {
        const errors = await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);

        await page.evaluate((id) => {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: { executionId: id, tab: 'current' },
                }),
            );
        }, E2E_EXEC_ID);

        await page.waitForTimeout(500);
        assertNoScopeReferenceErrors(errors);
    });

    test('7 — financial hub ledger event does not throw', async ({ page }) => {
        const errors = await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);

        await page.evaluate((id) => {
            window.dispatchEvent(
                new CustomEvent('hami-open-financial-hub-ledger', {
                    detail: { executionId: id },
                }),
            );
        }, E2E_EXEC_ID);

        await page.waitForTimeout(500);
        assertNoScopeReferenceErrors(errors);
    });

    test('8 — unified execution modal can be toggled via store event path', async ({ page }) => {
        const errors = await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);

        await page.evaluate((id) => {
            window.dispatchEvent(
                new CustomEvent('hami-open-seized-property-init', {
                    detail: { executionId: id, decisionId: 'dec-e2e-1', subject: 'عقار' },
                }),
            );
        }, E2E_EXEC_ID);

        await page.waitForTimeout(400);
        assertNoScopeReferenceErrors(errors);
    });

    test('9 — close dossier returns to archive layer', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);

        await closeExecutionDossier(page);
        await expect(page.getByText(/ReferenceError/i)).toHaveCount(0);
    });

    test('10 — second dossier open cycle', async ({ page }) => {
        test.setTimeout(60_000);
        const errors = await bootLawyerShell(page);
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);
        await closeExecutionDossier(page);
        await openFirstExecutionDossier(page);
        await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 20_000 });
        assertNoScopeReferenceErrors(errors);
    });

    test('11 — archive search deck and filters toggle', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await expect(page.getByTestId('execution-archive-search')).toBeVisible();
        const panel = page.getByTestId('execution-archive-filters-panel');
        await expect(panel).toHaveAttribute('aria-hidden', 'true');

        await page.getByTestId('execution-archive-filters-toggle').click();
        await expect(panel).toHaveAttribute('aria-hidden', 'false');
        await expect(page.getByTestId('execution-archive-filter-civil')).toBeVisible();
    });

    test('12 — lifecycle tabs switch and reset search', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await page.getByTestId('execution-archive-search').fill('اختبار');
        await page.getByTestId('executions-view-archived').click();
        // العنوان H2 قد يبقى عاماً؛ عقد الأرشيف المؤكد: التبويب النشط + تفريغ البحث
        await expect(page.getByTestId('executions-view-archived')).toBeVisible();
        await expect(page.getByTestId('execution-archive-search')).toHaveValue('');
        const archiveState = page
            .getByRole('heading', { name: /مخزن أرشيف الإضابير التنفيذية|مخزن الأرشيف فارغ/i })
            .or(page.getByPlaceholder(/مخزن الأرشيف/i));
        await expect(archiveState.first()).toBeVisible({ timeout: 8_000 });
    });

    test('13 — FAB visible on active tab only', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await expect(page.getByTestId('executions-add-new')).toBeVisible();
        await page.getByTestId('executions-view-archived').click();
        await expect(page.getByTestId('executions-add-new')).toBeHidden();
    });

    test('14 — execution card archive opens confirm dialog', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await page.getByTestId('execution-smart-card-archive').first().click();
        const dialog = await expectExecutionArchiveConfirmDialog(page);
        await dialog.getByRole('button', { name: /إلغاء/i }).click();
        await expect(dialog).toBeHidden({ timeout: 8_000 });
    });

    test('15 — execution card trash opens confirm dialog', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await page.getByTestId('execution-smart-card-trash').first().click();
        await expectExecutionTrashConfirmHeading(page);
        await page.getByRole('button', { name: /إلغاء/i }).click();
        await expect(page.getByRole('dialog', { name: /تأكيد النقل إلى سلة المهملات/i })).toBeHidden({
            timeout: 8_000,
        });
    });
});
