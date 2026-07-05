/**
 * E2E — مسارات التنفيذ الحديثة المبنية على مخزن التنفيذ الحالي.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { seedSyncedExecutionStorage } from './helpers/executionStorageFixtures';

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
    await page.goto('/');
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('hub-archive-execution')).toBeVisible({ timeout: 25_000 });
    await ensureLawyerDashboard(page);
    await dismissProductivityBlockers(page);
    await dismissRepositoryIfBlocking(page);
}

async function openExecutionArchive(page: Page): Promise<void> {
    await dismissRepositoryIfBlocking(page);
    await page.getByTestId('hub-archive-execution').scrollIntoViewIfNeeded();
    await page.getByTestId('hub-archive-execution').click({ force: true });
    await expect(page.getByTestId('execution-archive-shell')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
        timeout: 25_000,
    });
}

async function expectExecutionArchiveReady(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.getByTestId('execution-archive-shell')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('execution-archive-search')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(EXECUTION_ROW_TEXT).first()).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
}

async function openFirstExecutionDossier(page: Page): Promise<void> {
    await expect(page.getByTestId('execution-dashboard-dossier')).toHaveCount(0, { timeout: 10_000 });
    const row = page.getByText(EXECUTION_ROW_TEXT).first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page.getByTestId('execution-dashboard-dossier')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/لم يتم العثور على بيانات التنفيذ/i)).toBeHidden({ timeout: 15_000 });
}

async function expectLawyerHomeReady(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
    await dismissRepositoryIfBlocking(page);
}

async function closeExecutionDossier(page: Page): Promise<void> {
    const dossier = page.getByTestId('execution-dashboard-dossier');
    const closeButton = dossier.getByTestId('execution-dashboard-close');
    await closeButton.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true }).catch(() => undefined);
    }
    await expect(async () => {
        const count = await dossier.count();
        if (count === 0) return;

        const visible = await dossier.isVisible().catch(() => false);
        if (visible) {
            await page.keyboard.press('Escape').catch(() => undefined);
        }

        const nextCount = await dossier.count();
        if (nextCount === 0) return;

        const nextVisible = await dossier.isVisible().catch(() => false);
        expect(nextVisible).toBeFalsy();
    }).toPass({ timeout: 30_000 });
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
        const panel = page.getByTestId('execution-archive-filters-panel');
        await expect(panel).toHaveAttribute('aria-hidden', 'true');
        await page.getByTestId('execution-archive-filters-toggle').click();
        await expect(panel).toHaveAttribute('aria-hidden', 'false');
        await expect(page.getByTestId('execution-archive-filter-civil')).toBeVisible();
    });

    test('التبديل إلى الأرشيف يصفر البحث ويخفي زر الإضافة', async () => {
        await openExecutionArchive(page);
        await page.getByTestId('execution-archive-search').fill('اختبار');
        await page.getByTestId('executions-view-archived').click();
        await expect(page.getByTestId('execution-archive-search')).toHaveValue('');
        await expect(page.getByTestId('executions-add-new')).toBeHidden();
    });

    test('إجراء الأرشفة يفتح نافذة التأكيد', async () => {
        await openExecutionArchive(page);
        await page.getByTestId('execution-smart-card-archive').first().click();
        const dialog = page.getByTestId('execution-archive-confirm-dialog');
        await expect(dialog).toBeVisible({ timeout: 8_000 });
        await expect(dialog.getByRole('heading', { name: /تأكيد الأرشفة/i })).toBeVisible();
        await dialog.getByRole('button', { name: /إلغاء/i }).click();
        await expect(dialog).toBeHidden({ timeout: 8_000 });
    });

    test('إجراء السلة يفتح نافذة التأكيد', async () => {
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
