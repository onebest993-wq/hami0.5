/**
 * E2E: 10 مسارات حرجة — ExecutionDashboard (بدون ReferenceError / GlobalErrorBoundary)
 */
import { test, expect, type Page } from '@playwright/test';

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

async function seedExecutionFiles(page: Page) {
    await page.evaluate(
        ({ storageKey, file }) => {
            const payload = JSON.stringify([file]);
            const keys = [
                storageKey,
                'hami-execution-files',
                'execution_files',
                'lawyer_execution_files',
            ];
            for (const k of keys) {
                localStorage.setItem(k, payload);
            }
        },
        { storageKey: EXECUTION_FILES_KEY, file: MINIMAL_EXECUTION_FILE },
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await devBypass.click();
    }
    await expect(page.getByText(/جاري التحميل/i).first())
        .toBeHidden({ timeout: 25_000 })
        .catch(() => undefined);
}

async function bootLawyerShell(page: Page) {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

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

    await seedExecutionFiles(page);

    return pageErrors;
}

async function openExecutionArchive(page: Page) {
    await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
        timeout: 25_000,
    });
}

/** بعد إغلاق الإضبارة تبقى طبقة مخزن التنفيذ (وليس بطاقة Home) */
async function expectExecutionArchiveLayer(page: Page) {
    await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
        timeout: 25_000,
    });
    await expect(page.getByTestId('execution-archive-search')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first()).toBeVisible({
        timeout: 25_000,
    });
}

async function waitForExecutionDossierClosed(page: Page) {
    await expect(page.getByTestId('execution-dashboard-dossier')).toHaveCount(0, { timeout: 25_000 });
}

async function openFirstExecutionDossier(page: Page) {
    await waitForExecutionDossierClosed(page);
    const row = page.getByText(/مديرية تنفيذ E2E|2026\/تنفيذ\/101/).first();
    await expect(row).toBeVisible({ timeout: 25_000 });
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page.getByTestId('execution-dashboard-dossier')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('execution-followup-memo')).toBeVisible({ timeout: 25_000 });
}

async function closeExecutionDossier(page: Page) {
    const dossier = page.getByTestId('execution-dashboard-dossier');
    if (await dossier.isVisible().catch(() => false)) {
        const closeBtn = dossier.getByTestId('execution-dashboard-close');
        if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
        } else {
            await page.keyboard.press('Escape');
        }
        await waitForExecutionDossierClosed(page);
    }
    await expectExecutionArchiveLayer(page);
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
        await expect(page.getByRole('heading', { name: /مخزن أرشيف الإضابير التنفيذية/i })).toBeVisible();
        await expect(page.getByTestId('execution-archive-search')).toHaveValue('');
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
        const dialog = page.getByTestId('execution-archive-confirm-dialog');
        await expect(dialog).toBeVisible({ timeout: 8_000 });
        await expect(dialog.getByRole('heading', { name: /تأكيد الأرشفة/i })).toBeVisible();
        await dialog.getByRole('button', { name: /إلغاء/i }).click();
        await expect(dialog).toBeHidden({ timeout: 8_000 });
    });

    test('15 — execution card trash opens confirm dialog', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await page.getByTestId('execution-smart-card-trash').first().click();
        await expect(page.getByRole('heading', { name: /تأكيد النقل إلى سلة المهملات/i })).toBeVisible({
            timeout: 8_000,
        });
        await page.getByRole('button', { name: /إلغاء/i }).click();
        await expect(page.getByRole('heading', { name: /تأكيد النقل إلى سلة المهملات/i })).toBeHidden({
            timeout: 8_000,
        });
    });
});
