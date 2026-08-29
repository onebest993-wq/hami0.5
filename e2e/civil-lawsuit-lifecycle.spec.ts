/**
 * E2E: دورة حياة الإضبارة المدنية في المخزن — أرشفة / سلة / استرجاع.
 */
import { test, expect } from '@playwright/test';
import {
    bootCivilLawsuitsScreenE2E,
    clickVisibleTestId,
    E2E_CIVIL_FILE_ID,
    openLawsuitsWorkspace,
    prepareCivilLawsuitsE2E,
    visibleTestId,
} from './helpers/civilLawsuitFixtures';
import { selectArchiveLifecycleView } from './helpers/archiveE2EFixtures';

test.describe('Civil lawsuit archive lifecycle', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
        await openLawsuitsWorkspace(page);
        await expect(visibleTestId(page, `lawsuit-file-${E2E_CIVIL_FILE_ID}`)).toBeVisible({
            timeout: 45_000,
        });
    });

    test('moves a file to trash and restores it to active', async ({ page }) => {
        const fileId = E2E_CIVIL_FILE_ID;
        const card = `lawsuit-file-${fileId}`;

        await expect(async () => {
            await clickVisibleTestId(page, `${card}-trash`);
            await expect(visibleTestId(page, 'lawsuit-trash-confirm-dialog')).toBeVisible({
                timeout: 3_000,
            });
        }).toPass({ timeout: 15_000 });
        await clickVisibleTestId(page, 'lawsuit-trash-confirm-submit');
        await expect(page.getByTestId('lawsuit-trash-confirm-dialog')).toBeHidden({
            timeout: 10_000,
        });
        await expect(visibleTestId(page, card)).toHaveCount(0);

        await selectArchiveLifecycleView(page, 'trash');
        await expect(visibleTestId(page, card)).toBeVisible({ timeout: 15_000 });

        await clickVisibleTestId(page, `${card}-restore`);
        await selectArchiveLifecycleView(page, 'active');
        await expect(visibleTestId(page, card)).toBeVisible({ timeout: 15_000 });
    });

    test('archives a file and restores it to active', async ({ page }) => {
        const fileId = E2E_CIVIL_FILE_ID;
        const card = `lawsuit-file-${fileId}`;

        await expect(async () => {
            await clickVisibleTestId(page, `${card}-archive`);
            await expect(visibleTestId(page, card)).toHaveCount(0, { timeout: 5_000 });
        }).toPass({ timeout: 20_000 });

        await selectArchiveLifecycleView(page, 'archived');
        await expect(visibleTestId(page, card)).toBeVisible({ timeout: 15_000 });

        await clickVisibleTestId(page, `${card}-restore-archive`);
        await selectArchiveLifecycleView(page, 'active');
        await expect(visibleTestId(page, card)).toBeVisible({ timeout: 15_000 });
    });

    test('permanently deletes a trashed file after confirmation', async ({ page }) => {
        const fileId = E2E_CIVIL_FILE_ID;
        const card = `lawsuit-file-${fileId}`;

        await expect(async () => {
            await clickVisibleTestId(page, `${card}-trash`);
            await expect(visibleTestId(page, 'lawsuit-trash-confirm-dialog')).toBeVisible({
                timeout: 3_000,
            });
        }).toPass({ timeout: 15_000 });
        await clickVisibleTestId(page, 'lawsuit-trash-confirm-submit');
        await expect(page.getByTestId('lawsuit-trash-confirm-dialog')).toBeHidden({
            timeout: 10_000,
        });

        await selectArchiveLifecycleView(page, 'trash');
        await expect(visibleTestId(page, card)).toBeVisible({ timeout: 15_000 });
        await clickVisibleTestId(page, 'lawsuits-trash-select-all');
        const wipe = visibleTestId(page, 'lawsuits-trash-permanent-delete');
        await expect(wipe).toBeEnabled({ timeout: 8_000 });
        await wipe.evaluate((el) => (el as HTMLButtonElement).click());
        await expect(page.getByTestId('lawsuit-permanent-delete-dialog')).toBeVisible({
            timeout: 10_000,
        });
        await clickVisibleTestId(page, 'lawsuit-permanent-delete-confirm');
        await expect(page.getByTestId('lawsuit-permanent-delete-dialog')).toBeHidden({
            timeout: 10_000,
        });
        await expect(visibleTestId(page, card)).toHaveCount(0);

        await selectArchiveLifecycleView(page, 'active');
        await expect(visibleTestId(page, card)).toHaveCount(0);
    });
});
