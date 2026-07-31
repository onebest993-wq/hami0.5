import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { recoverLawyerDashboardBootError, stripBootFailureLayer } from './bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './productivityE2EFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';

async function waitForLawyerNewCaseChunks(page: Page, timeoutMs = 45_000) {
    await page
        .waitForResponse(
            (res) =>
                /LawyerNewCase|CivilNewCaseForm|PersonalStatusNewCase/i.test(res.url()) &&
                res.status() === 200,
            { timeout: timeoutMs },
        )
        .catch(() => undefined);
}

async function waitForCivilArchiveShell(page: Page) {
    const workspace = page.getByTestId('lawsuits-workspace');
    await workspace.getByTestId('lawsuits-civil-archive-instant-shell').waitFor({
        state: 'visible',
        timeout: 25_000,
    });
    await workspace.getByTestId('archive-jurisdiction-filters-toggle').waitFor({
        state: 'visible',
        timeout: 20_000,
    });
}

async function openAndSelectNewCaseJurisdiction(
    page: Page,
    jurisdiction: 'civil' | 'personal' | 'criminal',
) {
    const workspace = page.getByTestId('lawsuits-workspace');
    const addFab = workspace.getByTestId('lawsuits-add-new');
    const picker = workspace.getByTestId('lawsuits-jurisdiction-picker');
    await addFab.waitFor({ state: 'visible', timeout: 20_000 });
    await addFab.scrollIntoViewIfNeeded();
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await addFab.evaluate((el) => (el as HTMLButtonElement).click());
        if (await picker.isVisible({ timeout: 4_000 }).catch(() => false)) break;
        await page.waitForTimeout(350);
    }
    await expect(picker).toBeVisible({ timeout: 25_000 });
    const btn = picker.getByTestId(`new-case-jurisdiction-${jurisdiction}`);
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await waitForLawyerNewCaseChunks(page, 30_000);
    await page.evaluate((jurisdiction) => {
        const picker = document.querySelector('[data-testid="lawsuits-jurisdiction-picker"]');
        const target = picker?.querySelector(`[data-testid="new-case-jurisdiction-${jurisdiction}"]`);
        if (target instanceof HTMLButtonElement) target.click();
    }, jurisdiction);
    const instantShell = page.getByTestId('lawyer-new-case-instant-shell');
    if (await instantShell.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(instantShell).toBeHidden({ timeout: 90_000 });
    }
    await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible({ timeout: 30_000 });
}

async function openNewCaseJurisdictionPanel(page: Page) {
    const workspace = page.getByTestId('lawsuits-workspace');
    const addFab = workspace.getByTestId('lawsuits-add-new');
    const picker = workspace.getByTestId('lawsuits-jurisdiction-picker');
    await addFab.waitFor({ state: 'visible', timeout: 20_000 });
    await addFab.scrollIntoViewIfNeeded();
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await addFab.evaluate((el) => (el as HTMLButtonElement).click());
        if (await picker.isVisible({ timeout: 4_000 }).catch(() => false)) break;
        await page.waitForTimeout(350);
    }
    await expect(picker).toBeVisible({ timeout: 25_000 });
    await waitForLawyerNewCaseChunks(page, 30_000);
}

async function selectNewCaseJurisdiction(page: Page, jurisdiction: 'civil' | 'personal' | 'criminal') {
    const workspace = page.getByTestId('lawsuits-workspace');
    const picker = workspace.getByTestId('lawsuits-jurisdiction-picker');
    const btn = picker.getByTestId(`new-case-jurisdiction-${jurisdiction}`);
    if (!(await picker.isVisible({ timeout: 2_000 }).catch(() => false))) {
        await openNewCaseJurisdictionPanel(page);
    }
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await waitForLawyerNewCaseChunks(page, 30_000);
    await page.evaluate((jurisdiction) => {
        const picker = document.querySelector('[data-testid="lawsuits-jurisdiction-picker"]');
        const target = picker?.querySelector(`[data-testid="new-case-jurisdiction-${jurisdiction}"]`);
        if (target instanceof HTMLButtonElement) target.click();
    }, jurisdiction);
    const instantShell = page.getByTestId('lawyer-new-case-instant-shell');
    if (await instantShell.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(instantShell).toBeHidden({ timeout: 90_000 });
    }
    await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible({ timeout: 30_000 });
}

function civilCourtField(page: Page) {
    return page.getByLabel('اسم المحكمة المختصة');
}

function civilTypeField(page: Page) {
    return page.getByLabel('نوع الدعوى');
}

export const E2E_CIVIL_FILE_ID = 990_001;
export const E2E_CIVIL_FILE_ID_2 = 990_002;
export const E2E_UNDETERMINED_FILE_ID = 990_004;
export const LAWYER_FILES_KEY = 'lawyer_files';
const SUPABASE_AUTH_KEY = 'sb-wldjvjnodvyodmgbgzab-auth-token';
const LAST_SCREEN_KEY = 'hami:last-screen';

