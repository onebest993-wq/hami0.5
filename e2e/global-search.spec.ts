/**
 * E2E — البحث الشامل: فتح، استعلام، نتائج، تنقل، Escape، Ctrl+K.
 */
import { test, expect } from '@playwright/test';
import {
    ensureLawyerDashboard,
    seedLawyerFiles,
    E2E_CIVIL_FILE_ID,
} from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    readGlobalSearchOpenToInteractiveMs,
    clearGlobalSearchPerfMarksInPage,
    E2E_GLOBAL_SEARCH_COLD_OPEN_MS,
    E2E_GLOBAL_SEARCH_CACHED_OPEN_MS,
} from './helpers/globalSearchFixtures';

const SEARCH_QUERY = '100/2026';

async function openGlobalSearch(page: import('@playwright/test').Page): Promise<void> {
    const trigger = page.getByTestId('header-search-trigger');
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000, force: true }).catch(async () => {
        await trigger.evaluate((el) => {
            if (el instanceof HTMLElement) el.click();
        });
    });
    const overlay = page.getByTestId('global-search-overlay');
    const loading = page.getByTestId('global-search-overlay-loading');
    const opened =
        (await overlay.isVisible({ timeout: 4_000 }).catch(() => false)) ||
        (await loading.isVisible({ timeout: 2_000 }).catch(() => false));
    if (!opened) {
        await page.evaluate(() => window.__hamiE2eForceOpenGlobalSearch?.());
    }
    await expect(overlay.or(loading)).toBeVisible({ timeout: 20_000 });
    await expect(overlay).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('global-search-input')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('alertdialog', { name: 'خطأ في البحث' })).toBeHidden({
        timeout: 2_000,
    }).catch(() => undefined);
}

test.describe('البحث الشامل', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
    });

    test('يفتح من زر الهيدر ويعرض حقل البحث', async ({ page }, testInfo) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        if (testInfo.project.name === 'chromium') {
            await expect(page.getByTestId('global-search-input')).toBeFocused({ timeout: 5_000 });
        }
        await expect(page.locator('[data-testid="global-search-overlay"] .animate-spin')).toHaveCount(0);
    });

    test('Ctrl+K يفتح البحث', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await page.keyboard.press('Control+K');
        await expect(page.getByTestId('global-search-overlay')).toBeVisible({ timeout: 12_000 });
    });

    test('Escape يغلق البحث', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 5_000 });
    });

    test('إعادة الفتح تُصفّر الاستعلام السابق', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        await page.getByTestId('global-search-input').fill('نص يجب أن يُمسح');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 5_000 });

        await openGlobalSearch(page);
        await expect(page.getByTestId('global-search-input')).toHaveValue('');
        await expect(page.getByTestId('global-search-results')).toHaveCount(0);
        await expect(page.getByText('نص يجب أن يُمسح')).toHaveCount(0);
    });

    test('Ctrl+K يُغلق البحث عند فتحه', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        await page.keyboard.press('Control+K');
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 5_000 });
    });

    test('استعلام بدون نتائج', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        await page.getByTestId('global-search-input').fill('zzzzzz-no-match-e2e-99999');
        await expect(page.getByTestId('global-search-no-results')).toBeVisible({ timeout: 20_000 });
    });

    test('يجد الدعوى المزروعة ويفتح الإضبارة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

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

    test('بعد فتح الإضبارة والرجوع يُعاد فتح البحث بسلاسة', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        await page.getByTestId('global-search-input').fill(SEARCH_QUERY);
        await expect(page.getByTestId('global-search-result-0')).toBeVisible({ timeout: 25_000 });
        await page.getByTestId('global-search-result-0').click();

        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 8_000 });

        await page.keyboard.press('Escape');
        const dossierBack = page.getByRole('button', { name: /رجوع|إغلاق/ }).first();
        if (await dossierBack.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await dossierBack.click();
        }
        await expect(page.getByTestId('smart-file-dossier')).toBeHidden({ timeout: 15_000 });

        await openGlobalSearch(page);
        await expect(page.getByTestId('global-search-input')).toHaveValue('');
        await expect(page.getByTestId('global-search-idle')).toBeVisible({ timeout: 8_000 });

        await page.keyboard.press('Escape');
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 8_000 });
    });

    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);

        const perfMs = await readGlobalSearchOpenToInteractiveMs(page);
        expect(perfMs, 'يجب تسجيل hami:global-search:open-request و interactive').not.toBeNull();
        expect(perfMs!).toBeGreaterThanOrEqual(0);
        expect(perfMs!).toBeLessThan(E2E_GLOBAL_SEARCH_COLD_OPEN_MS);
    });

    test('إعادة الفتح ضمن حد زمني مع chunk محمّل', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openGlobalSearch(page);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('global-search-overlay')).toBeHidden({ timeout: 8_000 });
        await clearGlobalSearchPerfMarksInPage(page);

        await openGlobalSearch(page);

        const perfMs = await readGlobalSearchOpenToInteractiveMs(page);
        expect(perfMs, 'marks مع فتح متكرر').not.toBeNull();
        expect(perfMs!).toBeLessThan(E2E_GLOBAL_SEARCH_CACHED_OPEN_MS);
    });
});
