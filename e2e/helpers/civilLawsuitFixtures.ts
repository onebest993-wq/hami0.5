import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
    applyE2eBootHomeLayoutAtRuntime,
    bootToLawyerHome,
    recoverLawyerDashboardBootError,
} from './bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './productivityE2EFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';
import { lawyerDashboardReady } from './lawyerDashboardLocators';

export { lawyerDashboardReady } from './lawyerDashboardLocators';

/** Host المفتوح فقط — يتجاهل InstantChrome (بدون data-open) وkeep-alive المخفي. */
function lawsuitsWorkspaceOpen(page: Page) {
    return page.locator('[data-testid="lawsuits-workspace"][data-open="true"]:visible');
}

async function expectArchiveSurfaceReady(host: Locator, timeoutMs = 20_000) {
    await expect(host.getByTestId('lawsuits-add-new')).toBeVisible({ timeout: timeoutMs });
    await expect(
        host.getByTestId('lawsuit-archive-grid').or(host.getByTestId('lawsuit-archive-empty')),
    ).toBeVisible({ timeout: timeoutMs });
}

/** Playwright locator.fill يعلق على Vite عند إعادة تركيب React — نكتب القيمة في DOM. */
async function nativeSetInputValue(page: Page, selector: string, index: number, value: string) {
    await page.evaluate(
        ({ sel, idx, val }) => {
            const nodes = Array.from(document.querySelectorAll(sel)).filter((el) => {
                if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
                    return false;
                }
                const style = getComputedStyle(el);
                return style.visibility !== 'hidden' && style.display !== 'none' && !el.disabled;
            }) as Array<HTMLInputElement | HTMLTextAreaElement>;
            const el = nodes[idx];
            if (!el) throw new Error(`${sel}[${idx}] not in view (visible=${nodes.length})`);
            el.focus();
            const proto =
                el instanceof HTMLTextAreaElement
                    ? HTMLTextAreaElement.prototype
                    : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { sel: selector, idx: index, val: value },
    );
}

async function nativeFillByPlaceholder(page: Page, placeholder: string, value: string, index = 0) {
    await expect(page.getByPlaceholder(placeholder).nth(index)).toBeVisible({ timeout: 15_000 });
    await page.evaluate(
        ({ ph, val, idx }) => {
            const nodes = Array.from(document.querySelectorAll('input, textarea')).filter((el) => {
                if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
                    return false;
                }
                if (el.placeholder !== ph || el.disabled) return false;
                const style = getComputedStyle(el);
                return style.visibility !== 'hidden' && style.display !== 'none';
            }) as Array<HTMLInputElement | HTMLTextAreaElement>;
            const el = nodes[idx];
            if (!el) throw new Error(`placeholder=${ph}[${idx}] missing (visible=${nodes.length})`);
            el.focus();
            const proto =
                el instanceof HTMLTextAreaElement
                    ? HTMLTextAreaElement.prototype
                    : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { ph: placeholder, val: value, idx: index },
    );
}

async function nativeFillByTestId(page: Page, testId: string, value: string) {
    await expect(page.getByTestId(testId)).toBeVisible({ timeout: 15_000 });
    await nativeSetInputValue(page, `[data-testid="${testId}"]`, 0, value);
}

async function nativeFillThirdPartyName(page: Page, name: string) {
    await expect(page.getByRole('heading', { name: 'إضافة شخص ثالث' })).toBeVisible({ timeout: 10_000 });
    await page.evaluate((val) => {
        const heading = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]')).find((el) =>
            (el.textContent ?? '').includes('إضافة شخص ثالث'),
        );
        const root =
            heading?.closest('.max-w-xl') ??
            heading?.closest('[role="dialog"]') ??
            heading?.parentElement;
        const el = root?.querySelector('input[placeholder="الاسم الكامل"]');
        if (!(el instanceof HTMLInputElement) || el.disabled) {
            throw new Error('third-party name input missing');
        }
        el.focus();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, val);
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, name);
}

async function fillPartyFullNames(page: Page, plaintiff: string, defendant: string) {
    const boxes = page.getByRole('textbox', { name: 'الاسم الكامل' });
    await expect(boxes.nth(0)).toBeVisible({ timeout: 15_000 });
    await expect(boxes.nth(1)).toBeVisible({ timeout: 15_000 });

    const placeholderSel = 'input[placeholder="الاسم الكامل"]';
    const ariaSel = 'input[aria-label="الاسم الكامل"]';
    const placeholderCount = await page.locator(placeholderSel).count();
    const selector = placeholderCount >= 2 ? placeholderSel : ariaSel;

    await nativeSetInputValue(page, selector, 0, plaintiff);
    await nativeSetInputValue(page, selector, 1, defendant);
}

