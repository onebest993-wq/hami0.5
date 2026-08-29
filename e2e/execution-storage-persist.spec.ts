/**
 * E2E: مسار تخزين التنفيذ — فهرس executionFiles ↔ blob حيّ
 */
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { bootToLawyerHome } from './helpers/bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { openExecutionArchiveFromHome } from './helpers/executionE2EBoot';
import {
    E2E_EXEC_PERSIST_ID,
    buildE2eExecutionLiveBlob,
    readExecutionIndexRow,
    seedDivergedExecutionStorage,
    seedSyncedExecutionStorage,
    triggerExecutionStorageReconcile,
    waitForExecutionIndexReconciled,
} from './helpers/executionStorageFixtures';

async function bootLawyerForStorageE2E(page: Page) {
    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);
}

test.describe('Execution storage persist', () => {
    test.setTimeout(120_000);

    test('auto-reconciles executionFiles index from live blob on lawyer boot', async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedLawyerFiles(page);
        await seedDivergedExecutionStorage(page);
        await page.goto('/');
        await ensureLawyerDashboard(page);
        await bootToLawyerHome(page);
        await dismissProductivityBlockers(page);
        await triggerExecutionStorageReconcile(page).catch(() => undefined);

        const row = await waitForExecutionIndexReconciled(page);
        expect(row?.directorate).toBe(buildE2eExecutionLiveBlob().directorate);
        const timeline = row?.timelineEvents as Array<{ title?: string }> | undefined;
        expect(timeline?.[0]?.title).toBe('حدث E2E تخزين موحّد');
    });

    test('opens execution archive after synced storage and shows dossier', async ({ page }) => {
        await prepareProductivityE2E(page);
        await seedSyncedExecutionStorage(page);
        await bootLawyerForStorageE2E(page);

        await openExecutionArchiveFromHome(page);

        await expect(page.getByText(/بلوب حيّ E2E|2026\/تنفيذ\/880/).first()).toBeVisible({
            timeout: 20_000,
        });

        const indexRow = await readExecutionIndexRow(page, E2E_EXEC_PERSIST_ID);
        expect(indexRow?.id).toBe(E2E_EXEC_PERSIST_ID);
    });
});