/** ملف دعوى مدنية كامل الشكل — متوافق مع isFileData و SmartFileModal */
export function buildE2eCivilLawsuitFile() {
    return {
        id: E2E_CIVIL_FILE_ID,
        type: 'lawsuit',
        status: 'active',
        caseNo: '100/2026',
        court: 'محكمة اختبار',
        docType: 'مدنية',
        date: '1/1/2026',
        parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 's1',
                name: 'البداءة',
                stageName: 'البداءة',
                status: 'active',
                caseNo: '100/2026',
                court: 'محكمة اختبار',
                parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    };
}

export function buildE2eUndeterminedCivilFile() {
    const parties = [
        { id: 1, name: 'مدعي غير مقدرة', role: 'المدعي', isClient: true, side: 'right' },
        { id: 2, name: 'مدعى عليه اختبار', role: 'المدعى عليه', isClient: false, side: 'left' },
    ];
    return {
        id: E2E_UNDETERMINED_FILE_ID,
        type: 'lawsuit',
        status: 'active',
        lawsuitJurisdiction: 'civil',
        isUndeterminedValue: true,
        caseNo: '400/2026',
        court: 'بداءة الكرخ',
        docType: 'دعوى تعويض',
        currentStage: 'بداءة بدرجة أخيرة',
        representedParty: 'المدعي',
        date: '1/1/2026',
        parties,
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 's4',
                name: 'البداءة',
                stageName: 'بداءة بدرجة أخيرة',
                status: 'active',
                caseNo: '400/2026',
                court: 'بداءة الكرخ',
                isUndeterminedValue: true,
                parties,
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    };
}

export async function seedUndeterminedCivilFile(page: Page) {
    const file = buildE2eUndeterminedCivilFile();
    await page.addInitScript(
        ({ storageKey, fileJson, authKey, lastScreenKey }) => {
            localStorage.setItem(storageKey, fileJson);
            sessionStorage.setItem(lastScreenKey, 'lawyer');
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
            localStorage.setItem(
                authKey,
                JSON.stringify({
                    access_token: 'e2e-dev-access-token-with-length-ok-abc',
                    refresh_token: 'e2e-dev-refresh-token',
                    expires_at: expiresAt,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user: {
                        id: 'dev-user-uuid-1',
                        email: 'dev@local',
                        role: 'authenticated',
                        user_metadata: { accountType: 'lawyer', fullName: 'E2E Dev' },
                    },
                }),
            );
        },
        {
            storageKey: LAWYER_FILES_KEY,
            fileJson: JSON.stringify([file]),
            authKey: SUPABASE_AUTH_KEY,
            lastScreenKey: LAST_SCREEN_KEY,
        },
    );
}

export async function openLawsuitDossierById(page: Page, fileId: number) {
    await page.getByTestId('hub-archive-lawsuit').click();
    await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
    const fileCard = page.getByTestId(`lawsuit-file-${fileId}`);
    if (await fileCard.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await fileCard.click();
    } else {
        await page.getByRole('button', { name: 'فتح الإضبارة' }).first().click({ timeout: 10_000 });
    }
    await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });
}

/** إضافة شخص ثالث انضمامي */
export async function addAffiliativeThirdParty(page: Page, name: string, side: 1 | 2) {
    const addBtn = page.getByTestId('lawyer-new-case-add-third-party');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });
    const heading = page.getByRole('heading', { name: 'إضافة شخص ثالث' });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const modal = page.locator('.max-w-xl').filter({ has: heading });
    await modal.getByTestId('lawyer-new-case-third-party-mode-affiliative').click({ force: true });
    const sideLabel = side === 1 ? 'الطرف الأول (المدعي)' : 'الطرف الثاني (المدعى عليه)';
    await modal.getByRole('button', { name: sideLabel }).click({ force: true });
    await modal.getByPlaceholder('الاسم الكامل').fill(name, { force: true });
    await modal.getByTestId('lawyer-new-case-third-party-confirm').click({ force: true });
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
}

/** حجز للقرار → ختام المرافعة → حكم → بوابة الطعn */
/** ختام المرافعة → حكم → بوابة الطعn */
export async function openAppealGatewayAfterJudgment(
    page: Page,
    judgmentLabel = 'رد الدعوى كلياً',
) {
    const closeBtn = page.getByRole('button', { name: 'ختام المرافعة' });
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /ختم المرافعة/ })).toBeVisible({ timeout: 15_000 });
    await page.getByText('اختر النتيجة...').click();
    await page.getByRole('option', { name: judgmentLabel }).click();
    await page.getByRole('button', { name: /حفظ والانتقال لمرحلة/ }).click();
    await expect(page.getByRole('heading', { name: /بوابة/ })).toBeVisible({ timeout: 15_000 });
}

