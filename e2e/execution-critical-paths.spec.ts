/**
 * E2E: 10 مسارات حرجة — ExecutionDashboard (بدون ReferenceError / GlobalErrorBoundary)
 */
import { test, expect, type Page } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import {
    collectFatalBootPageErrors,
    gotoLawyerHomeE2E,
} from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { seedExecutionStorageForFile } from './helpers/executionStorageFixtures';
import {
    closeExecutionDossierE2E,
    openExecutionArchiveConfirmFromCard,
    openExecutionTrashConfirmFromCard,
} from './helpers/executionE2EFixtures';
import { openExecutionArchiveFromHome, openExecutionDossierByRowText, clickNativeElement } from './helpers/executionE2EBoot';

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

    await expect(async () => {
        await gotoLawyerHomeE2E(page);
    }).toPass({ timeout: 90_000 });
    await dismissProductivityBlockers(page);

    return collectFatalBootPageErrors(pageErrors);
}

async function openExecutionArchive(page: Page) {
    await openExecutionArchiveFromHome(page);
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
    await openExecutionDossierByRowText(page, /مديرية تنفيذ E2E|2026\/تنفيذ\/101/);
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
    test.describe.configure({ timeout: 120_000 });
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
        const shell = page.getByTestId('execution-archive-shell');
        const panel = shell.getByTestId('execution-archive-filters-panel');
        await expect(panel).toHaveAttribute('aria-hidden', 'true');

        const filtersToggle = shell.getByTestId('execution-archive-filters-toggle');
        await expect(filtersToggle).toBeAttached({ timeout: 10_000 });
        await expect(async () => {
            if ((await panel.getAttribute('aria-hidden')) !== 'false') {
                await clickNativeElement(filtersToggle);
            }
            await expect(panel).toHaveAttribute('aria-hidden', 'false', { timeout: 3_000 });
        }).toPass({ timeout: 20_000 });
        await expect(page.getByTestId('execution-archive-filter-civil')).toBeVisible({ timeout: 8_000 });
    });

    test('12 — lifecycle tabs switch and reset search', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        const shell = page.getByTestId('execution-archive-shell');
        const archiveSearch = shell.getByTestId('execution-archive-search');
        await expect(shell).toHaveAttribute('data-open', 'true', { timeout: 20_000 });
        await archiveSearch.fill('اختبار', { force: true });
        const archivedTab = shell.getByTestId('executions-view-archived');
        await expect(async () => {
            if ((await archivedTab.getAttribute('aria-pressed')) !== 'true') {
                await clickNativeElement(archivedTab);
            }
            await expect(archivedTab).toHaveAttribute('aria-pressed', 'true');
            await expect(archiveSearch).toHaveValue('');
        }).toPass({ timeout: 20_000 });
    });

    test('13 — FAB visible on active tab only', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await expect(page.getByTestId('executions-add-new')).toBeVisible({ timeout: 20_000 });
        await clickNativeElement(
            page.getByTestId('execution-archive-shell').getByTestId('executions-view-archived'),
        );
        await expect(page.getByTestId('executions-add-new')).toBeHidden();
    });

    test('14 — execution card archive opens confirm dialog', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        const dialog = await openExecutionArchiveConfirmFromCard(page);
        await expect(page.getByTestId('execution-archive-confirm-cancel')).toBeVisible();
        await page.getByTestId('execution-archive-confirm-cancel').click({ force: true });
        await expect(dialog).toBeHidden({ timeout: 8_000 });
    });

    test('15 — execution card trash opens confirm dialog', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        const trashDialog = await openExecutionTrashConfirmFromCard(page);
        await expect(page.getByTestId('execution-trash-confirm-cancel')).toBeVisible();
        await page.getByTestId('execution-trash-confirm-cancel').click({ force: true });
        await expect(trashDialog).toBeHidden({ timeout: 8_000 });
    });

    test('16 — archive FAB opens creation shell and closes', async ({ page }) => {
        await bootLawyerShell(page);
        await openExecutionArchive(page);

        await expect(page.getByTestId('executions-add-new')).toBeVisible({ timeout: 20_000 });
        await clickNativeElement(page.getByTestId('executions-add-new'));
        await expect(page.getByTestId('execution-creation-title')).toBeVisible({ timeout: 20_000 });
        await clickNativeElement(page.getByTestId('execution-creation-close'));
        await expect(page.getByTestId('execution-creation-title')).toBeHidden({ timeout: 8_000 });
        await expect(async () => {
            await expect(page.getByTestId('execution-archive-shell')).toHaveAttribute('data-open', 'true');
            await expect(page.getByTestId('execution-archive-shell')).toBeVisible();
        }).toPass({ timeout: 8_000 });
    });
});
