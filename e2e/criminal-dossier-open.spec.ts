/**
 * E2E — الإضبارة الجنائية: فتح من مساحة الدعاوى، عرض، رجوع.
 */
import { test, expect } from '@playwright/test';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import {
    bootCriminalDossierE2E,
    CRIMINAL_E2E_TEST_IDS,
    openCriminalDossierFromWorkspace,
    prepareCriminalDossierE2E,
} from './helpers/criminalDossierFixtures';

test.describe('الإضبارة الجنائية', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProductivityE2E(page);
        await prepareCriminalDossierE2E(page);
    });

    test('تفتح من تبويب جزائي في مساحة الدعاوى', async ({ page }) => {
        await bootCriminalDossierE2E(page);
        await dismissProductivityBlockers(page);

        await openCriminalDossierFromWorkspace(page);
        await expect(
            page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier).getByRole('button', { name: 'متهم E2E' }),
        ).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: 'القرارات' })).toBeVisible();
    });

    test('زر الرجوع يعيد مساحة الدعاوى', async ({ page }) => {
        await bootCriminalDossierE2E(page);
        await dismissProductivityBlockers(page);

        await openCriminalDossierFromWorkspace(page);
        await page.getByTestId(CRIMINAL_E2E_TEST_IDS.back).click({ timeout: 15_000 });

        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toBeHidden({ timeout: 15_000 });
        await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
    });
});
