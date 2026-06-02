/**
 * E2E: مسار الدعاوى المدنية — فتح الأرشيف والإضبارة
 */
import { test, expect } from '@playwright/test';
import {
    ensureLawyerDashboard,
    openCivilDossier,
    seedLawyerFiles,
} from './helpers/civilLawsuitFixtures';

test.describe('Civil lawsuit smoke', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
    });

    test('opens lawsuits workspace and smart file dossier', async ({ page }) => {
        await openCivilDossier(page);
        await expect(page.getByText('اضبارة الدعوى')).toBeVisible();
    });

    test('reload keeps dossier open after navigation from archive', async ({ page }) => {
        test.setTimeout(60_000);
        await openCivilDossier(page);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await ensureLawyerDashboard(page);
        await openCivilDossier(page);
    });

    test('dossier back button returns to dashboard hub', async ({ page }) => {
        await openCivilDossier(page);
        await page.getByTestId('smart-file-back').click();
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('smart-file-dossier')).toBeHidden();
    });
});