export function buildE2eSecondCivilLawsuitFile() {
    return {
        id: E2E_CIVIL_FILE_ID_2,
        type: 'lawsuit',
        status: 'active',
        caseNo: '200/2026',
        court: 'محكمة ثانية اختبار',
        docType: 'مدنية',
        date: '2/1/2026',
        parties: [{ id: 2, name: 'مدعي ثانٍ', role: 'مدعي', isClient: true, side: 'right' }],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 's2',
                name: 'البداءة',
                stageName: 'البداءة',
                status: 'active',
                caseNo: '200/2026',
                court: 'محكمة ثانية اختبار',
                parties: [{ id: 2, name: 'مدعي ثانٍ', role: 'مدعي', isClient: true, side: 'right' }],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    };
}

export function buildE2eCivilLawsuitPair() {
    return [buildE2eCivilLawsuitFile(), buildE2eSecondCivilLawsuitFile()];
}

/** يضمن قراءة lawyer_files من localStorage قبل auto-save يفرغها */
async function hydrateLawyerFilesFromStorage(page: Page, files?: unknown[]): Promise<void> {
    const seedFiles = files ?? [buildE2eCivilLawsuitFile()];
    await page.evaluate((seed) => {
        localStorage.setItem('lawyer_files', JSON.stringify(seed));
        sessionStorage.setItem('hami:last-screen', 'lawyer');
    }, seedFiles);
    await page.reload({ waitUntil: 'domcontentloaded' });
}

export async function seedLawyerFiles(page: Page, multi = false) {
    const fileList = multi ? buildE2eCivilLawsuitPair() : [buildE2eCivilLawsuitFile()];
    await page.addInitScript(
        ({ storageKey, fileJson, authKey, lastScreenKey }) => {
            localStorage.setItem(storageKey, fileJson);
            sessionStorage.setItem(lastScreenKey, 'lawyer');
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
            localStorage.setItem(
                authKey,
                JSON.stringify({
                    access_token: 'e2e-dev-access-token-with-length-ok-abc',
                    refresh_token: 'e2e-dev-refresh-token',
                    expires_at: expiresAt,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user: {
                        id: 'dev-user-uuid-1',
                        email: 'dev@local',
                        role: 'authenticated',
                        user_metadata: { accountType: 'lawyer', fullName: 'E2E Dev' },
                    },
                }),
            );
        },
        {
            storageKey: LAWYER_FILES_KEY,
            fileJson: JSON.stringify(fileList),
            authKey: SUPABASE_AUTH_KEY,
            lastScreenKey: LAST_SCREEN_KEY,
        },
    );
}

export function buildE2eLawyerFilesJson(files?: unknown[]): string {
    return JSON.stringify(files ?? [buildE2eCivilLawsuitFile()]);
}

/** يضمن lawyer_files في SecureStore + localStorage بعد الإقلاع */
export async function hydrateLawyerFilesForE2E(page: Page, files?: unknown[]): Promise<void> {
    const fileJson = buildE2eLawyerFilesJson(files);
    await writeE2eSecureStoreKey(page, LAWYER_FILES_KEY, fileJson);
    await page.evaluate(
        ({ storageKey, json, lastScreenKey }) => {
            localStorage.setItem(storageKey, json);
            sessionStorage.setItem(lastScreenKey, 'lawyer');
        },
        { storageKey: LAWYER_FILES_KEY, json: fileJson, lastScreenKey: LAST_SCREEN_KEY },
    );
}

export async function prepareCivilLawsuitsE2E(page: Page, multi = false): Promise<void> {
    await prepareProductivityE2E(page);
    await seedLawyerFiles(page, multi);
}

/** إقلاع مستقر لمسار الدعاوى — hydrate + reload مثل الجنائي */
export async function bootCivilLawsuitsE2E(page: Page, multi = false): Promise<void> {
    const files = multi ? buildE2eCivilLawsuitPair() : [buildE2eCivilLawsuitFile()];
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await ensureLawyerDashboard(page, multi, files);
    await hydrateLawyerFilesForE2E(page, files);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureLawyerDashboard(page, multi, files);
}

/** @deprecated use hydrate via ensureLawyerDashboard */
export async function reinforceLawyerFilesSeed(page: Page): Promise<void> {
    await hydrateLawyerFilesFromStorage(page);
}

