/**
 * E2E — مسارات التنفيذ الحديثة المبنية على مخزن التنفيذ الحالي.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { gotoLawyerHomeE2E } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { seedSyncedExecutionStorage } from './helpers/executionStorageFixtures';
import {
    closeExecutionDossierE2E,
    openExecutionArchiveConfirmFromCard,
    openExecutionTrashConfirmFromCard,
} from './helpers/executionE2EFixtures';
import {
    openExecutionArchiveFromHome,
    openExecutionDossierByRowText,
    clickNativeElement,
} from './helpers/executionE2EBoot';

const EXECUTION_ROW_TEXT = /بلوب حيّ E2E|2026\/تنفيذ\/880/;

async function dismissRepositoryIfBlocking(page: Page): Promise<void> {
    const modal = page.getByTestId('smart-repository-modal');
    const isVisible = await modal.isVisible().catch(() => false);
    if (!isVisible) return;

    const ariaHidden = await modal.getAttribute('aria-hidden').catch(() => null);
    if (ariaHidden === 'true') return;

    const closeButton = page.getByTestId('smart-repository-close');
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true }).catch(() => undefined);
    } else {
        await page.keyboard.press('Escape').catch(() => undefined);
    }

    await expect(async () => {
        const stillVisible = await modal.isVisible().catch(() => false);
        if (!stillVisible) return;
        const hiddenState = await modal.getAttribute('aria-hidden').catch(() => null);
        expect(hiddenState === 'true').toBeTruthy();
    }).toPass({ timeout: 10_000 });
}

async function bootExecutionWorkspace(page: Page): Promise<void> {
    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await seedSyncedExecutionStorage(page);
    await resetExecutionWorkspace(page);
}

async function resetExecutionWorkspace(page: Page): Promise<void> {
    await page.keyboard.press('Escape').catch(() => undefined);
    const dossier = page.getByTestId('execution-dashboard-dossier');
    if (await dossier.isVisible().catch(() => false)) {
        await closeExecutionDossierE2E(page).catch(() => undefined);
    }
    await expect(async () => {
        await gotoLawyerHomeE2E(page);
        await expect(page.getByTestId('hub-archive-execution')).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 90_000 });
    await ensureLawyerDashboard(page);
    await dismissProductivityBlockers(page);
    await dismissRepositoryIfBlocking(page);
}

async function openExecutionArchive(page: Page): Promise<void> {
    await dismissRepositoryIfBlocking(page);
    await openExecutionArchiveFromHome(page);
}

async function expectExecutionArchiveReady(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.getByTestId('execution-archive-shell')).toHaveAttribute('aria-hidden', 'false', {
            timeout: 10_000,
        });
        await expect(page.getByTestId('execution-archive-search')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(EXECUTION_ROW_TEXT).first()).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
}

async function openFirstExecutionDossier(page: Page): Promise<void> {
    await expect(page.getByTestId('execution-dashboard-dossier')).toHaveCount(0, { timeout: 10_000 });
    await openExecutionDossierByRowText(page, EXECUTION_ROW_TEXT);
    await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 15_000 });
}

async function expectLawyerHomeReady(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
    await dismissRepositoryIfBlocking(page);
}

async function closeExecutionDossier(page: Page): Promise<void> {
    await closeExecutionDossierE2E(page);
    await expectLawyerHomeReady(page);
}

test.describe('Execution Dashboard E2E', () => {
    test.describe.configure({ timeout: 120_000, mode: 'serial' });

    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext();
        page = await context.newPage();
        await bootExecutionWorkspace(page);
    });

    test.beforeEach(async () => {
        await resetExecutionWorkspace(page);
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('يفتح مخزن التنفيذ من الشاشة الرئيسية', async () => {
        await openExecutionArchive(page);
        await expectExecutionArchiveReady(page);
    });

    test('يفتح إضبارة التنفيذ المزوعة ويعرض المذكرة', async () => {
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);
        await expect(page.getByTestId('execution-dashboard-dossier')).toBeVisible();
    });

    test('إغلاق الإضبارة يعيد المستخدم إلى لوحة المحامي', async () => {
        await openExecutionArchive(page);
        await openFirstExecutionDossier(page);
        await closeExecutionDossier(page);
    });

    test('لوحة الفلاتر تفتح من شريط البحث', async () => {
        await openExecutionArchive(page);
        const panel = page.getByTestId('execution-archive-shell').getByTestId('execution-archive-filters-panel');
        await expect(panel).toHaveAttribute('aria-hidden', 'true');
        const filtersToggle = page
            .getByTestId('execution-archive-shell')
            .getByTestId('execution-archive-filters-toggle');
        await expect(async () => {
            if ((await panel.getAttribute('aria-hidden')) !== 'false') {
                await clickNativeElement(filtersToggle);
            }
            await expect(panel).toHaveAttribute('aria-hidden', 'false', { timeout: 3_000 });
        }).toPass({ timeout: 20_000 });
        await expect(page.getByTestId('execution-archive-filter-civil')).toBeVisible({ timeout: 8_000 });
    });

    test('التبديل إلى الأرشيف يصفر البحث ويخفي زر الإضافة', async () => {
        await openExecutionArchive(page);
        const shell = page.getByTestId('execution-archive-shell');
        const archiveSearch = shell.getByTestId('execution-archive-search');
        const archivedTab = shell.getByTestId('executions-view-archived');
        await archiveSearch.fill('اختبار', { force: true });
        await expect(async () => {
            if ((await archivedTab.getAttribute('aria-pressed')) !== 'true') {
                await clickNativeElement(archivedTab);
            }
            await expect(archivedTab).toHaveAttribute('aria-pressed', 'true');
            await expect(archiveSearch).toHaveValue('');
            await expect(page.getByTestId('executions-add-new')).toBeHidden();
        }).toPass({ timeout: 20_000 });
    });

    test('إجراء الأرشفة يفتح نافذة التأكيد', async () => {
        await openExecutionArchive(page);
        const dialog = await openExecutionArchiveConfirmFromCard(page);
        await expect(page.getByTestId('execution-archive-confirm-cancel')).toBeVisible();
        await page.getByTestId('execution-archive-confirm-cancel').click({ force: true });
        await expect(dialog).toBeHidden({ timeout: 8_000 });
    });

    test('إجراء السلة يفتح نافذة التأكيد', async () => {
        await openExecutionArchive(page);
        const trashDialog = await openExecutionTrashConfirmFromCard(page);
        await expect(page.getByTestId('execution-trash-confirm-cancel')).toBeVisible();
        await page.getByTestId('execution-trash-confirm-cancel').click({ force: true });
        await expect(trashDialog).toBeHidden({ timeout: 8_000 });
    });
});
