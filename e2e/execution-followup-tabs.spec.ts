/**
 * E2E: تبويبات محضر المتابعة — لا أخطاء عند التنقل + persist + لا تبويبات legacy
 */
import { test, expect } from '@playwright/test';
import {
    closeExecutionDossierE2E,
    closeExecutionFollowupModalE2E,
} from './helpers/executionE2EFixtures';
import {
    bootExecutionLawyerShell,
    openExecutionArchiveFromHome,
    openExecutionDossierByRowText,
    openExecutionFollowupModal,
} from './helpers/executionE2EBoot';

const MINIMAL_EXECUTION_FILE = {
    id: 'e2e-exec-followup-tabs-1',
    fileNumber: '404',
    fileYear: '2026',
    directorate: 'مديرية تنفيذ E2E',
    executionNumber: '404',
    docNumber: '2026/تنفيذ/404',
    docType: 'حكم',
    status: 'active',
    debtors: [{ id: 'd1', name: 'مدين E2E', type: 'natural_person' }],
    creditors: [{ id: 'c1', name: 'دائن E2E' }],
    seizedAssets: [],
    timelineEvents: [],
    caseNotesLog: [],
    caseTasksPending: [],
    financialLedger: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

test.describe('Execution followup modal tabs', () => {
    test.describe.configure({ timeout: 120_000 });

    test('switches key tabs without ReferenceError', async ({ page }) => {
        const pageErrors = await bootExecutionLawyerShell(page, { executionFile: MINIMAL_EXECUTION_FILE });
        await openExecutionArchiveFromHome(page);
        await openExecutionDossierByRowText(page, /مديرية تنفيذ E2E|2026\/تنفيذ\/404/);
        await openExecutionFollowupModal(page);

        const modal = page.getByTestId('execution-followup-modal');
        await expect(modal.locator('[data-followup-tab="financial"]')).toHaveCount(0);
        await expect(modal.locator('[data-followup-tab="special"]')).toHaveCount(0);

        for (const tabId of ['other_party', 'seizure_requests', 'dossier_controls'] as const) {
            const tab = modal.locator(`[data-followup-tab="${tabId}"]`);
            if (await tab.isVisible().catch(() => false)) {
                await tab.scrollIntoViewIfNeeded();
                await tab.click();
                await page.waitForTimeout(500);
            }
        }

        const fatal = pageErrors.filter((msg) => /ReferenceError|is not defined/i.test(msg));
        expect(fatal).toEqual([]);

        await closeExecutionDossierE2E(page);
    });

    test('persists active tab across close and reopen', async ({ page }) => {
        const pageErrors = await bootExecutionLawyerShell(page, { executionFile: MINIMAL_EXECUTION_FILE });
        await openExecutionArchiveFromHome(page);
        await openExecutionDossierByRowText(page, /مديرية تنفيذ E2E|2026\/تنفيذ\/404/);
        await openExecutionFollowupModal(page);

        const modal = page.getByTestId('execution-followup-modal');
        const correspondencesTab = modal.locator('[data-followup-tab="correspondences"]');
        if (await correspondencesTab.isVisible().catch(() => false)) {
            await correspondencesTab.scrollIntoViewIfNeeded();
            await correspondencesTab.click();
            await expect(correspondencesTab).toHaveAttribute('aria-selected', 'true');
        }

        await closeExecutionFollowupModalE2E(page);
        await openExecutionFollowupModal(page);

        const reopenedModal = page.getByTestId('execution-followup-modal');
        const reopenedCorrespondences = reopenedModal.locator('[data-followup-tab="correspondences"]');
        if (await reopenedCorrespondences.isVisible().catch(() => false)) {
            await expect(reopenedCorrespondences).toHaveAttribute('aria-selected', 'true');
        }

        const fatal = pageErrors.filter((msg) => /ReferenceError|is not defined/i.test(msg));
        expect(fatal).toEqual([]);

        await closeExecutionDossierE2E(page);
    });
});
