/**
 * E2E: سيناريوهات القضاء المدني — كل الاختيارات والفروع الرئيسية
 */
import { test, expect } from '@playwright/test';
import {
    addAffiliativeThirdParty,
    addInterpleaderThirdParty,
    bootCivilLawsuitsScreenE2E,
    buildE2eCivilLawsuitFile,
    buildE2ePersonalStatusFile,
    buildE2eUndeterminedCivilFile,
    E2E_UNDETERMINED_FILE_ID,
    expectStageSelectValue,
    extractFileFlags,
    extractPartyNamesFromFile,
    fillCivilNewCaseForm,
    openAppealGatewayAfterJudgment,
    openCivilNewCaseForm,
    openLawsuitDossierById,
    openLawsuitsWorkspace,
    prepareCivilLawsuitsE2E,
    readLawyerFilesFromPage,
    seedMixedJurisdictionFiles,
    seedUndeterminedCivilFile,
    selectCaseFieldOption,
    clickLawyerNewCaseSave,
    waitForPartyInFiles,
} from './helpers/civilLawsuitFixtures';
import { selectArchiveJurisdictionTab } from './helpers/archiveE2EFixtures';

test.describe.configure({ timeout: 120_000 });

test.describe('Civil judiciary scenarios — form branches', () => {
    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
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
        await selectCaseFieldOption(page, 'المرحلة الحالية', 'بداءة بدرجة أخيرة');
        const valueInput = page.getByTestId('lawyer-new-case-claim-value');
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
        await clickLawyerNewCaseSave(page);
        await expect(page.getByText('ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة').first()).toBeVisible();
        await expect(page.getByTestId('smart-file-dossier')).toHaveCount(0);
    });

    test('save without موكل shows client error', async ({ page }) => {
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { markClient: false });
        await clickLawyerNewCaseSave(page);
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
        await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible({ timeout: 15_000 });
        const addBtn = page.getByTestId('lawyer-new-case-add-third-party');
        await addBtn.scrollIntoViewIfNeeded();
        await expect(addBtn).toBeVisible({ timeout: 15_000 });
        await addBtn.click({ force: true });
        await expect(page.getByRole('heading', { name: 'إضافة شخص ثالث' })).toBeVisible({ timeout: 15_000 });
        const interpleaderBtn = page.getByTestId('lawyer-new-case-third-party-mode-interpleader');
        await expect(interpleaderBtn).toBeVisible({ timeout: 15_000 });
        await expect(interpleaderBtn).toBeDisabled();
        await expect(page.getByText('الإدخال الاختصامي غير متاح في مرحلة الاستئناف')).toBeVisible();
    });
});

test.describe('Civil judiciary scenarios — persistence', () => {
    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
    });

    test('creates case with high claim and persists stage + value', async ({ page }) => {
        test.setTimeout(120_000);
        const plaintiff = 'مدعي قيمة عالية';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            plaintiff,
            claimValue: '2000000',
            stage: 'بداءة بدرجة أخيرة',
        });
        await expectStageSelectValue(page, 'بداءة بدرجة أولى');
        await clickLawyerNewCaseSave(page);
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, plaintiff, 30_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        const flags = extractFileFlags(created);
        expect(flags.lawsuitJurisdiction).toBe('civil');
        expect(flags.currentStage).toBe('بداءة بدرجة أولى');
        expect(flags.claimValue).toBe('2000000');
    });

    test('creates case with interpleader third party', async ({ page }) => {
        test.setTimeout(120_000);
        const plaintiff = 'مدعي اختصام';
        const thirdName = 'شخص ثالث E2E';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { plaintiff, undetermined: true });
        await addInterpleaderThirdParty(page, thirdName);
        await clickLawyerNewCaseSave(page);
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, thirdName, 30_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(thirdName));
        expect(created).toBeTruthy();
        expect(extractPartyNamesFromFile(created)).toContain(plaintiff);
    });

    test('undetermined value flag persists on file', async ({ page }) => {
        test.setTimeout(120_000);
        const plaintiff = 'مدعي غير مقدرة';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { plaintiff, undetermined: true });
        await clickLawyerNewCaseSave(page);
        await waitForPartyInFiles(page, plaintiff, 30_000);

        const files = await readLawyerFilesFromPage(page);
        const created = files.find((f) => extractPartyNamesFromFile(f).includes(plaintiff));
        expect(extractFileFlags(created).isUndeterminedValue).toBe(true);
    });
});

