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

    closeSmartFileDossier,

    openGlobalSearch,
    openGlobalSearchForE2E,
    openGlobalSearchViaKeyboard,

    expectGlobalSearchClosed,

    E2E_GLOBAL_SEARCH_COLD_OPEN_MS,

    E2E_GLOBAL_SEARCH_CACHED_OPEN_MS,

} from './helpers/globalSearchFixtures';



const SEARCH_QUERY = '100/2026';



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



        await openGlobalSearchViaKeyboard(page);

    });



    test('Escape يغلق البحث', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);

        await page.keyboard.press('Escape');

        await expectGlobalSearchClosed(page);

    });



    test('إعادة الفتح تُصفّر الاستعلام السابق', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);

        await page.getByTestId('global-search-input').fill('نص يجب أن يُمسح');

        await page.keyboard.press('Escape');

        await expectGlobalSearchClosed(page);



        await openGlobalSearchForE2E(page);

        await expect(page.getByTestId('global-search-input')).toHaveValue('');

        await expect(page.getByTestId('global-search-results')).toHaveCount(0);

        await expect(page.getByText('نص يجب أن يُمسح')).toHaveCount(0);

    });



    test('Ctrl+K يُغلق البحث عند فتحه', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);

        await page.keyboard.press('Control+K');

        await expectGlobalSearchClosed(page, 5_000);

    });



    test('استعلام بدون نتائج', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);

        await page.getByTestId('global-search-input').fill('zzzzzz-no-match-e2e-99999');

        await expect(page.getByTestId('global-search-no-results')).toBeVisible({ timeout: 20_000 });

    });



    test('يجد الدعوى المزروعة ويفتح الإضبارة', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);

        await page.getByTestId('global-search-input').fill(SEARCH_QUERY);



        await expect(page.getByTestId('global-search-results')).toBeVisible({ timeout: 25_000 });

        await expect(page.getByTestId('global-search-result-0')).toBeVisible({ timeout: 8_000 });



        await page.getByTestId('global-search-result-0').click();



        await expectGlobalSearchClosed(page);

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



        await openGlobalSearchForE2E(page);

        await page.getByTestId('global-search-input').fill(SEARCH_QUERY);

        await expect(page.getByTestId('global-search-result-0')).toBeVisible({ timeout: 25_000 });

        await page.getByTestId('global-search-result-0').click();



        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });

        await expectGlobalSearchClosed(page);



        await closeSmartFileDossier(page);



        await openGlobalSearchForE2E(page);

        await expect(page.getByTestId('global-search-input')).toHaveValue('');

        await expect(page.getByTestId('global-search-idle')).toBeVisible({ timeout: 8_000 });



        await page.keyboard.press('Escape');

        await expectGlobalSearchClosed(page);

    });



    test('يفتح بزمن تفاعل مقبول (performance marks)', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);



        const perfMs = await readGlobalSearchOpenToInteractiveMs(page);

        expect(perfMs, 'يجب تسجيل hami:global-search:open-request و interactive').not.toBeNull();

        expect(perfMs!).toBeGreaterThanOrEqual(0);

        expect(perfMs!).toBeLessThan(E2E_GLOBAL_SEARCH_COLD_OPEN_MS);

    });



    test('إعادة الفتح ضمن حد زمني مع chunk محمّل', async ({ page }) => {

        await page.goto('/');

        await ensureLawyerDashboard(page);

        await dismissProductivityBlockers(page);



        await openGlobalSearchForE2E(page);

        await page.keyboard.press('Escape');

        await expectGlobalSearchClosed(page);

        await clearGlobalSearchPerfMarksInPage(page);



        await openGlobalSearchForE2E(page);



        const perfMs = await readGlobalSearchOpenToInteractiveMs(page);

        expect(perfMs, 'marks مع فتح متكرر').not.toBeNull();

        expect(perfMs!).toBeLessThan(E2E_GLOBAL_SEARCH_CACHED_OPEN_MS);

    });

});