export async function fillLabeledInput(page: Page, labelText: string, value: string) {
    await expect(
        page
            .getByLabel(labelText)
            .or(
                page
                    .locator('label')
                    .filter({ hasText: labelText })
                    .locator('xpath=following-sibling::input[1]'),
            )
            .first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.evaluate(
        ({ label, val }) => {
            const setNative = (el: HTMLInputElement) => {
                el.focus();
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, val);
                el.dispatchEvent(new InputEvent('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            };
            const labels = Array.from(document.querySelectorAll('label')).filter((l) =>
                (l.textContent ?? '').includes(label),
            );
            for (const lab of labels) {
                const style = getComputedStyle(lab);
                if (style.visibility === 'hidden' || style.display === 'none') continue;
                const nested = lab.querySelector('input');
                const sibling = lab.nextElementSibling;
                const byFor = lab.htmlFor ? document.getElementById(lab.htmlFor) : null;
                const el = [nested, sibling, byFor].find(
                    (n) => n instanceof HTMLInputElement && !n.disabled,
                ) as HTMLInputElement | undefined;
                if (el) {
                    setNative(el);
                    return;
                }
            }
            const aria = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
            if (aria && !aria.disabled) {
                setNative(aria);
                return;
            }
            throw new Error(`labeled input missing: ${label}`);
        },
        { label: labelText, val: value },
    );
}

export function visibleTestId(page: Page, testId: string) {
    return page.locator(`[data-testid="${testId}"]:visible`);
}

export async function clickVisibleTestId(page: Page, testId: string) {
    const loc = visibleTestId(page, testId);
    await expect(loc).toBeVisible({ timeout: 15_000 });
    await page.evaluate((id) => {
        const host =
            document.querySelector(
                `[data-testid="lawsuits-workspace"][data-open="true"] [data-testid="${id}"]`,
            ) ??
            Array.from(document.querySelectorAll(`[data-testid="${id}"]`)).find((el) => {
                const style = getComputedStyle(el);
                return style.visibility !== 'hidden' && style.display !== 'none';
            });
        if (!(host instanceof HTMLElement)) throw new Error(`${id} not in view`);
        host.scrollIntoView({ block: 'center', inline: 'nearest' });
        host.click();
    }, testId);
}

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

async function openAndSelectNewCaseJurisdiction(
    page: Page,
    jurisdiction: 'civil' | 'personal' | 'criminal',
) {
    await openNewCaseJurisdictionPanel(page);
    await selectNewCaseJurisdiction(page, jurisdiction);
}

/** نقر حفظ النموذج عبر DOM — Playwright locator.evaluate يعلق إذا تغيّرت الشجرة أثناء الفتح. */
export async function clickLawyerNewCaseSave(page: Page) {
    await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('lawyer-new-case-save')).toBeEnabled({ timeout: 8_000 });
    await page.evaluate(() => {
        const el = document.querySelector('[data-testid="lawyer-new-case-save"]');
        if (!(el instanceof HTMLButtonElement) || el.disabled) {
            throw new Error('lawyer-new-case-save missing or disabled');
        }
        el.click();
    });
}

/** تعليم الطرف الأول كموكل — زر الأحوال «تعيين كموكل» والمدني «موكل» يشتركان في نفس testid. */
export async function markFirstPartyAsClient(page: Page) {
    const btn = page.getByTestId('lawyer-new-case-mark-client').first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    if ((await btn.getAttribute('aria-pressed')) === 'true') return;
    await page.evaluate(() => {
        const buttons = Array.from(
            document.querySelectorAll('[data-testid="lawyer-new-case-mark-client"]'),
        ) as HTMLButtonElement[];
        const target =
            buttons.find((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            }) ?? buttons[0];
        if (!target) throw new Error('lawyer-new-case-mark-client missing');
        target.click();
    });
    await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: 8_000 });
}

