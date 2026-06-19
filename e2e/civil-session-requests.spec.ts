/**
 * E2E: محضر الدعوى + مركز الطلبات داخل الإضبارة
 */
import { test, expect } from '@playwright/test';
import {
    E2E_SESSION_JUDGE_DECISION,
    E2E_SESSION_PROCEEDINGS,
    ensureLawyerDashboard,
    openCivilDossier,
    openSessionRecordPanel,
    saveSessionRecord,
    seedLawyerFiles,
} from './helpers/civilLawsuitFixtures';

test.describe('Civil session record and requests hub', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
        await openCivilDossier(page);
    });

    test('opens session record panel and saves proceedings to timeline', async ({ page }) => {
        test.setTimeout(60_000);

        await openSessionRecordPanel(page);
        await saveSessionRecord(page);

        await expect(page.getByText(/محضر\s*الجلسة\s*1/)).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(E2E_SESSION_PROCEEDINGS)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(E2E_SESSION_JUDGE_DECISION)).toBeVisible({ timeout: 10_000 });
    });

    test('requests hub is visible below session record trigger', async ({ page }) => {
        await expect(page.getByTestId('smart-file-session-record-open')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('smart-file-requests-hub')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('smart-file-requests-search')).toBeVisible();
    });
});
