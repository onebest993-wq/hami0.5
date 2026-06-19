/**
 * E2E — البحث الشامل: فتح، استعلام، نتائج، تنقل، Escape، Ctrl+K.
 */
import { test, expect } from '@playwright/test';
import {
    ensureLawyerDashboard,
    seedLawyerFiles,
    E2E_CIVIL_FILE_ID,
} from './helpers/civilLawsuitFixtures';
import { dismissBlockingOverlays } from './helpers/notificationFixtures';

const SEARCH_QUERY = '100/2026';

async function openGlobalSearch(page: import('@playwright/test').Page): Promise<void> {
    await page.getByTestId('header-search-trigger').click({ timeout: 15_000 });
    await expect(page.getByTestId('global-search-overlay')).toBeVisible({ timeout: 12_000 });
    await expect(page.getByTestId('global-search-input')).toBeVisible({ timeout: 8_000 });
}

test.describe('البحث الشامل', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
    });

    test('يفتح من زر الهيدر ويعرض حقل البحث', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await openGlobalSearch(page);
        await expect(page.getByTestId('global-search-input')).toBeFocused({ timeout: 5_000 });
    });

    test('Ctrl+K يفتح البحث', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await page.keyboard.press('Control+K');
        await expect(page.getByTestId('global-search-overlay')).toBeVisible({ timeout: 12_000 });
    });

    test('Escape يغلق البحث', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await openGlobalSearch(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 5_000 });
    });

    test('استعلام بدون نتائج', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await openGlobalSearch(page);
        await page.getByTestId('global-search-input').fill('zzzzzz-no-match-e2e-99999');
        await expect(page.getByTestId('global-search-no-results')).toBeVisible({ timeout: 20_000 });
    });

    test('يجد الدعوى المزروعة ويفتح الإضبارة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissBlockingOverlays(page);

        await openGlobalSearch(page);
        await page.getByTestId('global-search-input').fill(SEARCH_QUERY);

        await expect(page.getByTestId('global-search-results')).toBeVisible({ timeout: 25_000 });
        await expect(page.getByTestId('global-search-result-0')).toBeVisible({ timeout: 8_000 });

        await page.getByTestId('global-search-result-0').click();

        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 8_000 });
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });

        const activeFileId = await page.evaluate(() => {
            const el = document.querySelector('[data-testid="smart-file-dossier"]');
            return el?.getAttribute('data-file-id') ?? null;
        });
        if (activeFileId) {
            expect(Number(activeFileId)).toBe(E2E_CIVIL_FILE_ID);
        }
    });
});