async function openNewCaseJurisdictionPanel(page: Page) {
    const addFab = visibleTestId(page, 'lawsuits-add-new');
    if (!(await addFab.isVisible({ timeout: 8_000 }).catch(() => false))) {
        await openLawsuitsWorkspace(page);
        await ensureLawsuitsAddFab(page);
    }
    await expect(addFab).toBeVisible({ timeout: 20_000 });
    const picker = visibleTestId(page, 'lawsuits-jurisdiction-picker');
    await addFab.scrollIntoViewIfNeeded().catch(() => undefined);
    for (let attempt = 0; attempt < 4; attempt += 1) {
        await page.evaluate(() => {
            const buttons = Array.from(
                document.querySelectorAll('[data-testid="lawsuits-add-new"]'),
            ) as HTMLButtonElement[];
            const btn = buttons.find((el) => {
                const ws = el.closest('[data-testid="lawsuits-workspace"]');
                if (ws?.getAttribute('data-open') === 'false') return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
            if (!btn) throw new Error('lawsuits-add-new not clickable');
            btn.click();
        });
        if (await picker.isVisible({ timeout: 4_000 }).catch(() => false)) break;
        await page.waitForTimeout(350);
    }
    await expect(picker).toBeVisible({ timeout: 25_000 });
    await waitForLawyerNewCaseChunks(page, 30_000);
}

async function selectNewCaseJurisdiction(page: Page, jurisdiction: 'civil' | 'personal' | 'criminal') {
    const picker = visibleTestId(page, 'lawsuits-jurisdiction-picker');
    const btn = picker.getByTestId(`new-case-jurisdiction-${jurisdiction}`);
    if (!(await picker.isVisible({ timeout: 2_000 }).catch(() => false))) {
        await openNewCaseJurisdictionPanel(page);
    }
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await waitForLawyerNewCaseChunks(page, 30_000);
    await page.evaluate((jurisdiction) => {
        const pickers = Array.from(
            document.querySelectorAll('[data-testid="lawsuits-jurisdiction-picker"]'),
        ) as HTMLElement[];
        const picker =
            pickers.find((el) => el.offsetParent !== null || el.getClientRects().length > 0) ??
            pickers[0];
        const target = picker?.querySelector(
            `[data-testid="new-case-jurisdiction-${jurisdiction}"]`,
        );
        if (target instanceof HTMLButtonElement) target.click();
    }, jurisdiction);
    const instantShell = page.getByTestId('lawyer-new-case-instant-shell');
    if (await instantShell.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(instantShell).toBeHidden({ timeout: 45_000 });
    }
    const save = page.getByTestId('lawyer-new-case-save');
    if (await save.isVisible({ timeout: 12_000 }).catch(() => false)) return;
    await openNewCaseJurisdictionPanel(page);
    await page.evaluate((jurisdiction) => {
        const pickers = Array.from(
            document.querySelectorAll('[data-testid="lawsuits-jurisdiction-picker"]'),
        ) as HTMLElement[];
        const pickerEl =
            pickers.find((el) => el.offsetParent !== null || el.getClientRects().length > 0) ??
            pickers[0];
        const target = pickerEl?.querySelector(
            `[data-testid="new-case-jurisdiction-${jurisdiction}"]`,
        );
        if (target instanceof HTMLButtonElement) target.click();
    }, jurisdiction);
    if (await instantShell.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(instantShell).toBeHidden({ timeout: 45_000 });
    }
    await expect(save).toBeVisible({ timeout: 30_000 });
}

function civilCourtField(page: Page) {
    return page
        .getByLabel('اسم المحكمة المختصة')
        .or(
            page
                .locator('label')
                .filter({ hasText: 'اسم المحكمة المختصة' })
                .locator('xpath=following-sibling::input[1]'),
        );
}

async function ensureCivilNewCaseFormReady(page: Page): Promise<void> {
    await expect(page.getByTestId('lawyer-new-case-save')).toBeVisible({ timeout: 30_000 });
    const court = civilCourtField(page);
    await expect(court).toBeVisible({ timeout: 20_000 });
}

export const E2E_CIVIL_FILE_ID = 990_001;
export const E2E_CIVIL_FILE_ID_2 = 990_002;
export const E2E_UNDETERMINED_FILE_ID = 990_004;
export const LAWYER_FILES_KEY = 'lawyer_files';
export const SUPABASE_AUTH_KEY = 'sb-wldjvjnodvyodmgbgzab-auth-token';
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
    await openLawsuitsWorkspace(page);
    const workspace = lawsuitsWorkspaceOpen(page);
    const fileCard = workspace.getByTestId(`lawsuit-file-${fileId}`);
    await expect(fileCard).toBeVisible({ timeout: 45_000 });
    await expect(async () => {
        const card = workspace.getByTestId(`lawsuit-file-${fileId}`).first();
        await expect(card).toBeVisible({ timeout: 5_000 });
        const title = card.locator('h3');
        if (await title.count()) {
            await title.evaluate((el) => {
                const host = el as HTMLElement;
                host.scrollIntoView({ block: 'center', inline: 'nearest' });
                host.click();
            });
        } else {
            await card.evaluate((el) => {
                const host = el as HTMLElement;
                host.scrollIntoView({ block: 'center', inline: 'nearest' });
                host.click();
            });
        }
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
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
    await nativeFillThirdPartyName(page, name);
    await modal.getByTestId('lawyer-new-case-third-party-confirm').click({ force: true });
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
}

/** ختام المرافعة → حكم → بوابة الطعن */
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
    const gatewayHeading = page.getByRole('heading', { name: /بوابة الطعن|بوابة/ });
    await expect(async () => {
        if (await gatewayHeading.isVisible().catch(() => false)) return;
        await page.getByRole('button', { name: /حفظ والانتقال لمرحلة/ }).click({ timeout: 8_000 });
        await expect(gatewayHeading).toBeVisible({ timeout: 12_000 });
    }).toPass({ timeout: 40_000 });
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

/** يغلق إضبارة/مساحة دعاوى/نموذج جديد قبل إقلاع اختبار تالٍ */
export async function resetCivilLawsuitsScreenForE2E(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissProductivityBlockers(page);

    const dossierExit = page.getByTestId('smart-file-exit');
    const dossierBack = page.getByTestId('smart-file-back');
    const workspaceExit = page.getByTestId('lawsuits-workspace-exit');
    const newCaseSave = page.getByTestId('lawyer-new-case-save');

    if (await dossierExit.isVisible({ timeout: 800 }).catch(() => false)) {
        await dossierExit.click({ noWaitAfter: true });
    } else if (await dossierBack.isVisible({ timeout: 800 }).catch(() => false)) {
        await dossierBack.click({ noWaitAfter: true });
    }

    if (await newCaseSave.isVisible({ timeout: 800 }).catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => undefined);
    }

    if (await page.getByTestId('lawsuits-workspace').isVisible({ timeout: 800 }).catch(() => false)) {
        if (await workspaceExit.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await workspaceExit.click({ noWaitAfter: true });
        }
    }

    await dismissProductivityBlockers(page);
}

/** إقلاع مستقر للوحة + hub الدعاوى — SecureStore + reload عند الحاجة */
export async function bootCivilLawsuitsScreenE2E(
    page: Page,
    multi = false,
    customFiles?: unknown[],
): Promise<void> {
    const files = customFiles ?? (multi ? buildE2eCivilLawsuitPair() : [buildE2eCivilLawsuitFile()]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await hydrateLawyerFilesForE2E(page, files);
    // SecureStore لا يُقرأ بعد الإقلاع إلا بإعادة تحميل — بدونها الشبكة تبقى فارغة.
    // لا ننتظر اللوحة قبل الـ reload: إقلاع كامل مرتين يقتل vite preview على ويندوز.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);
    await resetCivilLawsuitsScreenForE2E(page);
    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 30_000 });
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

/** إقلاع مستقر لمسار إنشاء دعوى — SecureStore + reload واحد */
export async function bootCivilLawsuitsE2E(page: Page, multi = false): Promise<void> {
    const files = multi ? buildE2eCivilLawsuitPair() : [buildE2eCivilLawsuitFile()];
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await hydrateLawyerFilesForE2E(page, files);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);
    await resetCivilLawsuitsScreenForE2E(page);
    await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 30_000 });
}

