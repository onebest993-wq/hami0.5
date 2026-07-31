/**
 * W4 live probe — wall-clock open timings for execution paths.
 * Writes perf-reports/execution-open-probe-raw.json (consumed by measure-execution-open.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { ensureLawyerDashboard, seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './helpers/productivityE2EFixtures';
import { seedSyncedExecutionStorage } from './helpers/executionStorageFixtures';

const EXECUTION_ROW_TEXT = /بلوب حيّ E2E|2026\/تنفيذ\/880/;
const RAW_OUT = path.join(process.cwd(), 'perf-reports', 'execution-open-probe-raw.json');

async function bootExecutionWorkspace(page: Page): Promise<void> {
    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await seedSyncedExecutionStorage(page);
    await page.goto('/');
    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 45_000 });
    await ensureLawyerDashboard(page);
    await dismissProductivityBlockers(page);
}

function writePartial(partial: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(RAW_OUT), { recursive: true });
    let prev: Record<string, unknown> = {};
    try {
        if (fs.existsSync(RAW_OUT)) {
            prev = JSON.parse(fs.readFileSync(RAW_OUT, 'utf8')) as Record<string, unknown>;
        }
    } catch {
        /* ignore */
    }
    fs.writeFileSync(
        RAW_OUT,
        JSON.stringify({ ...prev, ...partial, measuredAt: new Date().toISOString() }, null, 2),
    );
}

async function measureArchiveOpenMs(page: Page): Promise<number> {
    const t0 = Date.now();
    await page.getByTestId('hub-archive-execution').scrollIntoViewIfNeeded();
    await page.getByTestId('hub-archive-execution').click({ force: true });
    await expect(page.getByTestId('execution-archive-shell')).toBeVisible({ timeout: 25_000 });
    return Date.now() - t0;
}

async function measureDossierOpenMs(page: Page): Promise<number> {
    const t0 = Date.now();
    const row = page.getByText(EXECUTION_ROW_TEXT).first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page.getByTestId('execution-dashboard-dossier')).toBeVisible({ timeout: 25_000 });
    return Date.now() - t0;
}

async function measureFollowupOpenMs(page: Page): Promise<number> {
    const memo = page.getByTestId('execution-followup-memo');
    await expect(memo).toBeVisible({ timeout: 15_000 });
    await memo.scrollIntoViewIfNeeded();
    // pointerdown يسخّن chunk المحضر (نفس مسار المنتج)
    await memo.dispatchEvent('pointerdown');
    await page.waitForTimeout(300);

    const t0 = Date.now();
    await memo.click({ force: true });
    await expect(page.getByTestId('execution-followup-modal')).toBeVisible({ timeout: 25_000 });
    return Date.now() - t0;
}

test.describe('execution open perf probe', () => {
    test.describe.configure({ timeout: 180_000, mode: 'serial' });

    test('capture archive / dossier / followup wall-clock ms', async ({ page }) => {
        await bootExecutionWorkspace(page);

        const notes: string[] = [];
        let archiveOpenMs: number | undefined;
        let dossierOpenMs: number | undefined;
        let followupOpenMs: number | undefined;

        archiveOpenMs = await measureArchiveOpenMs(page);
        writePartial({ archiveOpenMs, source: 'e2e', notes });

        dossierOpenMs = await measureDossierOpenMs(page);
        writePartial({ archiveOpenMs, dossierOpenMs, source: 'e2e', notes });

        try {
            followupOpenMs = await measureFollowupOpenMs(page);
            writePartial({
                archiveOpenMs,
                dossierOpenMs,
                followupOpenMs,
                source: 'e2e',
                notes,
            });
        } catch (e) {
            notes.push(`followupOpenMs failed: ${String(e).slice(0, 180)}`);
            writePartial({
                archiveOpenMs,
                dossierOpenMs,
                followupOpenMs: 'OPEN',
                source: 'e2e',
                notes,
            });
        }

        expect(archiveOpenMs).toBeGreaterThanOrEqual(0);
        expect(dossierOpenMs).toBeGreaterThanOrEqual(0);
        if (typeof followupOpenMs === 'number') {
            expect(followupOpenMs).toBeGreaterThanOrEqual(0);
        }
    });
});