/** يصل إلى لوحة المحامي الرئيسية بعد الإقلاع — مسار الدعاوى يحتاج hub فقط بلا انتظار الدوك */
async function assertDashboardChromeReady(page: Page): Promise<void> {
    await stripBootFailureLayer(page);
    await dismissProductivityBlockers(page);
    await recoverLawyerDashboardBootError(page);

    const dashboardUp = await page
        .getByTestId('lawyer-dashboard-ready')
        .isVisible({ timeout: 20_000 })
        .catch(() => false);
    if (!dashboardUp) {
        await hydrateLawyerFilesFromStorage(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await stripBootFailureLayer(page);
        await dismissProductivityBlockers(page);
        await recoverLawyerDashboardBootError(page);
    }

    await expect(page.getByTestId('lawyer-dashboard-ready')).toBeVisible({ timeout: 45_000 });
    await stripBootFailureLayer(page);
    await dismissProductivityBlockers(page);

    const homeTab = page.getByTestId('lawyer-home-tab');
    if (await homeTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const hub = page.getByTestId('hub-archive-lawsuit');
        if (!(await hub.isVisible({ timeout: 4_000 }).catch(() => false))) {
            await homeTab.evaluate((el) => (el as HTMLButtonElement).click());
        }
    }

    await expect(async () => {
        const hub = page.getByTestId('hub-archive-lawsuit');
        await hub.scrollIntoViewIfNeeded();
        await expect(hub).toBeVisible({ timeout: 8_000 });
    }).toPass({ timeout: 45_000 });
}

export async function ensureLawyerDashboard(
    page: Page,
    multi = false,
    customFiles?: unknown[],
    options?: { requireHub?: boolean },
) {
    const requireHub = options?.requireHub !== false;
    const seedFiles = customFiles ?? (multi ? buildE2eCivilLawsuitPair() : undefined);
    const hub = page.getByTestId('hub-archive-lawsuit');
    const dashboardReady = page.getByTestId('lawyer-dashboard-ready');

    const onReady = await dashboardReady.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!onReady) {
        await hydrateLawyerFilesFromStorage(page, seedFiles);
    } else if (seedFiles) {
        await page.evaluate((seed) => {
            localStorage.setItem('lawyer_files', JSON.stringify(seed));
        }, seedFiles);
    }

    const dossierBack = page.getByTestId('smart-file-back');
    if (await dossierBack.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await dossierBack.click({ noWaitAfter: true });
    }

    await assertDashboardChromeReady(page);
    if (requireHub && !(await hub.isVisible().catch(() => false))) {
        await expect(hub).toBeVisible({ timeout: 30_000 });
    }
}

/** @deprecated use ensureLawyerDashboard */
export async function bypassDevLogin(page: Page) {
    await ensureLawyerDashboard(page);
}

export async function openCivilDossier(page: Page) {
    await openLawsuitsWorkspace(page);
    await page.getByTestId('lawsuits-tab-civil').click({ timeout: 5_000 }).catch(() => undefined);
    const fileCard = page.getByTestId(`lawsuit-file-${E2E_CIVIL_FILE_ID}`);
    if (await fileCard.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await fileCard.click();
    } else {
        await page.getByRole('button', { name: 'فتح الإضبارة' }).first().click({ timeout: 10_000 });
    }
    await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });
}

export const E2E_TASK_TITLE = 'مهمة E2E إدارية';

/** إضافة مهمة إدارية داخل الإضبارة المفتوحة */
export async function addAdministrativeTask(page: Page, title: string = E2E_TASK_TITLE) {
    const addBtn = page.getByTestId('smart-file-task-add');
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    const modalHeading = page.getByRole('heading', { name: 'إضافة مهمة إدارية' });
    await expect(modalHeading).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('smart-file-task-title').fill(title);
    await page.getByTestId('smart-file-task-submit').click();
    await expect(modalHeading).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
}

/** يفتح مساحة الدعاوى من بطاقة الرئيسية */
export async function openLawsuitsWorkspace(page: Page) {
    await dismissProductivityBlockers(page);
    const trigger = page.getByTestId('hub-archive-lawsuit');
    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await trigger.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 25_000 });
    const workspace = page.getByTestId('lawsuits-workspace');
    const civilTab = workspace.getByTestId('lawsuits-tab-civil');
    if (await civilTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await civilTab.click({ timeout: 5_000 }).catch(() => undefined);
    }
    await waitForCivilArchiveShell(page);
    await expect(async () => {
        await expect(workspace.getByTestId('lawsuits-add-new')).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
}

/** اختيار قيمة من CaseFieldSelect (زر + listbox) بدل select الأصلي */
export async function selectCaseFieldOption(
    page: Page,
    ariaLabel: string | RegExp,
    optionLabel: string,
) {
    const trigger = page.getByRole('button', { name: ariaLabel }).first();
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ force: true });
    const option = page.getByRole('option', { name: optionLabel });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click({ force: true });
    await page.keyboard.press('Escape').catch(() => undefined);
    await expect(trigger).toContainText(optionLabel, { timeout: 8_000 });
}

/** فتح نموذج إنشاء دعوى أحوال شخصية من مخزن الدعاوى */
export async function openPersonalNewCaseForm(page: Page) {
    await openLawsuitsWorkspace(page);
    await openAndSelectNewCaseJurisdiction(page, 'personal');
    await expect(page.getByRole('heading', { name: 'إضبارة الأحوال الشخصية' })).toBeVisible({
        timeout: 20_000,
    });
}

