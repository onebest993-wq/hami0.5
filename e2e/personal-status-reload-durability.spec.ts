/**
 * E2E: إضبارة أحوال شخصية تبقى بعد Reload كامل — يغطي pending + active + monolithic
 */
import { test, expect } from '@playwright/test';
import {
    bootCivilLawsuitsE2E,
    clickLawyerNewCaseSave,
    fillMinimalPersonalNewCase,
    openLawsuitsWorkspace,
    openPersonalNewCaseForm,
    partyExistsInLawsuitStorageUnion,
    prepareCivilLawsuitsE2E,
    readLawsuitDurabilityOverlayStateFromPage,
    rebootLawyerDashboardAfterReload,
    waitForLawsuitDurabilityOverlaysCleared,
    waitForPartyInLawsuitStorageUnion,
} from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';

test.describe('Personal status reload durability', () => {
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
    });

    test('personal-status dossier survives full page reload', async ({ page }) => {
        const plaintiff = `موكل أحوال Reload ${Date.now()}`;

        await bootCivilLawsuitsE2E(page);
        await dismissProductivityBlockers(page);
        await openPersonalNewCaseForm(page);
        await fillMinimalPersonalNewCase(page, { plaintiff, type: 'دعوى طلاق' });
        await clickLawyerNewCaseSave(page);

        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await expect(page.getByTestId('smart-file-dossier')).toContainText(plaintiff, {
            timeout: 15_000,
        });
        await waitForPartyInLawsuitStorageUnion(page, plaintiff, 45_000);
        await waitForLawsuitDurabilityOverlaysCleared(page, 30_000);

        const dossierExit = page.getByTestId('smart-file-exit');
        if (await dossierExit.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await dossierExit.click({ noWaitAfter: true });
        }

        await page.reload({ waitUntil: 'domcontentloaded' });
        await rebootLawyerDashboardAfterReload(page);

        expect(await partyExistsInLawsuitStorageUnion(page, plaintiff)).toBe(true);

        await openLawsuitsWorkspace(page);
        const host = page.locator('[data-testid="lawsuits-workspace"][data-open="true"]:visible');
        await expect(host.getByText(plaintiff, { exact: false })).toBeVisible({ timeout: 30_000 });

        const overlayAfterReload = await readLawsuitDurabilityOverlayStateFromPage(page);
        expect(overlayAfterReload.pendingCount).toBe(0);
        expect(overlayAfterReload.journalCount).toBe(0);
    });
});
