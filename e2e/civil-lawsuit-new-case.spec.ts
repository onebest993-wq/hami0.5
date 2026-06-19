/**
 * E2E: إنشاء دعوى مدنية من JurisdictionGlassPanel
 */
import { test, expect } from '@playwright/test';
import {
    ensureLawyerDashboard,
    extractPartyNamesFromFile,
    fillMinimalCivilNewCase,
    openCivilNewCaseForm,
    readLawyerFilesFromPage,
    seedLawyerFiles,
    waitForPartyInFiles,
} from './helpers/civilLawsuitFixtures';

test.describe('Civil lawsuit new case', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
    });

    test('opens civil jurisdiction form from archive FAB', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible();
    });

    test('creates civil lawsuit and persists to lawyer_files', async ({ page }) => {
        test.setTimeout(60_000);
        const plaintiff = 'مدعي E2E جديد';
        await openCivilNewCaseForm(page);
        await fillMinimalCivilNewCase(page, { plaintiff, court: 'بداءة الكرخ', type: 'دعوى تعويض' });
        await page.getByTestId('lawyer-new-case-save').click();

        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, plaintiff, 20_000);

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
        await page.getByTestId('hub-archive-lawsuit').click();
        await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
        await page.getByTestId('lawsuits-add-new').click();
        await page.getByTestId('new-case-jurisdiction-personal').click();
        await page.getByPlaceholder('اسم المحكمة المختصة...').fill('محكمة أحوال شخصية');
        await page.getByPlaceholder('أدخل نوع الدعوى...').fill('دعوى طلاق');
        await expect(page.getByText('ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة')).toHaveCount(0);
    });
});
