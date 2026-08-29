/**
 * E2E: سلامة مقاطع الدعاوى — مكمّل لـ cloudSyncLawsuitTombstoneGuard.test.ts (محرك المزامنة + tombstones)
 *
 * ملاحظة: استدعاء performCloudSyncBucket في Playwright يتذبذب (BFF/wife signing) — الحراسة
 * السحابية مُختبرة في vitest؛ هنا نتحقق أن المقاطع لا تختلط عند تحديث المرآة monolithic.
 */
import { test, expect } from '@playwright/test';
import {
    bootLawsuitCloudSyncE2E,
    readLawsuitIdsFromSegment,
    seedLawsuitSegmentsInPage,
} from './helpers/cloudLawsuitE2EFixtures';
import { E2E_CIVIL_FILE_ID, E2E_CIVIL_FILE_ID_2 } from './helpers/civilLawsuitFixtures';

test.describe('Civil lawsuit cloud sync', () => {
    test.describe.configure({ timeout: 120_000 });

    test('active and archived segments stay isolated after monolith mirror update', async ({ page }) => {
        await bootLawsuitCloudSyncE2E(page);
        await seedLawsuitSegmentsInPage(page);

        await page.evaluate(async () => {
            const seg = await import('/src/app/domain/lawsuit/lawsuitSegmentStorage.ts');
            const { active, archived, trash } = seg.loadLawsuitFullSegmentsFromStorage();
            seg.syncLawsuitMonolithicMirror(active, archived, trash);
        });

        const activeIds = await readLawsuitIdsFromSegment(page, 'lawyer_files_active');
        const archivedIds = await readLawsuitIdsFromSegment(page, 'lawyer_files_archived');

        expect(activeIds).toContain(String(E2E_CIVIL_FILE_ID));
        expect(archivedIds).toContain(String(E2E_CIVIL_FILE_ID_2));
        expect(activeIds).not.toContain(String(E2E_CIVIL_FILE_ID_2));
        expect(archivedIds).not.toContain(String(E2E_CIVIL_FILE_ID));
    });
});
