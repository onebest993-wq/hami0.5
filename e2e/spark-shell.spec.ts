import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';

test.describe('سبارك — SparkShell', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
    });

    test('زر الشرارة يظهر ويفتح اللوحة على الرئيسية', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        const fab = page.getByTestId('spark-shell-fab');
        await expect(fab).toBeVisible({ timeout: 30_000 });
        await fab.evaluate((el) => (el as HTMLButtonElement).click());

        const panel = page.getByTestId('spark-shell-panel');
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel.getByText('سبارك', { exact: true })).toBeVisible();
    });
});