/** تعبئة نموذج أحوال شخصية minimal */
export async function fillMinimalPersonalNewCase(
    page: Page,
    opts: {
        court?: string;
        type?: string;
        number?: string;
        plaintiff?: string;
        defendant?: string;
        applicableLawLabel?: string;
    } = {},
) {
    const court = opts.court ?? 'محكمة الأحوال الشخصية';
    const type = opts.type ?? 'دعوى طلاق';
    const number = opts.number ?? '15/ش/2026';
    const plaintiff = opts.plaintiff ?? 'مدعي أحوال E2E';
    const defendant = opts.defendant ?? 'مدعى عليه أحوال E2E';
    const lawLabel =
        opts.applicableLawLabel ?? 'قانون الأحوال الشخصية رقم 188 لسنة 1959';

    await page.getByPlaceholder('15/ش/2026').fill(number, { force: true });
    await page.getByPlaceholder('اسم المحكمة...').fill(court, { force: true });
    await page.getByPlaceholder('طلاق، نفقة، حضانة...').fill(type, { force: true });

    const stageBtn = page.getByRole('button', { name: 'أحوال شخصية', exact: true });
    if (await stageBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await stageBtn.click({ force: true });
    }

    await page.getByRole('checkbox', { name: lawLabel }).click({ force: true });

    await page.getByRole('button', { name: 'الأطراف' }).click({ force: true });

    const nameInputs = page.getByPlaceholder('الاسم الكامل');
    await nameInputs.nth(0).scrollIntoViewIfNeeded();
    await nameInputs.nth(0).fill(plaintiff, { force: true });
    await nameInputs.nth(1).fill(defendant, { force: true });
    await page.getByRole('button', { name: 'موكل' }).first().click({ force: true });
}

/** فتح نموذج إنشاء دعوى مدنية من مخزن الدعاوى */
export async function openCivilNewCaseForm(page: Page) {
    await openLawsuitsWorkspace(page);
    await openAndSelectNewCaseJurisdiction(page, 'civil');
}

/** تعبئة نموذج دعوى مدنية minimal وحفظها */
export async function fillMinimalCivilNewCase(page: Page, opts: {
    court?: string;
    type?: string;
    stage?: string;
    plaintiff?: string;
    defendant?: string;
} = {}) {
    const court = opts.court ?? 'بداءة الكرخ';
    const type = opts.type ?? 'دعوى تعويض';
    const stage = opts.stage ?? 'بداءة بدرجة أخيرة';
    const plaintiff = opts.plaintiff ?? 'مدعي E2E';
    const defendant = opts.defendant ?? 'مدعى عليه E2E';

    await civilCourtField(page).fill(court, { force: true });
    await civilTypeField(page).fill(type, { force: true });
    await page.getByRole('checkbox', { name: 'دعوى غير مقدرة القيمة' }).click({ force: true });
    await selectCaseFieldOption(page, 'المرحلة الحالية', stage);

    const nameInputs = page.getByPlaceholder('الاسم الكامل');
    await nameInputs.nth(0).scrollIntoViewIfNeeded();
    await nameInputs.nth(0).fill(plaintiff, { force: true });
    await nameInputs.nth(1).fill(defendant, { force: true });
    await page.getByRole('button', { name: 'موكل' }).first().click({ force: true });
}

/** تعبئة نموذج مدني مع تحكم كامل بالقيمة والموكل */
export async function fillCivilNewCaseForm(page: Page, opts: {
    court?: string;
    type?: string;
    stage?: string;
    claimValue?: string;
    undetermined?: boolean;
    fixedFeeToggle?: boolean;
    plaintiff?: string;
    defendant?: string;
    markClient?: boolean;
    /** مرحلة الحكم الأصلي — إجراءات استثنائية (إعادة محاكمة / اعتراض غيابي / اعتراض الغير) */
    retrialTargetStage?: string;
} = {}) {
    const court = opts.court ?? 'بداءة الكرخ';
    const type = opts.type ?? 'دعوى تعويض';
    const stage = opts.stage ?? 'بداءة بدرجة أخيرة';
    const plaintiff = opts.plaintiff ?? 'مدعي E2E';
    const defendant = opts.defendant ?? 'مدعى عليه E2E';
    const markClient = opts.markClient ?? true;

    await civilCourtField(page).fill(court, { force: true });

    if (opts.undetermined) {
        await page.getByRole('checkbox', { name: 'دعوى غير مقدرة القيمة' }).click({ force: true });
    }
    if (opts.fixedFeeToggle) {
        await page.getByRole('checkbox', { name: 'دعوى خاضعة للرسم المقطوع' }).click({ force: true });
    }

    // مرحلة أولاً ثم النوع/القيمة — حتى تبقى قواعد التبديل التلقائي هي الأخيرة
    await selectCaseFieldOption(page, 'المرحلة الحالية', stage);

    if (opts.retrialTargetStage) {
        await selectCaseFieldOption(
            page,
            /مرحلة المطلوب|مرحلة الحكم المُعترض|مرحلة الحكم الأصلي/,
            opts.retrialTargetStage,
        );
    }

    await civilTypeField(page).fill(type, { force: true });

    if (opts.claimValue) {
        const valueInput = page.getByTestId('lawyer-new-case-claim-value');
        await valueInput.scrollIntoViewIfNeeded();
        await expect(valueInput).toBeEnabled({ timeout: 8_000 });
        await valueInput.click({ force: true });
        await valueInput.fill('');
        await valueInput.pressSequentially(opts.claimValue, { delay: 15 });
        await page.waitForTimeout(200);
    }

    const nameInputs = page.getByPlaceholder('الاسم الكامل');
    await nameInputs.nth(0).scrollIntoViewIfNeeded();
    await nameInputs.nth(0).fill(plaintiff, { force: true });
    await nameInputs.nth(1).fill(defendant, { force: true });

    if (markClient) {
        const clientBtn = page.getByRole('button', { name: 'موكل' }).first();
        await clientBtn.scrollIntoViewIfNeeded();
        await clientBtn.click({ force: true });
    }
}

