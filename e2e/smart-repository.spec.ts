/**
 * E2E — المستودع الذكي الموحّد: فتح، shell، perf، إغلاق.
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { buildE2eVaultDoc, clearVaultStorage, seedVaultDocs } from './helpers/vaultFixtures';
import {
    openRepositoryFromDock,
    closeRepositoryIfOpen,
    readRepositoryOpenToInteractiveMs,
    E2E_REPOSITORY_COLD_OPEN_MS,
    E2E_REPOSITORY_CACHED_OPEN_MS,
} from './helpers/repositoryFixtures';

test.describe('المستودع الذكي الموحّد', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await clearVaultStorage(page);
        await seedLawyerFiles(page);
    });

    test('يفتح من الرئيسية ويعرض shell فوراً', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await expect(modal.getByText('المستودع الذكي')).toBeVisible();
        await expect(modal.getByTestId('repository-unified-feed')).toBeVisible();
        await expect(modal.getByTestId('repository-filter-all')).toBeVisible();
    });

    test('يغلق بـ Escape ويعاد فتحه', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden({ timeout: 8_000 });

        await closeRepositoryIfOpen(page);
        await openRepositoryFromDock(page);
        await expect(page.getByTestId('smart-repository-modal')).toBeVisible();
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openRepositoryFromDock(page);

        const perfMs = await readRepositoryOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:repository:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_REPOSITORY_COLD_OPEN_MS);
    });

    test('الفتح مع cache وثائق ضمن حد زمني', async ({ page }) => {
        await seedVaultDocs(page, [buildE2eVaultDoc()]);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const modal = await openRepositoryFromDock(page);
        await expect(modal.getByTestId('repository-feed-vault-e2e-vault-doc-1')).toBeVisible({
            timeout: 10_000,
        });

        const perfMs = await readRepositoryOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع cache وثائق').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_REPOSITORY_CACHED_OPEN_MS);
    });
});
