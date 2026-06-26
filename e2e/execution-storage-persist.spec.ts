/**
 * E2E: مسار تخزين التنفيذ — فهرس executionFiles ↔ blob حيّ
 */
import { test, expect } from '@playwright/test';
import { prepareBootE2E, bootToLawyerHome } from './helpers/bootFixtures';
import {
    E2E_EXEC_PERSIST_ID,
    buildE2eExecutionLiveBlob,
    readExecutionIndexRow,
    seedDivergedExecutionStorage,
    seedSyncedExecutionStorage,
} from './helpers/executionStorageFixtures';

test.describe('Execution storage persist', () => {
    test.setTimeout(90_000);

    test('auto-reconciles executionFiles index from live blob on lawyer boot', async ({ page }) => {
        await prepareBootE2E(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
        if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await devBypass.click();
        }

        await bootToLawyerHome(page);
        await seedDivergedExecutionStorage(page);
        await bootToLawyerHome(page);

        const row = await readExecutionIndexRow(page);
        expect(row?.directorate).toBe(buildE2eExecutionLiveBlob().directorate);
        const timeline = row?.timelineEvents as Array<{ title?: string }> | undefined;
        expect(timeline?.[0]?.title).toBe('حدث E2E تخزين موحّد');
    });

    test('opens execution archive after synced storage and shows dossier', async ({ page }) => {
        await prepareBootE2E(page);
        await seedSyncedExecutionStorage(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
        if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await devBypass.click();
        }

        await bootToLawyerHome(page);

        await page.getByTestId('hub-archive-execution').click({ timeout: 25_000 });
        await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
            timeout: 25_000,
        });

        await expect(page.getByText(/بلوب حيّ E2E|2026\/تنفيذ\/880/).first()).toBeVisible({
            timeout: 20_000,
        });

        const indexRow = await readExecutionIndexRow(page, E2E_EXEC_PERSIST_ID);
        expect(indexRow?.id).toBe(E2E_EXEC_PERSIST_ID);
    });
});