/** انتظار تحديث المرحلة تلقائياً حسب القيمة */
export async function expectStageSelectValue(page: Page, expected: string, timeoutMs = 12_000) {
    const trigger = page.getByRole('button', { name: 'المرحلة الحالية' }).first();
    await expect(trigger).toContainText(expected, { timeout: timeoutMs });
}

/** إضافة شخص ثالث اختصامي من نموذج إنشاء دعوى */
export async function addInterpleaderThirdParty(page: Page, name: string) {
    const addBtn = page.getByTestId('lawyer-new-case-add-third-party');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });
    const heading = page.getByRole('heading', { name: 'إضافة شخص ثالث' });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const modal = page.locator('.max-w-xl').filter({ has: heading });
    await modal.getByTestId('lawyer-new-case-third-party-mode-interpleader').click({ force: true });
    await modal.getByPlaceholder('الاسم الكامل').fill(name, { force: true });
    await modal.getByTestId('lawyer-new-case-third-party-confirm').click({ force: true });
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
}

export function buildE2ePersonalStatusFile() {
    return {
        id: 990_003,
        type: 'lawsuit',
        status: 'active',
        lawsuitJurisdiction: 'personal',
        caseNo: '300/2026',
        court: 'محكمة الأحوال الشخصية',
        docType: 'طلاق',
        date: '3/1/2026',
        parties: [{ id: 3, name: 'موكل أحوال', role: 'مدعي', isClient: true, side: 'right' }],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 's3',
                name: 'البداءة',
                stageName: 'البداءة',
                status: 'active',
                caseNo: '300/2026',
                court: 'محكمة الأحوال الشخصية',
                parties: [{ id: 3, name: 'موكل أحوال', role: 'مدعي', isClient: true, side: 'right' }],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    };
}

export async function seedMixedJurisdictionFiles(page: Page) {
    const files = [buildE2eCivilLawsuitFile(), buildE2ePersonalStatusFile()];
    await page.addInitScript(
        ({ storageKey, fileJson, authKey, lastScreenKey }) => {
            localStorage.setItem(storageKey, fileJson);
            sessionStorage.setItem(lastScreenKey, 'lawyer');
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
            localStorage.setItem(
                authKey,
                JSON.stringify({
                    access_token: 'e2e-dev-access-token-with-length-ok-abc',
                    refresh_token: 'e2e-dev-refresh-token',
                    expires_at: expiresAt,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user: {
                        id: 'dev-user-uuid-1',
                        email: 'dev@local',
                        role: 'authenticated',
                        user_metadata: { accountType: 'lawyer', fullName: 'E2E Dev' },
                    },
                }),
            );
        },
        {
            storageKey: LAWYER_FILES_KEY,
            fileJson: JSON.stringify(files),
            authKey: SUPABASE_AUTH_KEY,
            lastScreenKey: LAST_SCREEN_KEY,
        },
    );
}

export function extractFileFlags(file: unknown): {
    isUndeterminedValue?: boolean;
    isFixedFee?: boolean;
    claimValue?: string;
    currentStage?: string;
    lawsuitJurisdiction?: string;
    retrialTargetStage?: string;
} {
    if (!file || typeof file !== 'object') return {};
    const f = file as Record<string, unknown>;
    const rawClaim = typeof f.claimValue === 'string' ? f.claimValue : undefined;
    const normalizedClaim = rawClaim ? rawClaim.replace(/[^\d]/g, '') : undefined;
    return {
        isUndeterminedValue: f.isUndeterminedValue === true ? true : undefined,
        isFixedFee: f.isFixedFee === true ? true : undefined,
        claimValue: normalizedClaim || undefined,
        currentStage: typeof f.currentStage === 'string' ? f.currentStage : undefined,
        lawsuitJurisdiction:
            typeof f.lawsuitJurisdiction === 'string' ? f.lawsuitJurisdiction : undefined,
        retrialTargetStage:
            typeof f.retrialTargetStage === 'string' ? f.retrialTargetStage : undefined,
    };
}