/** يضمن lawyer_files في الذاكرة — reload اختياري فقط عند فشل الإقلاع */
async function hydrateLawyerFilesFromStorage(
    page: Page,
    files?: unknown[],
    options?: { reloadOnFailure?: boolean },
): Promise<void> {
    const seedFiles = files ?? [buildE2eCivilLawsuitFile()];
    await page.evaluate((seed) => {
        localStorage.setItem('lawyer_files', JSON.stringify(seed));
        sessionStorage.setItem('hami:last-screen', 'lawyer');
    }, seedFiles);
    const dashboardUp = await lawyerDashboardReady(page)
        .isVisible({ timeout: 6_000 })
        .catch(() => false);
    if (!dashboardUp && options?.reloadOnFailure !== false) {
        await page.reload({ waitUntil: 'domcontentloaded' });
    }
}

/** @deprecated use hydrate via ensureLawyerDashboard */
export async function reinforceLawyerFilesSeed(page: Page): Promise<void> {
    await hydrateLawyerFilesFromStorage(page);
}

export async function ensureLawyerDashboard(
    page: Page,
    multi = false,
    customFiles?: unknown[],
    options?: { requireHub?: boolean },
) {
    const requireHub = options?.requireHub !== false;
    const seedFiles = customFiles ?? (multi ? buildE2eCivilLawsuitPair() : undefined);

    await resetCivilLawsuitsScreenForE2E(page);

    if (seedFiles) {
        await page.evaluate((seed) => {
            localStorage.setItem('lawyer_files', JSON.stringify(seed));
        }, seedFiles);
    } else {
        const onReady = await lawyerDashboardReady(page)
            .isVisible({ timeout: 4_000 })
            .catch(() => false);
        if (!onReady) {
            await hydrateLawyerFilesFromStorage(page, undefined, { reloadOnFailure: true });
        }
    }

    await applyE2eBootHomeLayoutAtRuntime(page);
    await recoverLawyerDashboardBootError(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);

    if (requireHub) {
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 30_000 });
    }
}

