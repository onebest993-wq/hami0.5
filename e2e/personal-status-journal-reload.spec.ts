/**
 * E2E: استعادة إضبارة أحوال من سجل WAL عند الإقلاع — السجل يُحقَن قبل تحميل React
 */
import { test, expect } from '@playwright/test';
import {
    bootCivilLawsuitsE2E,
    LAWSUIT_WRITE_JOURNAL_KEY,
    openLawsuitsWorkspace,
    partyExistsInLawsuitStorageUnion,
    prepareCivilLawsuitsE2E,
    readLawsuitDurabilityOverlayStateFromPage,
    rebootLawyerDashboardAfterReload,
    waitForLawsuitDurabilityOverlaysCleared,
} from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';

function buildJournalPersonalFile(plaintiff: string) {
    const caseNo = `WAL/${Date.now()}`;
    return {
        id: 990_777,
        type: 'lawsuit',
        status: 'active',
        lawsuitJurisdiction: 'personal',
        caseNo,
        court: 'محكمة الأحوال الشخصية',
        docType: 'دعوى طلاق',
        date: '3/1/2026',
        parties: [{ id: 77, name: plaintiff, role: 'مدعي', isClient: true, side: 'right' }],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 'wal-s1',
                name: 'البداءة',
                stageName: 'البداءة',
                status: 'active',
                caseNo,
                court: 'محكمة الأحوال الشخصية',
                parties: [
                    { id: 77, name: plaintiff, role: 'مدعي', isClient: true, side: 'right' },
                ],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    };
}

test.describe('Personal status WAL journal reload', () => {
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
    });

    test('journal overlay at boot survives reload and appears in archive', async ({ page }) => {
        const plaintiff = `موكل WAL Reload ${Date.now()}`;
        const journalFile = buildJournalPersonalFile(plaintiff);
        const journalEntry = {
            v: 1 as const,
            fileId: String(journalFile.id),
            file: journalFile,
            ts: Date.now(),
        };

        await page.addInitScript(
            ({ journalKey, entryJson }) => {
                localStorage.setItem(journalKey, entryJson);
            },
            {
                journalKey: LAWSUIT_WRITE_JOURNAL_KEY,
                entryJson: JSON.stringify([journalEntry]),
            },
        );

        await bootCivilLawsuitsE2E(page);
        await dismissProductivityBlockers(page);

        const overlayAtBoot = await readLawsuitDurabilityOverlayStateFromPage(page);
        expect(overlayAtBoot.journalCount).toBeGreaterThan(0);

        await openLawsuitsWorkspace(page);
        const host = page.locator('[data-testid="lawsuits-workspace"][data-open="true"]:visible');
        await expect(host.getByText(plaintiff, { exact: false })).toBeVisible({ timeout: 45_000 });

        await page.reload({ waitUntil: 'domcontentloaded' });
        await rebootLawyerDashboardAfterReload(page);

        await openLawsuitsWorkspace(page);
        await expect(host.getByText(plaintiff, { exact: false })).toBeVisible({ timeout: 60_000 });

        expect(await partyExistsInLawsuitStorageUnion(page, plaintiff)).toBe(true);
        await waitForLawsuitDurabilityOverlaysCleared(page, 45_000);

        const overlayAfter = await readLawsuitDurabilityOverlayStateFromPage(page);
        expect(overlayAfter.pendingCount).toBe(0);
        expect(overlayAfter.journalCount).toBe(0);
    });
});
