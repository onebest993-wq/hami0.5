/**
 * E2E — مخزن الوسائط (dockVault → المستودع الموحّد): بحث، تصنيف، عرض، Escape.
 */
import { test, expect, type Page } from '@playwright/test';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { buildE2eVaultDoc, clearVaultStorage, seedVaultDocs } from './helpers/vaultFixtures';
import { openVaultMediaFromDock, expectRepositoryClosed, pressRepositoryEscape } from './helpers/repositoryFixtures';

const E2E_DOC_TITLE = 'وثيقة E2E مخزن';
const E2E_CATEGORY = 'تصنيف E2E';

async function openVaultWithDocs(page: Page, docs = [buildE2eVaultDoc()]) {
    await seedVaultDocs(page, docs);
    return openVaultMediaFromDock(page, docs);
}

test.describe('مخزن الوسائط — المستودع الموحّد', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearVaultStorage(page);
    });

    test('يفتح من الرئيسية ويعرض الحالة الفارغة', async ({ page }) => {
        await openVaultMediaFromDock(page);
        const modal = page.getByTestId('smart-repository-modal');
        await expect(modal.getByText('المستودع الذكي')).toBeVisible();
        await expect(modal.getByTestId('repository-feed-empty-media')).toBeVisible();
    });

    test('يعرض الوثائق المزروعة ويبحث فيها', async ({ page }) => {
        const modal = await openVaultWithDocs(page);
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
        const modal = await openVaultWithDocs(page);
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
        const docs = [
            buildE2eVaultDoc({ customCategory: E2E_CATEGORY }),
            buildE2eVaultDoc({ id: 'e2e-vault-doc-2', title: 'وثيقة أخرى', customCategory: 'أخرى' }),
        ];
        const modal = await openVaultWithDocs(page, docs);
        await modal.getByTestId('smart-vault-add-category').click();
        await modal.getByTestId('smart-vault-new-category').fill('تصنيف جديد');
        await modal.getByTestId('smart-vault-new-category-save').click();
        await expect(modal.getByTestId('smart-vault-filter-تصنيف جديد')).toBeVisible({ timeout: 8_000 });

        await modal.getByTestId(`smart-vault-filter-${E2E_CATEGORY}`).click();
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible();
        await expect(modal.getByText('وثيقة أخرى')).toBeHidden();
    });

    test('Escape يغلق المستودع', async ({ page }) => {
        await openVaultMediaFromDock(page);
        await pressRepositoryEscape(page);
        await expectRepositoryClosed(page);
    });

    test('إعادة الفتح تحافظ على الوثائق', async ({ page }) => {
        const modal = await openVaultWithDocs(page);
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 10_000 });
        await modal.getByTestId('smart-repository-close').click();
        await expectRepositoryClosed(page);

        const modal2 = await openVaultMediaFromDock(page);
        await expect(modal2.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 10_000 });
    });
});
