/**
 * E2E: مسار الدعاوى المدنية — فتح الأرشيف والإضبارة
 */
import { test, expect } from '@playwright/test';
import {
    bootCivilLawsuitsScreenE2E,
    closeSmartFileDossierToHub,
    openCivilDossier,
    prepareCivilLawsuitsE2E,
} from './helpers/civilLawsuitFixtures';

test.describe('Civil lawsuit smoke', () => {
    test.describe.configure({ timeout: 90_000 });
    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
    });

    test('opens lawsuits workspace and smart file dossier', async ({ page }) => {
        await openCivilDossier(page);
        await expect(page.getByText('اضبارة الدعوى')).toBeVisible();
    });

    test('reload keeps dossier open after navigation from archive', async ({ page }) => {
        test.setTimeout(180_000);
        await openCivilDossier(page);
        // bootCivilLawsuitsScreenE2E يعيد goto('/') ويُعيد البذرة — لا reload إضافي فوقه.
        await bootCivilLawsuitsScreenE2E(page);
        await openCivilDossier(page);
    });

    test('dossier back button returns to dashboard hub', async ({ page }) => {
        await openCivilDossier(page);
        await closeSmartFileDossierToHub(page);
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });
    });
});