/** @deprecated use ensureLawyerDashboard */
export async function bypassDevLogin(page: Page) {
    await ensureLawyerDashboard(page);
}

export async function closeSmartFileDossierToHub(page: Page): Promise<void> {
    const back = page.getByTestId('smart-file-back');
    const exit = page.getByTestId('smart-file-exit');
    if (await back.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await back.click({ timeout: 10_000 });
    } else if (await exit.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await exit.click({ timeout: 10_000 });
    } else {
        await page.keyboard.press('Escape').catch(() => undefined);
    }
    await expect(page.getByTestId('smart-file-dossier')).toBeHidden({ timeout: 15_000 });
}

export async function openCivilDossier(page: Page) {
    await openLawsuitsWorkspace(page);
    const workspace = lawsuitsWorkspaceOpen(page);
    await workspace.getByTestId('lawsuits-tab-civil').click({ timeout: 5_000 }).catch(() => undefined);
    const seededCard = workspace.getByTestId(`lawsuit-file-${E2E_CIVIL_FILE_ID}`);
    await expect(seededCard).toBeVisible({ timeout: 45_000 });
    await expect(async () => {
        const fileCard = workspace.getByTestId(`lawsuit-file-${E2E_CIVIL_FILE_ID}`).first();
        await expect(fileCard).toBeVisible({ timeout: 5_000 });
        const title = fileCard.locator('h3');
        if (await title.count()) {
            await title.evaluate((el) => {
                const host = el as HTMLElement;
                host.scrollIntoView({ block: 'center', inline: 'nearest' });
                host.click();
            });
        } else {
            await fileCard.evaluate((el) => {
                const host = el as HTMLElement;
                host.scrollIntoView({ block: 'center', inline: 'nearest' });
                host.click();
            });
        }
        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
}

export const E2E_TASK_TITLE = 'مهمة E2E إدارية';

/** إضافة مهمة إدارية داخل الإضبارة المفتوحة */
export async function addAdministrativeTask(page: Page, title: string = E2E_TASK_TITLE) {
    await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 15_000 });
    const addBtn = page.getByTestId('smart-file-task-add');
    await expect(addBtn).toBeAttached({ timeout: 20_000 });
    await addBtn.evaluate((el) => {
        const host = el as HTMLButtonElement;
        host.scrollIntoView({ block: 'center', inline: 'nearest' });
        host.click();
    });

    const modalHeading = page.getByRole('heading', { name: 'إضافة مهمة إدارية' });
    await expect(modalHeading).toBeVisible({ timeout: 15_000 });

    await nativeFillByTestId(page, 'smart-file-task-title', title);
    await page.getByTestId('smart-file-task-submit').evaluate((el) => (el as HTMLButtonElement).click());
    await expect(modalHeading).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
}

