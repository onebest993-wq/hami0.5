/**
 * E2E — مخزن الوسائط (dockVault → المستودع الموحّد): بحث، تصنيف، عرض، Escape.
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { buildE2eVaultDoc, clearVaultStorage, seedVaultDocs } from './helpers/vaultFixtures';
import { openVaultMediaFromDock } from './helpers/repositoryFixtures';

const E2E_DOC_TITLE = 'وثيقة E2E مخزن';
const E2E_CATEGORY = 'تصنيف E2E';

async function openVaultFromHome(page: Page) {
    return openVaultMediaFromDock(page);
}

test.describe('مخزن الوسائط — المستودع الموحّد', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearVaultStorage(page);
        await seedLawyerFiles(page);
    });

    test('يفتح من الرئيسية ويعرض الحالة الفارغة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openVaultFromHome(page);
        await expect(modal.getByText('المستودع الذكي')).toBeVisible();
        await expect(modal.getByTestId('repository-feed-empty-media')).toBeVisible();
    });

    test('يعرض الوثائق المزروعة ويبحث فيها', async ({ page }) => {
        await seedVaultDocs(page, [buildE2eVaultDoc()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openVaultFromHome(page);
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible();

        await modal.getByTestId('smart-vault-search').fill('لا توجد');
        await expect(modal.getByTestId('repository-feed-empty-media')).toBeVisible({ timeout: 8_000 });

        await modal.getByTestId('smart-vault-search').fill(E2E_DOC_TITLE);
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 8_000 });
    });

    test('يُبدّل تخطيط عرض البطاقات', async ({ page }) => {
        await seedVaultDocs(page, [buildE2eVaultDoc()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openVaultFromHome(page);
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });

        const panel = modal.getByTestId('repository-feed-panel-media');
        const initialView = (await panel.getAttribute('data-repository-view')) ?? 'grid';
        const alternateLayout = initialView === 'grid' ? 'list' : 'grid';
        await modal.getByTestId('repository-view-toggle').click();
        await page.getByTestId(`repository-layout-${alternateLayout}`).click();
        await expect(panel).toHaveAttribute('data-repository-view', alternateLayout, {
            timeout: 5_000,
        });
    });

    test('يضيف تصنيفاً مخصصاً ويُصفّي به', async ({ page }) => {
        await seedVaultDocs(page, [
            buildE2eVaultDoc({ customCategory: E2E_CATEGORY }),
            buildE2eVaultDoc({ id: 'e2e-vault-doc-2', title: 'وثيقة أخرى', customCategory: 'أخرى' }),
        ]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openVaultFromHome(page);
        await modal.getByTestId('smart-vault-add-category').click();
        await modal.getByTestId('smart-vault-new-category').fill('تصنيف جديد');
        await modal.getByTestId('smart-vault-new-category-save').click();
        await expect(modal.getByTestId('smart-vault-filter-تصنيف جديد')).toBeVisible({ timeout: 8_000 });

        await modal.getByTestId(`smart-vault-filter-${E2E_CATEGORY}`).click();
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible();
        await expect(modal.getByText('وثيقة أخرى')).toBeHidden();
    });

    test('Escape يغلق المستودع', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openVaultFromHome(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('smart-repository-modal')).toBeHidden({ timeout: 5_000 });
    });

    test('إعادة الفتح تحافظ على الوثائق', async ({ page }) => {
        await seedVaultDocs(page, [buildE2eVaultDoc()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openVaultFromHome(page);
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 10_000 });
        await modal.getByTestId('smart-repository-close').click();
        await expect(page.getByTestId('smart-repository-modal')).toBeHidden({ timeout: 5_000 });

        const modal2 = await openVaultFromHome(page);
        await expect(modal2.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 10_000 });
    });
});
