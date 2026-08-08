/**
 * E2E: تبويب تحركات الطرف الآخر — حفظ + ظهور في السجل
 */
import { test, expect } from '@playwright/test';
import { closeExecutionDossierE2E } from './helpers/executionE2EFixtures';
import {
    bootExecutionLawyerShell,
    clickExecutionFollowupTab,
    openExecutionArchiveFromHome,
    openExecutionDossierByRowText,
    openExecutionFollowupModal,
} from './helpers/executionE2EBoot';

const MINIMAL_EXECUTION_FILE = {
    id: 'e2e-exec-other-party-1',
    fileNumber: '202',
    fileYear: '2026',
    directorate: 'مديرية تنفيذ E2E',
    executionNumber: '202',
    docNumber: '2026/تنفيذ/202',
    docType: 'حكم',
    status: 'active',
    debtors: [{ id: 'd1', name: 'مدين E2E', type: 'natural_person' }],
    creditors: [{ id: 'c1', name: 'دائن E2E' }],
    seizedAssets: [],
    timelineEvents: [],
    caseNotesLog: [],
    caseTasksPending: [],
    financialLedger: [],
    other_party_actions_log: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

test.describe('Other party followup tab', () => {
    test.describe.configure({ timeout: 120_000 });

    test('saves manual other-party action and shows it in saved entries', async ({ page }) => {
        const pageErrors = await bootExecutionLawyerShell(page, { executionFile: MINIMAL_EXECUTION_FILE });
        await openExecutionArchiveFromHome(page);
        await openExecutionDossierByRowText(page, /مديرية تنفيذ E2E|2026\/تنفيذ\/202/);
        await openExecutionFollowupModal(page);
        await clickExecutionFollowupTab(page, /تحركات الطرف الآخر/i, 'other_party');

        const modal = page.getByTestId('execution-followup-modal');
        const uniqueContent = `تحرك E2E ${Date.now()}`;
        const contentInput = modal.getByPlaceholder(/صف طلب الدائن|…/);
        await expect(contentInput).toBeVisible({ timeout: 20_000 });
        await contentInput.fill(uniqueContent);
        await modal.getByRole('button', { name: 'حفظ السجل' }).click();

        await expect(page.getByText(uniqueContent)).toBeVisible({ timeout: 15_000 });
        await expect(modal.getByText(/تحرك الطرف الآخر|قيد البت/i).first()).toBeVisible({
            timeout: 15_000,
        });

        const fatal = pageErrors.filter((msg) => /ReferenceError|is not defined/i.test(msg));
        expect(fatal).toEqual([]);

        await closeExecutionDossierE2E(page);
    });
});