/** يفتح مساحة الدعاوى من بطاقة الرئيسية */
export async function openLawsuitsWorkspace(page: Page) {
    await dismissProductivityBlockers(page);
    if (await page.getByTestId('smart-file-dossier').isVisible({ timeout: 1_500 }).catch(() => false)) {
        await closeSmartFileDossierToHub(page).catch(() => undefined);
    }
    const trigger = page.getByTestId('hub-archive-lawsuit');
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await expect(async () => {
        await dismissProductivityBlockers(page);
        if (await page.getByTestId('smart-file-dossier').isVisible({ timeout: 800 }).catch(() => false)) {
            await closeSmartFileDossierToHub(page).catch(() => undefined);
        }
        const host = lawsuitsWorkspaceOpen(page);
        if (await host.isVisible().catch(() => false)) {
            const civilTab = host.getByTestId('lawsuits-tab-civil');
            await expect(civilTab).toBeVisible({ timeout: 12_000 });
            if ((await civilTab.getAttribute('aria-selected')) !== 'true') {
                await civilTab.evaluate((el) => (el as HTMLButtonElement).click());
            }
            await expectArchiveSurfaceReady(host);
            return;
        }

        const instantChrome = page.locator(
            '[data-testid="lawsuits-workspace"][aria-busy="true"]:visible',
        );
        if (await instantChrome.isVisible().catch(() => false)) {
            // InstantChrome يغطي البلاطة — لا نُعيد النقر فيُغلق التحميل
            await expect(host).toBeVisible({ timeout: 20_000 });
            const civilTab = host.getByTestId('lawsuits-tab-civil');
            await expect(civilTab).toBeVisible({ timeout: 12_000 });
            if ((await civilTab.getAttribute('aria-selected')) !== 'true') {
                await civilTab.evaluate((el) => (el as HTMLButtonElement).click());
            }
            await expectArchiveSurfaceReady(host);
            return;
        }

        await trigger.evaluate((el) => (el as HTMLButtonElement).click());
        const appeared =
            (await instantChrome.isVisible({ timeout: 8_000 }).catch(() => false)) ||
            (await host.isVisible({ timeout: 8_000 }).catch(() => false));
        expect(appeared).toBeTruthy();
        await expect(host).toBeVisible({ timeout: 20_000 });
        const civilTab = host.getByTestId('lawsuits-tab-civil');
        await expect(civilTab).toBeVisible({ timeout: 12_000 });
        if ((await civilTab.getAttribute('aria-selected')) !== 'true') {
            await civilTab.evaluate((el) => (el as HTMLButtonElement).click());
        }
        await expectArchiveSurfaceReady(host);
    }).toPass({ timeout: 75_000 });
    const readyHost = lawsuitsWorkspaceOpen(page);
    await expect(
        readyHost.getByTestId('lawsuit-archive-grid').or(readyHost.getByTestId('lawsuit-archive-empty')),
    ).toBeVisible({ timeout: 30_000 });
}

async function ensureLawsuitsAddFab(page: Page) {
    await expect(visibleTestId(page, 'lawsuits-add-new')).toBeVisible({ timeout: 45_000 });
}

/** اختيار قيمة من CaseFieldSelect (زر + listbox) بدل select الأصلي */
export async function selectCaseFieldOption(
    page: Page,
    ariaLabel: string | RegExp,
    optionLabel: string,
) {
    const trigger = page.getByRole('button', { name: ariaLabel }).first();
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
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
    await ensureLawsuitsAddFab(page);
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

    await fillLabeledInput(page, 'رقم الدعوى', number);
    await fillLabeledInput(page, 'محكمة الأحوال الشخصية', court);
    await fillLabeledInput(page, 'نوع الدعوى', type);

    const stagePill = page.getByRole('button', { name: 'أحوال شخصية', exact: true });
    if (await stagePill.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await stagePill.click({ force: true });
    }

    const lawChip = page.getByRole('checkbox', { name: lawLabel });
    await expect(lawChip).toBeVisible({ timeout: 10_000 });
    if ((await lawChip.getAttribute('aria-checked')) !== 'true') {
        await lawChip.click({ force: true });
    }

    await page.getByRole('button', { name: /الأطراف/ }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'أطراف الدعوى' })).toBeVisible({ timeout: 10_000 });

    await fillPartyFullNames(page, plaintiff, defendant);
    await markFirstPartyAsClient(page);
}

