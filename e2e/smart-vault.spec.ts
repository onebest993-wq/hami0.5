/**
 * E2E — مخزن الوسائط (dockVault → المستودع الموحّد): بحث، تصنيف، عرض، Escape.
 */
import { test, expect, type Page } from '@playwright/test';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { buildE2eVaultDoc, clearVaultStorage, seedVaultDocs } from './helpers/vaultFixtures';
import { openVaultMediaFromDock, expectRepositoryClosed, pressRepositoryEscape, clickRepositoryChrome, fillControlledTextInput, visibleRepositoryModal } from './helpers/repositoryFixtures';

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
        await expect(modal.getByRole('heading', { name: 'المستودع' })).toBeVisible();
        await expect(modal.getByTestId('repository-feed-empty-all')).toBeVisible();
    });

    test('يعرض الوثائق المزروعة ويبحث فيها', async ({ page }) => {
        await openVaultWithDocs(page);
        const modal = visibleRepositoryModal(page);
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 10_000 });

        await fillControlledTextInput(modal.getByTestId('smart-vault-search'), 'لا توجد');
        await expect(modal.getByTestId('repository-feed-empty-all')).toBeVisible({ timeout: 8_000 });

        await fillControlledTextInput(modal.getByTestId('smart-vault-search'), E2E_DOC_TITLE);
        await expect(modal.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 8_000 });
    });

    test('يُبدّل تخطيط عرض البطاقات', async ({ page }) => {
        await openVaultWithDocs(page);
        const visible = visibleRepositoryModal(page);
        await expect(visible.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });

        const panel = visible.getByTestId('repository-feed-panel-all');
        await expect(panel).toBeVisible({ timeout: 15_000 });
        const initialView = (await panel.getAttribute('data-repository-view')) ?? 'grid';
        const alternateLayout = initialView === 'grid' ? 'list' : 'grid';
        await clickRepositoryChrome(visible.getByTestId(`repository-layout-${alternateLayout}`));
        await expect(visible).toBeVisible({ timeout: 8_000 });
        await expect(visible.getByTestId('repository-feed-panel-all')).toHaveAttribute(
            'data-repository-view',
            alternateLayout,
            { timeout: 8_000 },
        );
    });

    test('يضيف تصنيفاً مخصصاً ويُصفّي به', async ({ page }) => {
        const docs = [
            buildE2eVaultDoc({ customCategory: E2E_CATEGORY }),
            buildE2eVaultDoc({ id: 'e2e-vault-doc-2', title: 'وثيقة أخرى', customCategory: 'أخرى' }),
        ];
        const modal = await openVaultWithDocs(page, docs);
        await clickRepositoryChrome(modal.getByTestId('repository-classification-toggle'));
        const classPanel = page.getByTestId('repository-classification-panel');
        await expect(classPanel).toBeVisible();
        await classPanel.getByTestId('smart-vault-add-category').click();
        await classPanel.getByTestId('smart-vault-new-category').fill('تصنيف جديد');
        await classPanel.getByTestId('smart-vault-new-category-save').click();
        await expect(classPanel.getByTestId('smart-vault-filter-تصنيف جديد')).toBeVisible({
            timeout: 8_000,
        });

        await classPanel.getByTestId(`smart-vault-filter-${E2E_CATEGORY}`).click();
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
        await clickRepositoryChrome(modal.getByTestId('smart-repository-close'));
        try {
            await expectRepositoryClosed(page);
        } catch {
            await pressRepositoryEscape(page);
            await expectRepositoryClosed(page);
        }

        const modal2 = await openVaultMediaFromDock(page);
        await expect(modal2.getByText(E2E_DOC_TITLE)).toBeVisible({ timeout: 10_000 });
    });
});