export function extractPartyNamesFromFile(file: unknown): string[] {
    if (!file || typeof file !== 'object') return [];
    const names: string[] = [];
    const push = (list: unknown) => {
        if (!Array.isArray(list)) return;
        for (const p of list) {
            if (p && typeof p === 'object' && typeof (p as { name?: string }).name === 'string') {
                names.push((p as { name: string }).name);
            }
        }
    };
    const f = file as Record<string, unknown>;
    push(f.parties);
    if (Array.isArray(f.stages)) {
        for (const stage of f.stages) {
            if (stage && typeof stage === 'object') {
                push((stage as { parties?: unknown }).parties);
            }
        }
    }
    return names;
}

/** يُفرغ كتابة lawyer_files المؤجّلة قبل قراءة التخزين في E2E */
export async function flushLawyerFilesPersist(page: Page): Promise<void> {
    if (page.isClosed()) return;
    try {
        await page.evaluate(async (storageKey) => {
            try {
                const mod = await import('/src/app/services/SecureStoreService.ts');
                const Svc = mod.default ?? mod.SecureStoreService;
                Svc.flushHeavyPersistPending?.();
                await Svc.ensurePersistedReady?.();
            } catch {
                try {
                    Object.defineProperty(document, 'visibilityState', {
                        configurable: true,
                        get: () => 'hidden',
                    });
                    document.dispatchEvent(new Event('visibilitychange'));
                } catch {
                    /* ignore */
                }
                await new Promise((resolve) => setTimeout(resolve, 1_400));
            }

            await new Promise((resolve) => setTimeout(resolve, 300));

            try {
                const mod = await import('/src/app/services/SecureStoreService.ts');
                const Svc = mod.default ?? mod.SecureStoreService;
                const raw = Svc.getItemSync?.(storageKey);
                if (typeof raw === 'string' && raw.trim()) {
                    localStorage.setItem(storageKey, raw);
                }
            } catch {
                /* ignore */
            }
        }, LAWYER_FILES_KEY);
    } catch {
        /* الصفحة أُغلقت أو أُعيد تحميلها أثناء الـ flush */
    }
}

export async function waitForPartyInFiles(page: Page, name: string, timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    while (Date.now() < deadline) {
        if (attempt === 0 || attempt % 5 === 0) {
            await flushLawyerFilesPersist(page);
        }
        try {
            const files = await readLawyerFilesFromPage(page);
            if (files.some((f) => extractPartyNamesFromFile(f).includes(name))) return;
        } catch {
            /* context destroyed — أعد المحاولة */
        }
        await page.waitForTimeout(400);
        attempt += 1;
    }
    await flushLawyerFilesPersist(page);
    try {
        const files = await readLawyerFilesFromPage(page);
        if (files.some((f) => extractPartyNamesFromFile(f).includes(name))) return;
    } catch {
        /* ignore */
    }
    throw new Error(`Party "${name}" not found in ${LAWYER_FILES_KEY} within ${timeoutMs}ms`);
}

export async function readLawyerFilesFromPage(page: Page): Promise<unknown[]> {
    return page.evaluate(
        async ({ storageKey }) => {
            const parse = (raw: string | null) => {
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const readFromIdb = (): Promise<string | null> =>
                new Promise((resolve) => {
                    try {
                        const req = indexedDB.open('hami-secure-store', 1);
                        req.onerror = () => resolve(null);
                        req.onsuccess = () => {
                            const db = req.result;
                            if (!db.objectStoreNames.contains('secure_kv')) {
                                db.close();
                                resolve(null);
                                return;
                            }
                            const tx = db.transaction('secure_kv', 'readonly');
                            const getReq = tx.objectStore('secure_kv').get(storageKey);
                            getReq.onsuccess = () => {
                                db.close();
                                const val = getReq.result;
                                resolve(typeof val === 'string' ? val : null);
                            };
                            getReq.onerror = () => {
                                db.close();
                                resolve(null);
                            };
                        };
                    } catch {
                        resolve(null);
                    }
                });

            const fromIdb = parse(await readFromIdb());
            const fromLs = parse(localStorage.getItem(storageKey));

            if (fromIdb.length === 0) return fromLs;
            if (fromLs.length === 0) return fromIdb;

            const byId = new Map<string, unknown>();
            for (const file of [...fromIdb, ...fromLs]) {
                if (!file || typeof file !== 'object') continue;
                const id = String((file as { id?: unknown }).id ?? '');
                if (!id) continue;
                byId.set(id, file);
            }
            return Array.from(byId.values());
        },
        { storageKey: LAWYER_FILES_KEY },
    );
}

export function extractTaskTitlesFromFile(file: unknown): string[] {
    if (!file || typeof file !== 'object') return [];
    const f = file as Record<string, unknown>;
    const titles: string[] = [];
    const pushFrom = (list: unknown) => {
        if (!Array.isArray(list)) return;
        for (const t of list) {
            if (t && typeof t === 'object' && typeof (t as { title?: string }).title === 'string') {
                titles.push((t as { title: string }).title);
            }
        }
    };
    pushFrom(f.tasks);
    if (Array.isArray(f.stages)) {
        for (const stage of f.stages) {
            if (stage && typeof stage === 'object') {
                pushFrom((stage as { tasks?: unknown }).tasks);
            }
        }
    }
    return titles;
}

export async function waitForTaskPersisted(page: Page, fileId: number, title: string, timeoutMs = 8_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const files = await readLawyerFilesFromPage(page);
        const file = files.find((f) => (f as { id?: number }).id === fileId);
        if (extractTaskTitlesFromFile(file).includes(title)) return;
        await page.waitForTimeout(400);
    }
    throw new Error(`Task "${title}" not found in ${LAWYER_FILES_KEY} within ${timeoutMs}ms`);
}