/** فتح نموذج إنشاء دعوى مدنية من مخزن الدعاوى */
export async function openCivilNewCaseForm(page: Page) {
    await resetCivilLawsuitsScreenForE2E(page);
    await openLawsuitsWorkspace(page);
    await ensureLawsuitsAddFab(page);
    await openAndSelectNewCaseJurisdiction(page, 'civil');
    await ensureCivilNewCaseFormReady(page);
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

    await ensureCivilNewCaseFormReady(page);
    await fillLabeledInput(page, 'اسم المحكمة المختصة', court);
    await fillLabeledInput(page, 'نوع الدعوى', type);
    await page.getByRole('checkbox', { name: 'دعوى غير مقدرة القيمة' }).click({ force: true });
    await selectCaseFieldOption(page, 'المرحلة الحالية', stage);

    await fillPartyFullNames(page, plaintiff, defendant);
    await markFirstPartyAsClient(page);
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

    await ensureCivilNewCaseFormReady(page);
    await fillLabeledInput(page, 'اسم المحكمة المختصة', court);

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

    await fillLabeledInput(page, 'نوع الدعوى', type);

    if (opts.claimValue) {
        await expect(page.getByTestId('lawyer-new-case-claim-value')).toBeEnabled({ timeout: 8_000 });
        await nativeSetInputValue(page, '[data-testid="lawyer-new-case-claim-value"]', 0, opts.claimValue);
        await page.waitForTimeout(200);
    }

    await fillPartyFullNames(page, plaintiff, defendant);

    if (markClient) {
        await markFirstPartyAsClient(page);
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
    await nativeFillThirdPartyName(page, name);
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
            const bridge = (window as Window & {
                __hamiE2eSecureStore?: {
                    flushHeavyPersistPending: () => void;
                    ensurePersistedReady: () => Promise<void>;
                    getItemSync: (key: string) => string | null;
                };
            }).__hamiE2eSecureStore;

            if (bridge) {
                bridge.flushHeavyPersistPending();
                await bridge.ensurePersistedReady();
                await new Promise((resolve) => setTimeout(resolve, 300));
                const raw = bridge.getItemSync(storageKey);
                if (typeof raw === 'string' && raw.trim()) {
                    try {
                        localStorage.setItem(storageKey, raw);
                    } catch {
                        /* ignore */
                    }
                }
                return;
            }

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
    const deadline = Date.now() + 12_000;
    let lastError: unknown;
    while (Date.now() < deadline) {
        try {
            return await page.evaluate(
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

            const bridge = (window as Window & {
                __hamiE2eSecureStore?: {
                    getItemSync: (key: string) => string | null;
                    getItem: (key: string) => Promise<string | null>;
                };
            }).__hamiE2eSecureStore;

            if (bridge) {
                const sync = bridge.getItemSync(storageKey);
                const fromSync = parse(typeof sync === 'string' ? sync : null);
                if (fromSync.length) return fromSync;
                try {
                    const asyncVal = await bridge.getItem(storageKey);
                    const fromAsync = parse(typeof asyncVal === 'string' ? asyncVal : null);
                    if (fromAsync.length) return fromAsync;
                } catch {
                    /* ignore */
                }
            }

            const readFromIdb = (): Promise<string | null> =>
                new Promise((resolve) => {
                    try {
                        const req = indexedDB.open('hami-secure-store', 2);
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
        } catch (err) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            if (!/Execution context was destroyed|Target closed|navigation/i.test(msg)) {
                throw err;
            }
            await page.waitForTimeout(300);
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error(`readLawyerFilesFromPage failed: ${String(lastError)}`);
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

    await nativeFillByTestId(page, 'smart-file-session-record-proceedings', proceedings);
    await nativeFillByTestId(page, 'smart-file-session-record-judge-decisions', judgeDecisions);
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

export const LAWYER_FILES_ACTIVE_KEY = 'lawyer_files_active';
export const LAWSUIT_PENDING_CREATES_KEY = 'hami_lawsuit_pending_creates_v1';
export const LAWSUIT_WRITE_JOURNAL_KEY = 'hami_lawsuit_write_journal_v1';

/** اتحاد active + monolithic + pending + journal — يطابق منطق الإقلاع بعد Reload */
export async function readLawsuitStorageUnionFromPage(page: Page): Promise<unknown[]> {
    return page.evaluate(
        async ({ monoKey, activeKey, pendingKey, journalKey }) => {
            const parse = (raw: string | null) => {
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const parseJournalFiles = (raw: string | null): unknown[] => {
                const entries = parse(raw) as Array<{ file?: unknown }>;
                return entries.map((entry) => entry?.file).filter(Boolean);
            };

            const bridge = (window as Window & {
                __hamiE2eSecureStore?: {
                    getItemSync: (key: string) => string | null;
                    getItem: (key: string) => Promise<string | null>;
                };
            }).__hamiE2eSecureStore;

            const readKey = async (key: string): Promise<unknown[]> => {
                if (bridge) {
                    const sync = bridge.getItemSync(key);
                    const fromSync = parse(typeof sync === 'string' ? sync : null);
                    if (fromSync.length) return fromSync;
                    try {
                        const asyncVal = await bridge.getItem(key);
                        const fromAsync = parse(typeof asyncVal === 'string' ? asyncVal : null);
                        if (fromAsync.length) return fromAsync;
                    } catch {
                        /* ignore */
                    }
                }
                const fromLs = parse(localStorage.getItem(key));
                if (fromLs.length) return fromLs;
                return [];
            };

            const readRaw = async (key: string): Promise<string | null> => {
                if (bridge) {
                    const sync = bridge.getItemSync(key);
                    if (typeof sync === 'string' && sync.trim()) return sync;
                    try {
                        const asyncVal = await bridge.getItem(key);
                        if (typeof asyncVal === 'string' && asyncVal.trim()) return asyncVal;
                    } catch {
                        /* ignore */
                    }
                }
                const fromLs = localStorage.getItem(key);
                if (fromLs) return fromLs;
                try {
                    return sessionStorage.getItem(key);
                } catch {
                    return null;
                }
            };

            const pending = parse(await readRaw(pendingKey));
            const journal = parseJournalFiles(await readRaw(journalKey));
            const active = await readKey(activeKey);
            const mono = await readKey(monoKey);
            const byId = new Map<string, unknown>();
            for (const file of [...pending, ...journal, ...active, ...mono]) {
                if (!file || typeof file !== 'object') continue;
                const id = String((file as { id?: unknown }).id ?? '');
                if (!id) continue;
                byId.set(id, file);
            }
            return Array.from(byId.values());
        },
        {
            monoKey: LAWYER_FILES_KEY,
            activeKey: LAWYER_FILES_ACTIVE_KEY,
            pendingKey: LAWSUIT_PENDING_CREATES_KEY,
            journalKey: LAWSUIT_WRITE_JOURNAL_KEY,
        },
    );
}

export async function partyExistsInLawsuitStorageUnion(page: Page, name: string): Promise<boolean> {
    const files = await readLawsuitStorageUnionFromPage(page);
    return files.some((f) => extractPartyNamesFromFile(f).includes(name));
}

export async function waitForPartyInLawsuitStorageUnion(
    page: Page,
    name: string,
    timeoutMs = 30_000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    while (Date.now() < deadline) {
        if (attempt === 0 || attempt % 5 === 0) {
            await flushLawyerFilesPersist(page);
        }
        if (await partyExistsInLawsuitStorageUnion(page, name)) return;
        await page.waitForTimeout(400);
        attempt += 1;
    }
    await flushLawyerFilesPersist(page);
    if (await partyExistsInLawsuitStorageUnion(page, name)) return;
    throw new Error(`Party "${name}" not found in lawsuit storage union within ${timeoutMs}ms`);
}

export async function rebootLawyerDashboardAfterReload(page: Page): Promise<void> {
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);
    await resetCivilLawsuitsScreenForE2E(page);
}

export type LawsuitDurabilityOverlayState = {
    pendingCount: number;
    journalCount: number;
};

/** حالة طبقات المتانة (pending + WAL) — للتحقق بعد إثبات القرص */
export async function readLawsuitDurabilityOverlayStateFromPage(
    page: Page,
): Promise<LawsuitDurabilityOverlayState> {
    return page.evaluate(
        async ({ pendingKey, journalKey }) => {
            const parseArray = (raw: string | null) => {
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const bridge = (window as Window & {
                __hamiE2eSecureStore?: {
                    getItemSync: (key: string) => string | null;
                    getItem: (key: string) => Promise<string | null>;
                };
            }).__hamiE2eSecureStore;

            const readRaw = async (key: string): Promise<string | null> => {
                if (bridge) {
                    const sync = bridge.getItemSync(key);
                    if (typeof sync === 'string' && sync.trim()) return sync;
                    try {
                        const asyncVal = await bridge.getItem(key);
                        if (typeof asyncVal === 'string' && asyncVal.trim()) return asyncVal;
                    } catch {
                        /* ignore */
                    }
                }
                const fromLs = localStorage.getItem(key);
                if (fromLs) return fromLs;
                try {
                    return sessionStorage.getItem(key);
                } catch {
                    return null;
                }
            };

            return {
                pendingCount: parseArray(await readRaw(pendingKey)).length,
                journalCount: parseArray(await readRaw(journalKey)).length,
            };
        },
        {
            pendingKey: LAWSUIT_PENDING_CREATES_KEY,
            journalKey: LAWSUIT_WRITE_JOURNAL_KEY,
        },
    );
}

export async function waitForLawsuitDurabilityOverlaysCleared(
    page: Page,
    timeoutMs = 30_000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        await flushLawyerFilesPersist(page);
        const state = await readLawsuitDurabilityOverlayStateFromPage(page);
        if (state.pendingCount === 0 && state.journalCount === 0) return;
        await page.waitForTimeout(400);
    }
    const finalState = await readLawsuitDurabilityOverlayStateFromPage(page);
    throw new Error(
        `Durability overlays not cleared within ${timeoutMs}ms (pending=${finalState.pendingCount}, journal=${finalState.journalCount})`,
    );
}

/** حقن سجل WAL يدوياً — يحاكي كتابة قبل إثبات القرص */
export async function stageLawsuitJournalEntryOnPage(page: Page, file: unknown): Promise<void> {
    await page.evaluate(
        ({ journalKey, payload }) => {
            const fileId = String((payload as { id?: unknown }).id ?? '');
            if (!fileId) throw new Error('stageLawsuitJournalEntryOnPage: missing file.id');
            const entry = { v: 1, fileId, file: payload, ts: Date.now() };
            localStorage.setItem(journalKey, JSON.stringify([entry]));
        },
        { journalKey: LAWSUIT_WRITE_JOURNAL_KEY, payload: file },
    );
}
