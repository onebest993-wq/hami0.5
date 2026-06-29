/**
 * E2E: فتح إضبارة طلب مستعجل + إعادة تحميل الصفحة
 */
import { test, expect } from '@playwright/test';
import { ensureLawyerDashboard, openLawsuitsWorkspace, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';

const URGENT_STORAGE_KEY = 'hami:urgentActions:v1:dev-user-uuid-1';

test.describe('Urgent dossier and reload', () => {
    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
        await page.addInitScript((storageKey) => {
            const seed = {
                schemaVersion: 1,
                userId: 'dev-user-uuid-1',
                updatedAt: new Date().toISOString(),
                cases: [
                    {
                        id: 'e2e-urgent-case-1',
                        type: 'urgent_action',
                        actionType: 'طلب مستعجل',
                        applicantName: 'اختبار E2E',
                        court: 'محكمة اختبار',
                        requestNumber: '2026/E2E/1',
                        createdAt: new Date().toISOString(),
                        phase: 'pending',
                        status: 'safe',
                        archived: false,
                        deleted: false,
                    },
                ],
            };
            localStorage.setItem(storageKey, JSON.stringify(seed));
        }, URGENT_STORAGE_KEY);
    });

    test('page reload completes (no infinite loading bar)', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('#loading-overlay')).toHaveCount(0, { timeout: 8_000 });
        await expect(page.locator('#root')).toBeVisible();
    });

    test('urgent dossier opens from lawsuits workspace', async ({ page }) => {
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await dismissProductivityBlockers(page);

        await openLawsuitsWorkspace(page);
        await page.getByTestId('lawsuits-tab-urgent').click({ timeout: 15_000 });
        await expect(page.getByText('اختبار E2E')).toBeVisible({ timeout: 20_000 });

        await page.getByText('اختبار E2E').click();

        await expect(page.getByText('تعذر فتح الإضبارة')).toBeHidden({ timeout: 45_000 });
        await expect(page.getByText('تعذّر فتح الإضبارة')).toBeHidden({ timeout: 45_000 });
        await expect(page.getByText('سير الإجراءات القضائية')).toBeVisible({ timeout: 45_000 });
        await expect(page.getByText(/اختبار E2E/)).toBeVisible();
    });
});