export const E2E_SESSION_PROCEEDINGS = 'E2E مجريات الجلسة';
export const E2E_SESSION_JUDGE_DECISION = 'E2E قرار القاضي';

/** فتح لوحة محضر الدعوى داخل الإضبارة */
export async function openSessionRecordPanel(page: Page) {
    const openBtn = page.getByTestId('smart-file-session-record-open');
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click();
    await expect(page.getByTestId('smart-file-session-record-panel')).toBeVisible({ timeout: 10_000 });
}

/** تعبئة محضر جلسة وتسجيله */
export async function saveSessionRecord(
    page: Page,
    opts: { proceedings?: string; judgeDecisions?: string } = {},
) {
    const proceedings = opts.proceedings ?? E2E_SESSION_PROCEEDINGS;
    const judgeDecisions = opts.judgeDecisions ?? E2E_SESSION_JUDGE_DECISION;

    await page.getByTestId('smart-file-session-record-proceedings').fill(proceedings);
    await page.getByTestId('smart-file-session-record-judge-decisions').fill(judgeDecisions);
    await page.getByTestId('smart-file-session-record-add').click();
    await expect(page.getByTestId('smart-file-session-record-panel')).toBeHidden({ timeout: 10_000 });
}

export function extractSessionRecordTitlesFromFile(file: unknown): string[] {
    if (!file || typeof file !== 'object') return [];
    const titles: string[] = [];
    const pushFromTimeline = (list: unknown) => {
        if (!Array.isArray(list)) return;
        for (const ev of list) {
            if (ev && typeof ev === 'object') {
                const title = (ev as { title?: string }).title;
                if (typeof title === 'string' && /محضر\s*الجلسة/i.test(title)) {
                    titles.push(title);
                }
            }
        }
    };
    const f = file as Record<string, unknown>;
    pushFromTimeline(f.timeline);
    if (Array.isArray(f.stages)) {
        for (const stage of f.stages) {
            if (stage && typeof stage === 'object') {
                pushFromTimeline((stage as { timeline?: unknown }).timeline);
            }
        }
    }
    return titles;
}

export async function waitForSessionRecordPersisted(
    page: Page,
    fileId: number,
    titlePattern: RegExp,
    timeoutMs = 12_000,
) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const files = await readLawyerFilesFromPage(page);
        const file = files.find((f) => Number((f as { id?: number }).id) === fileId);
        const titles = extractSessionRecordTitlesFromFile(file);
        if (titles.some((t) => titlePattern.test(t))) return;
        await page.waitForTimeout(400);
    }
    throw new Error(`Session record matching ${titlePattern} not found in ${LAWYER_FILES_KEY} within ${timeoutMs}ms`);
}

export async function openLegalActionsMenu(page: Page) {
    const legalBtn = page.getByRole('button', { name: /إجراءات الدعوى/i });
    await legalBtn.scrollIntoViewIfNeeded();
    await legalBtn.click();
    await expect(page.getByRole('button', { name: 'توحيد الدعاوى' })).toBeVisible({ timeout: 10_000 });
}

export async function openCaseConsolidationModal(page: Page) {
    await openLegalActionsMenu(page);
    await page.getByRole('button', { name: 'توحيد الدعاوى' }).click();
    await expect(page.getByText('توحيد الدعاوى', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
}

export async function openCaseLinkModal(page: Page) {
    await openLegalActionsMenu(page);
    await page.getByRole('button', { name: 'ربط الدعوى' }).click();
    await expect(page.getByText('ربط الدعوى', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
}
