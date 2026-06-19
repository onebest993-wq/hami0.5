/**
 * E2E: سيناريوهات القضاء المدني — كل الاختيارات والفروع الرئيسية
 */
import { test, expect } from '@playwright/test';
import {
    addAffiliativeThirdParty,
    addInterpleaderThirdParty,
    buildE2eUndeterminedCivilFile,
    ensureLawyerDashboard,
    E2E_UNDETERMINED_FILE_ID,
    expectStageSelectValue,
    extractFileFlags,
    extractPartyNamesFromFile,
    fillCivilNewCaseForm,
    openAppealGatewayAfterJudgment,
    openCivilNewCaseForm,
    openLawsuitDossierById,
    readLawyerFilesFromPage,
    seedLawyerFiles,
    seedMixedJurisdictionFiles,
    seedUndeterminedCivilFile,
    waitForPartyInFiles,
} from './helpers/civilLawsuitFixtures';

test.describe('Civil judiciary scenarios — form branches', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
    });

    test('high claim (>1M) auto-switches stage to بداءة بدرجة أولى', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            claimValue: '1500000',
            stage: 'بداءة بدرجة أخيرة',
            markClient: false,
        });
        await expectStageSelectValue(page, 'بداءة بدرجة أولى');
    });

    test('fixed-fee type locks claim value field', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await page.getByPlaceholder('اسم المحكمة المختصة...').fill('بداءة الكرخ');
        await page.getByPlaceholder('أدخل نوع الدعوى...').fill('نزاع مرور');
        await page.locator('select').first().selectOption({ label: 'بداءة بدرجة أخيرة' });
        const valueInput = page.getByPlaceholder('----');
        await expect(valueInput).toBeDisabled();
    });

    test('appeal court shows مستأنف / مستأنف عليه roles', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            court: 'استئناف بغداد',
            type: 'طعن استئناف',
            stage: 'استئناف',
            undetermined: true,
            markClient: false,
        });
        await expect(page.getByText('مستأنف', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('مستأنف عليه', { exact: false }).first()).toBeVisible();
    });

    test('blocked personal-status keyword in civil type prevents save', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            type: 'دعوى طلاق شرعي',
            markClient: true,
        });
        await page.getByTestId('lawyer-new-case-save').click();
        await expect(page.getByText('ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة').first()).toBeVisible();
        await expect(page.getByTestId('smart-file-dossier')).toHaveCount(0);
    });

    test('save without موكل shows client error', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { markClient: false });
        await page.getByTestId('lawyer-new-case-save').click();
        await expect(page.getByText('يرجى تحديد الموكل — يجب اختيار طرف واحد على الأقل').first()).toBeVisible();
    });

    test('interpleader third party disabled at appeal stage', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            court: 'استئناف بغداد',
            stage: 'استئناف',
            undetermined: true,
            markClient: false,
        });
        await page.getByRole('button', { name: 'إضافة شخص ثالث' }).click();
        await expect(page.getByRole('heading', { name: 'إضافة شخص ثالث' })).toBeVisible();
        const interpleaderBtn = page.getByRole('button', { name: 'اختصامي' });
        await expect(interpleaderBtn).toBeDisabled();
        await expect(page.getByText('الإدخال الاختصامي غير متاح في مرحلة الاستئناف')).toBeVisible();
    });
});

test.describe('Civil judiciary scenarios — persistence', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
    });

    test('creates case with high claim and persists stage + value', async ({ page }) => {
        test.setTimeout(60_000);
        const plaintiff = 'مدعي قيمة عالية';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            plaintiff,
            claimValue: '2000000',
            stage: 'بداءة بدرجة أخيرة',
        });
        await expectStageSelectValue(page, 'بداءة بدرجة أولى');
        await page.getByTestId('lawyer-new-case-save').click();
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, plaintiff, 20_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        const flags = extractFileFlags(created);
        expect(flags.lawsuitJurisdiction).toBe('civil');
        expect(flags.currentStage).toBe('بداءة بدرجة أولى');
        expect(flags.claimValue).toBe('2000000');
    });

    test('creates case with interpleader third party', async ({ page }) => {
        test.setTimeout(60_000);
        const plaintiff = 'مدعي اختصام';
        const thirdName = 'شخص ثالث E2E';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { plaintiff, undetermined: true });
        await addInterpleaderThirdParty(page, thirdName);
        await page.getByTestId('lawyer-new-case-save').click();
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, thirdName, 20_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(thirdName));
        expect(created).toBeTruthy();
        expect(extractPartyNamesFromFile(created)).toContain(plaintiff);
    });

    test('undetermined value flag persists on file', async ({ page }) => {
        test.setTimeout(60_000);
        const plaintiff = 'مدعي غير مقدرة';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { plaintiff, undetermined: true });
        await page.getByTestId('lawyer-new-case-save').click();
        await waitForPartyInFiles(page, plaintiff, 20_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        expect(extractFileFlags(created).isUndeterminedValue).toBe(true);
    });
});