test.describe('Civil judiciary scenarios — archive filter', () => {
    test('civil jurisdiction tab hides personal-status files', async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await seedMixedJurisdictionFiles(page);
        const mixedFiles = [buildE2eCivilLawsuitFile(), buildE2ePersonalStatusFile()];
        await bootCivilLawsuitsScreenE2E(page, false, mixedFiles);

        await openLawsuitsWorkspace(page);
        await selectArchiveJurisdictionTab(page, 'civil');

        await expect(page.getByText('مدعي اختبار')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('موكل أحوال')).toHaveCount(0);
    });
});

test.describe('Civil judiciary scenarios — extended branches', () => {
    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
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
        const clientPills = page.getByTestId('lawyer-new-case-mark-client');
        await clientPills.nth(0).evaluate((el) => (el as HTMLButtonElement).click());
        await expect(clientPills.nth(0)).toHaveAttribute('aria-pressed', 'true');
        await clientPills.nth(1).evaluate((el) => (el as HTMLButtonElement).click());
        await expect(clientPills.nth(0)).toHaveAttribute('aria-pressed', 'false');
        await expect(clientPills.nth(1)).toHaveAttribute('aria-pressed', 'true');
    });

    test('affiliative third party on plaintiff side persists', async ({ page }) => {
        test.setTimeout(120_000);
        const thirdName = 'انضمامي E2E';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, { undetermined: true });
        await addAffiliativeThirdParty(page, thirdName, 1);
        await expect(page.getByText('انضمامي — جانب المدعي')).toBeVisible();
        await clickLawyerNewCaseSave(page);
        await waitForPartyInFiles(page, thirdName, 30_000);
    });
});

test.describe('Civil judiciary scenarios — extraordinary procedure stages', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90_000);
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
    });

    test('retrial stage hides claim value and shows underlying stage field', async ({ page }) => {
        test.setTimeout(90_000);
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            stage: 'إعادة المحاكمة',
            markClient: false,
        });
        await expect(page.getByText('مرحلة المطلوب إعادة محاكمتها')).toBeVisible();
        await expect(page.getByText('القيمة التقديرية للدعوى')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'مرحلة المطلوب إعادة محاكمتها' })).toBeVisible();
    });

    test('absent objection underlying stage excludes appeal', async ({ page }) => {
        test.setTimeout(90_000);
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            stage: 'اعتراض على الحكم الغيابي',
            markClient: false,
        });
        await expect(page.getByText('مرحلة الحكم المُعترض عليه غيابياً')).toBeVisible();
        const underlying = page.getByRole('button', { name: 'مرحلة الحكم المُعترض عليه غيابياً' });
        await underlying.click({ force: true });
        const options = page.getByRole('option');
        await expect(options.filter({ hasText: 'بداءة بدرجة أولى' }).first()).toBeVisible();
        await expect(options.filter({ hasText: 'استئناف' })).toHaveCount(0);
        await page.keyboard.press('Escape');
    });

    test('extraordinary stage requires underlying stage before save', async ({ page }) => {
        test.setTimeout(90_000);
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            stage: 'اعتراض الغير',
            markClient: true,
        });
        await clickLawyerNewCaseSave(page);
        await expect(page.getByText('ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة').first()).toBeVisible();
        await expect(page.getByTestId('smart-file-dossier')).toHaveCount(0);
    });

    test('creates retrial case with underlying stage persisted', async ({ page }) => {
        test.setTimeout(120_000);
        const plaintiff = 'مدعي إعادة محاكمة';
        await openCivilNewCaseForm(page);
        await fillCivilNewCaseForm(page, {
            plaintiff,
            stage: 'إعادة المحاكمة',
            retrialTargetStage: 'بداءة بدرجة أولى',
        });
        await clickLawyerNewCaseSave(page);
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 25_000 });
        await waitForPartyInFiles(page, plaintiff, 30_000);

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
        await prepareCivilLawsuitsE2E(page);
        await seedUndeterminedCivilFile(page);
        await bootCivilLawsuitsScreenE2E(page, false, [buildE2eUndeterminedCivilFile()]);
        await openLawsuitDossierById(page, E2E_UNDETERMINED_FILE_ID);
        await openAppealGatewayAfterJudgment(page);
        await expect(page.getByText('دعوى غير مقدرة القيمة')).toBeVisible();
        await expect(page.getByRole('button', { name: 'تمييز' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'استئناف' })).toHaveCount(0);
    });
});
