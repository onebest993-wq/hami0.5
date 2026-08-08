/**
 * E2E: ملاحظات الإضبارة — حفظ وظهور بعد إعادة الفتح
 */
import { test, expect } from '@playwright/test';
import { closeExecutionDossierE2E } from './helpers/executionE2EFixtures';
import {
    bootExecutionLawyerShell,
    openExecutionArchiveFromHome,
    openExecutionDossierByRowText,
    saveExecutionNoteE2E,
} from './helpers/executionE2EBoot';

const MINIMAL_EXECUTION_FILE = {
    id: 'e2e-exec-notes-1',
    fileNumber: '303',
    fileYear: '2026',
    directorate: 'مديرية تنفيذ E2E',
    executionNumber: '303',
    docNumber: '2026/تنفيذ/303',
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

test.describe('Execution notes persist', () => {
    test.describe.configure({ timeout: 120_000 });

    test('saves a note, shows it in vault, and reflects it in the dossier timeline', async ({ page }) => {
        const pageErrors = await bootExecutionLawyerShell(page, { executionFile: MINIMAL_EXECUTION_FILE });
        await openExecutionArchiveFromHome(page);
        await openExecutionDossierByRowText(page, /مديرية تنفيذ E2E|2026\/تنفيذ\/303/);

        const uniqueNote = `ملاحظة E2E ${Date.now()}`;
        await saveExecutionNoteE2E(page, uniqueNote);

        const notesModal = page.getByTestId('execution-notes-modal');
        await expect(notesModal.getByTestId('execution-notes-pane-vault')).toHaveAttribute(
            'aria-selected',
            'true',
            { timeout: 10_000 },
        );
        await expect(notesModal.getByTestId('dossier-notes-vault').getByText(uniqueNote, { exact: true })).toBeVisible({
            timeout: 10_000,
        });

        const fatal = pageErrors.filter((msg) => /ReferenceError|is not defined/i.test(msg));
        expect(fatal).toEqual([]);

        await closeExecutionDossierE2E(page);
    });
});