test.describe('Civil judiciary scenarios — archive filter', () => {
    test('civil jurisdiction tab hides personal-status files', async ({ page }) => {
        await seedMixedJurisdictionFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);

        await page.getByTestId('hub-archive-lawsuit').click();
        await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
        await page.getByTestId('archive-jurisdiction-civil').click();

        await expect(page.getByText('مدعي اختبار')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('موكل أحوال')).toHaveCount(0);
    });
});

test.describe('Civil judiciary scenarios — extended branches', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
    });

    test('eviction type forces بداءة بدرجة أخيرة stage', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            type: 'دعوى تخلي',
            stage: 'بداءة بدرجة أولى',
            markClient: false,
        });
        await expectStageSelectValue(page, 'بداءة بدرجة أخيرة');
    });

    test('only one موكل active — switching sides moves client mark', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { markClient: false });
        const clientPills = page.getByRole('button', { name: 'موكل' });
        await clientPills.nth(0).click();
        await expect(clientPills.nth(0)).toHaveClass(/emerald/);
        await clientPills.nth(1).click();
        await expect(clientPills.nth(0)).not.toHaveClass(/emerald/);
        await expect(clientPills.nth(1)).toHaveClass(/rose/);
    });

    test('affiliative third party on plaintiff side persists', async ({ page }) => {
        test.setTimeout(60_000);
        const thirdName = 'انضمامي E2E';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { undetermined: true });
        await addAffiliativeThirdParty(page, thirdName, 1);
        await expect(page.getByText('انضمامي — جانب المدعي')).toBeVisible();
        await page.getByTestId('lawyer-new-case-save').click();
        await waitForPartyInFiles(page, thirdName, 20_000);
    });
});

test.describe('Civil judiciary scenarios — extraordinary procedure stages', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page);
    });

    test('retrial stage hides claim value and shows underlying stage field', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            stage: 'إعادة المحاكمة',
            markClient: false,
        });
        await expect(page.getByText('مرحلة المطلوب إعادة محاكمتها')).toBeVisible();
        await expect(page.getByText('القيمة التقديرية للدعوى')).toHaveCount(0);
        await expect(page.locator('select').nth(1)).toBeVisible();
    });

    test('absent objection underlying stage excludes appeal', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            stage: 'اعتراض على الحكم الغيابي',
            markClient: false,
        });
        await expect(page.getByText('مرحلة الحكم المُعترض عليه غيابياً')).toBeVisible();
        const underlying = page.locator('select').nth(1);
        const options = await underlying.locator('option').allTextContents();
        expect(options.some((o) => o.includes('استئناف'))).toBe(false);
        expect(options.some((o) => o.includes('بداءة بدرجة أولى'))).toBe(true);
    });

    test('extraordinary stage requires underlying stage before save', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            stage: 'اعتراض الغير',
            markClient: true,
        });
        await page.getByTestId('lawyer-new-case-save').click();
        await expect(page.getByText('ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة').first()).toBeVisible();
        await expect(page.getByTestId('smart-file-dossier')).toHaveCount(0);
    });

    test('creates retrial case with underlying stage persisted', async ({ page }) => {
        test.setTimeout(60_000);
        const plaintiff = 'مدعي إعادة محاكمة';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            plaintiff,
            stage: 'إعادة المحاكمة',
            retrialTargetStage: 'بداءة بدرجة أولى',
        });
        await page.getByTestId('lawyer-new-case-save').click();
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, plaintiff, 20_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        const flags = extractFileFlags(created);
        expect(flags.currentStage).toBe('إعادة المحاكمة');
        expect(flags.retrialTargetStage).toBe('بداءة بدرجة أولى');
    });
});

test.describe('Civil judiciary scenarios — SmartFile appeal route', () => {
    test('undetermined dossier offers تمييز only in appeal gateway', async ({ page }) => {
        test.setTimeout(90_000);
        await seedUndeterminedCivilFile(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page, false, [buildE2eUndeterminedCivilFile()]);
        await openLawsuitDossierById(page, E2E_UNDETERMINED_FILE_ID);
        await openAppealGatewayAfterJudgment(page);
        await expect(page.getByText('دعوى غير مقدرة القيمة')).toBeVisible();
        await expect(page.getByRole('button', { name: 'تمييز' })).toBeVisible();
        await expect(page.getByRole('button', { name: /^استئناf$/ })).toHaveCount(0);
    });
});
