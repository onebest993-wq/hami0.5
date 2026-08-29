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
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toContainText('متهم E2E', {
            timeout: 15_000,
        });
        await expect(page.getByRole('button', { name: 'القرارات' })).toBeVisible();
    });

    test('زر الإغلاق يغلق الإضبارة إلى الواجهة الرئيسية', async ({ page }) => {
        await bootCriminalDossierE2E(page);
        await dismissProductivityBlockers(page);

        await openCriminalDossierFromWorkspace(page);
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.exit)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.back)).toBeHidden();
        await page.getByTestId(CRIMINAL_E2E_TEST_IDS.exit).click({ timeout: 15_000 });

        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toBeHidden({ timeout: 15_000 });
        await expect(page.getByTestId('lawyer-home-tab')).toBeVisible({ timeout: 15_000 });
    });

    test('يفضّل زر الرجوع عند فتح سلة المهملات', async ({ page }) => {
        await bootCriminalDossierE2E(page);
        await dismissProductivityBlockers(page);

        await openCriminalDossierFromWorkspace(page);
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.exit)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.back)).toBeHidden();

        await page.getByTestId(CRIMINAL_E2E_TEST_IDS.headerTrash).click({ timeout: 15_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.trashModal)).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.back)).toBeVisible();
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.exit)).toBeHidden();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.trashModal)).toBeHidden({ timeout: 10_000 });
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.exit)).toBeVisible();
        await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.back)).toBeHidden();
    });
});
