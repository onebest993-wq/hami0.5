/**
 * E2E: إنشاء دعوى مدنية من JurisdictionGlassPanel
 */
import { test, expect } from '@playwright/test';
import {
    bootCivilLawsuitsE2E,
    extractPartyNamesFromFile,
    fillMinimalCivilNewCase,
    fillMinimalPersonalNewCase,
    openCivilNewCaseForm,
    openPersonalNewCaseForm,
    prepareCivilLawsuitsE2E,
    readLawyerFilesFromPage,
    waitForPartyInFiles,
} from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';

test.describe('Civil lawsuit new case', () => {
    test.describe.configure({ timeout: 240_000 });

    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
    });

    test('opens civil jurisdiction form from archive FAB', async ({ page }) => {
        await bootCivilLawsuitsE2E(page);
        await dismissProductivityBlockers(page);
        await openCivilNewCaseForm(page);
        await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible();
    });

    test('creates civil lawsuit and persists to lawyer_files', async ({ page }) => {
        test.setTimeout(180_000);
        const plaintiff = 'مدعي E2E جديد';
        await bootCivilLawsuitsE2E(page);
        await dismissProductivityBlockers(page);
        await openCivilNewCaseForm(page);
        await fillMinimalCivilNewCase(page, { plaintiff, court: 'بداءة الكرخ', type: 'دعوى تعويض' });
        await page.getByTestId('lawyer-new-case-save').click({ force: true });
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await expect(page.getByRole('button', { name: new RegExp(plaintiff) }).first()).toBeVisible({
            timeout: 15_000,
        });
        await waitForPartyInFiles(page, plaintiff, 30_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        expect(created).toBeTruthy();
        const jurisdiction =
            (created as { lawsuitJurisdiction?: string }).lawsuitJurisdiction
            ?? (created as { selectedType?: string }).selectedType
            ?? '';
        expect(jurisdiction).toBe('civil');
    });

    test('allows personal-status keywords in personal jurisdiction form', async ({ page }) => {
        test.setTimeout(120_000);
        await bootCivilLawsuitsE2E(page);
        await dismissProductivityBlockers(page);
        await openPersonalNewCaseForm(page);
        await page.getByPlaceholder('اسم المحكمة...').fill('محكمة أحوال شخصية');
        await page.getByPlaceholder('طلاق، نفقة، حضانة...').fill('دعوى طلاق');
        await expect(page.getByText('ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة')).toHaveCount(0);
    });

    test('creates personal-status lawsuit and persists to lawyer_files', async ({ page }) => {
        test.setTimeout(180_000);
        const plaintiff = 'موكل أحوال E2E جديد';
        await bootCivilLawsuitsE2E(page);
        await dismissProductivityBlockers(page);
        await openPersonalNewCaseForm(page);
        await fillMinimalPersonalNewCase(page, { plaintiff, type: 'دعوى طلاق' });
        await page.getByTestId('lawyer-new-case-save').click({ force: true });
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await expect(page.getByRole('button', { name: new RegExp(plaintiff) }).first()).toBeVisible({
            timeout: 15_000,
        });
        await waitForPartyInFiles(page, plaintiff, 30_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        expect(created).toBeTruthy();
        const jurisdiction =
            (created as { lawsuitJurisdiction?: string }).lawsuitJurisdiction
            ?? (created as { selectedType?: string }).selectedType
            ?? '';
        expect(jurisdiction).toBe('personal');
    });
});
