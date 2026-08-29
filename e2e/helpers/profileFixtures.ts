import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { PROFILE_PERF_BUDGET } from '@/app/services/profile/profilePerfBudget';
import { stripBootFailureLayer, suppressWeeklyBackupReminder } from './bootFixtures';
import { bootToHomeDock } from './homeDockFixtures';
import { seedLawyerFiles } from './civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './productivityE2EFixtures';
import { clickNativeElement } from './executionE2EBoot';
import { dismissForumBlockers, openForumFromHome } from './forumFixtures';

/** اسم الملف المعروض في الهيرو — بعد إعادة هيكلة identity zone */
export function profileDisplayName(profile: Locator): Locator {
    return profile.locator('.hami-profile-identity__name-text');
}

export async function resetProfileScreenForE2E(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissProfileBlockers(page);
    const sheet = page.getByTestId('profile-settings-sheet');
    if (await sheet.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape');
        if (await sheet.isVisible().catch(() => false)) {
            const closeBtn = page.getByTestId('profile-settings-close');
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn
                    .evaluate((el) => (el as HTMLButtonElement).click())
                    .catch(() => undefined);
            }
        }
        await expect(sheet).toBeHidden({ timeout: 8_000 }).catch(() => undefined);
    }
    const member = page.getByTestId('forum-member-profile');
    if (await member.isVisible().catch(() => false)) {
        const back = member.getByTestId('lawyer-profile-back').filter({ visible: true });
        if (await back.isVisible().catch(() => false)) {
            await clickNativeElement(back).catch(() => undefined);
        }
        await expect(member).toBeHidden({ timeout: 8_000 }).catch(() => undefined);
        return;
    }
    const visibleProfile = page.getByTestId('lawyer-profile').filter({ visible: true });
    if ((await visibleProfile.count()) > 0) {
        await closeLawyerProfileTab(page);
    }
}

export async function prepareProfileE2E(page: Page): Promise<void> {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareProductivityE2E(page);
    await suppressWeeklyBackupReminder(page);
    await seedLawyerFiles(page);
}

/** إقلاع سريع للوحة — بدون ensureLawyerDashboard/reload (~95s) */
export async function bootLawyerDashboardForProfile(page: Page): Promise<void> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await bootToHomeDock(page);
    await dismissProfileBlockers(page);
    await expect(page.getByTestId('home-dock-forum-profile')).toBeVisible({ timeout: 15_000 });
}

/** يزيل طبقات تحجب النقرات أثناء اختبارات الملف المهني */
export async function dismissSettingsShellIfOpen(page: Page): Promise<void> {
    const shell = page.getByTestId('hami-settings-shell');
    if (!(await shell.isVisible().catch(() => false))) return;

    await page.keyboard.press('Escape');
    const hidden = await shell.isHidden({ timeout: 4_000 }).catch(() => false);
    if (hidden) return;

    const back = shell.getByRole('button', { name: /رجوع|إغلاق|العودة/ }).first();
    if (await back.isVisible().catch(() => false)) {
        await back.click({ force: true, timeout: 3_000 }).catch(() => undefined);
    }
    await expect(shell).toBeHidden({ timeout: 8_000 }).catch(() => undefined);
}

/** يزيل طبقات تحجب النقرات أثناء اختبارات الملف المهني */
export async function dismissProfileBlockers(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissProductivityBlockers(page);
    if (page.isClosed()) return;
    await stripBootFailureLayer(page);
    await dismissSettingsShellIfOpen(page);
    const toastClose = page
        .getByTestId('smart-toast-item')
        .getByRole('button', { name: 'إغلاق' })
        .or(page.getByTestId('smart-toast-stack').getByRole('button', { name: 'إغلاق' }));
    for (let attempt = 0; attempt < 6; attempt++) {
        const btn = toastClose.first();
        const visible = await btn.isVisible({ timeout: 300 }).catch(() => false);
        if (!visible) break;
        await btn.click({ force: true, timeout: 2_000 }).catch(() => undefined);
        await page.waitForTimeout(120);
    }
    await page.evaluate(() => {
        document.querySelector('vite-error-overlay')?.remove();
        document.getElementById('hami-boot-failure')?.remove();
    });
}

/** ينتظر اكتمال حفظ التعديل (خروج وضع التحرير بعد ثبات القرص) */
export async function waitForProfileEditSaved(page: Page, profile: Locator): Promise<void> {
    await expect(async () => {
        const saveCount = await page.getByTestId('lawyer-profile-edit-save').count();
        if (saveCount === 0) return;
        throw new Error('edit-save-pending');
    }).toPass({ timeout: 35_000 });
    if ((await page.locator('html').getAttribute('data-hami-profile-open')) === '1') {
        await expect(profile.getByTestId('lawyer-profile-name-input')).toBeHidden({ timeout: 15_000 });
    }
    await flushHamiPersistForE2E(page);
}

export async function flushHamiPersistForE2E(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await page
        .evaluate(async () => {
            const store = (
                window as Window & {
                    __hamiE2eSecureStore?: {
                        flushHeavyPersistPending?: () => void;
                        waitForAllPendingPersist?: () => Promise<void>;
                        ensurePersistedReady?: () => Promise<void>;
                    };
                }
            ).__hamiE2eSecureStore;
            store?.flushHeavyPersistPending?.();
            await store?.waitForAllPendingPersist?.();
        })
        .catch(() => undefined);
}

async function writeProfileNameWithoutPointer(nameInput: Locator, uniqueName: string): Promise<void> {
    const result = await nameInput.evaluate((el, name) => {
        const input = el as HTMLInputElement;
        if (input.readOnly) {
            return { ok: false as const, reason: 'readonly', value: input.value };
        }
        input.focus();
        const tracker = (input as HTMLInputElement & { _valueTracker?: { setValue: (v: string) => void } })
            ._valueTracker;
        tracker?.setValue('');
        const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        desc?.set?.call(input, name);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true as const, value: input.value };
    }, uniqueName);
    if (!result.ok) {
        throw new Error('حقل الاسم مقفل (استُنفد التصحيح الوحيد) — لا يمكن التحقق من حفظ اسم فريد');
    }
    await expect(nameInput).toHaveValue(uniqueName, { timeout: 4_000 });
}

/** يحفظ اسم الملف ويتحقق من ظهوره في الهيرو */
export async function saveProfileDisplayName(
    page: Page,
    _profile: Locator,
    uniqueName: string,
): Promise<void> {
    const visible = await expectProfileTabOpen(page);
    const edit = visible.getByTestId('lawyer-profile-edit');
    const nameInput = page.getByTestId('lawyer-profile-name-input').filter({ visible: true });
    await expect(edit).toBeAttached({ timeout: 12_000 });
    await expect(async () => {
        if (!(await nameInput.isVisible().catch(() => false))) {
            await edit.evaluate((el) => (el as HTMLButtonElement).click());
        }
        await expect(nameInput).toBeAttached({ timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
    await writeProfileNameWithoutPointer(nameInput, uniqueName);
    if ((await page.locator('html').getAttribute('data-hami-profile-open')) !== '1') {
        throw new Error('كتابة الاسم أغلقت الملف');
    }
    const saveBtn = page
        .locator('[data-profile-live-tree]')
        .getByTestId('lawyer-profile-edit-save');
    await expect(saveBtn).toBeAttached({ timeout: 8_000 });
    await saveBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await waitForProfileEditSaved(page, visible);
    if ((await page.locator('html').getAttribute('data-hami-profile-open')) === '1') {
        await expect(profileDisplayName(visible)).toContainText(uniqueName, { timeout: 15_000 });
    }
}

export async function expectProfileTabClosed(page: Page): Promise<void> {
    try {
        await expect
            .poll(
                async () =>
                    page.evaluate(() => document.documentElement.getAttribute('data-hami-profile-open')),
                { timeout: 15_000 },
            )
            .not.toBe('1');
        await expect
            .poll(
                async () =>
                    page.evaluate(
                        () => document.documentElement.getAttribute('data-hami-profile-closing'),
                    ),
                { timeout: 8_000 },
            )
            .not.toBe('1');
        await expect(page.getByTestId('home-dock-forum-profile')).toBeVisible({ timeout: 10_000 });
    } catch (err) {
        const snap = await dumpProfileE2E(page, 'expectProfileTabClosed');
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`الملف لم يُغلق إلى الرئيسية القابلة للنقر. ${reason} | ${snap}`);
    }
}

async function waitForProfileForceOpenHook(page: Page, required = false): Promise<void> {
    try {
        await page.waitForFunction(
            () =>
                typeof (window as Window & { __hamiE2eForceOpenProfileTab?: () => void })
                    .__hamiE2eForceOpenProfileTab === 'function',
            { timeout: required ? 20_000 : 8_000 },
        );
    } catch (err) {
        if (required) {
            throw new Error('__hamiE2eForceOpenProfileTab لم يُسجَّل — سطح الملف غير مسلّح');
        }
        void err;
    }
}

async function forceOpenProfileFromPage(page: Page): Promise<void> {
    await page
        .evaluate(() => {
            document.documentElement.removeAttribute('data-hami-profile-closing');
            const w = window as Window & { __hamiE2eForceOpenProfileTab?: () => void };
            w.__hamiE2eForceOpenProfileTab?.();
        })
        .catch(() => undefined);
}

async function dumpProfileE2E(page: Page, label: string): Promise<string> {
    return page
        .evaluate((why) => {
            const w = window as Window & {
                __hamiE2eForceOpenProfileTab?: () => void;
                __hamiE2eProfileTabDebug?: () => unknown;
                __hamiE2eLastOverlayDismiss?: unknown;
                __hamiE2eLastProfileClose?: unknown;
                __hamiE2eLastProfileSnapClose?: unknown;
                __hamiE2eNotificationDebug?: () => unknown;
            };
            const surface = document.querySelector('[data-testid="lawyer-dashboard-profile-surface"]');
            return JSON.stringify({
                why,
                htmlOpen: document.documentElement.getAttribute('data-hami-profile-open'),
                htmlClosing: document.documentElement.getAttribute('data-hami-profile-closing'),
                featureOpen: document.documentElement.getAttribute('data-hami-feature-open'),
                notifOpen: document.documentElement.getAttribute('data-hami-notifications-open'),
                notifClosing: document.documentElement.getAttribute('data-hami-notifications-closing'),
                settingsOpen: document.documentElement.getAttribute('data-hami-settings-open'),
                tabInert: document.querySelector('[data-hami-dashboard-tab-stack]')?.hasAttribute('inert') ?? false,
                homeClass:
                    document.querySelector('[data-testid="lawyer-dashboard-home-surface"]')
                        ?.className ?? null,
                homeActive: Boolean(
                    document.querySelector(
                        '[data-testid="lawyer-dashboard-home-surface"].is-active, .hami-dashboard-home-stack-cover.is-active',
                    ),
                ),
                persistTab:
                    typeof sessionStorage !== 'undefined'
                        ? sessionStorage.getItem('hami:lawyer-dashboard-tab')
                        : null,
                scheduleOpen: document.documentElement.getAttribute('data-hami-schedule-open'),
                openedPage: document.documentElement.getAttribute('data-hami-profile-opened-page'),
                studioOpen: document.documentElement.getAttribute('data-hami-profile-studio-open'),
                preserve: surface?.getAttribute('data-hami-tab-preserve') ?? null,
                preserveActive: Boolean(surface?.classList.contains('hami-dashboard-tab-preserve--active')),
                live: Boolean(document.querySelector('[data-profile-live-tree]')),
                cover: Boolean(document.querySelector('[data-profile-open-first-page]')),
                sheet: Boolean(document.querySelector('[data-testid="profile-settings-sheet"]')),
                loading: Boolean(document.querySelector('[data-testid="profile-settings-sheet-loading"]')),
                loadError: Boolean(
                    document.querySelector('[data-testid="profile-settings-sheet-load-error"]'),
                ),
                profileCount: document.querySelectorAll('[data-testid="lawyer-profile"]').length,
                settingsCount: document.querySelectorAll('[data-testid="lawyer-profile-settings"]').length,
                backCount: document.querySelectorAll('[data-testid="lawyer-profile-back"]').length,
                saveCount: document.querySelectorAll('[data-testid="lawyer-profile-edit-save"]').length,
                forceOpen: typeof w.__hamiE2eForceOpenProfileTab,
                notifDebug: w.__hamiE2eNotificationDebug?.() ?? null,
                notifBridge: Boolean(document.getElementById('hami-notifications-instant-bridge')),
                notifDialogModal: document
                    .querySelector('[data-testid="notification-panel"]')
                    ?.getAttribute('aria-modal'),
                tabStackClass:
                    document.querySelector('[data-hami-dashboard-tab-stack]')?.className ?? null,
                dockVis: (() => {
                    const dock = document.querySelector(
                        '[data-testid="home-dock-forum-profile"]',
                    ) as HTMLElement | null;
                    return dock ? getComputedStyle(dock).visibility : null;
                })(),
                homeVis: (() => {
                    const home = document.querySelector(
                        '[data-testid="lawyer-dashboard-home-surface"]',
                    ) as HTMLElement | null;
                    return home ? getComputedStyle(home).visibility : null;
                })(),
                htmlHami: Array.from(document.documentElement.attributes)
                    .filter((a) => a.name.startsWith('data-hami'))
                    .map((a) => `${a.name}=${a.value}`)
                    .join('|'),
                dockChain: (() => {
                    const dock = document.querySelector(
                        '[data-testid="home-dock-forum-profile"]',
                    ) as HTMLElement | null;
                    if (!dock) return null;
                    const rows: string[] = [];
                    let el: HTMLElement | null = dock;
                    for (let i = 0; i < 14 && el; i += 1) {
                        const cs = getComputedStyle(el);
                        rows.push(
                            `${el.tagName.toLowerCase()}#${el.id || ''} .${el.className?.toString?.().slice(0, 72) ?? ''} tid=${el.getAttribute('data-testid') ?? ''} vis=${cs.visibility} disp=${cs.display}`,
                        );
                        el = el.parentElement;
                    }
                    return rows;
                })(),
                persistNotif:
                    typeof sessionStorage !== 'undefined'
                        ? sessionStorage.getItem('hami:lawyer-notifications-open')
                        : null,
                lastClose: w.__hamiE2eLastProfileClose ?? null,
                lastSnap: w.__hamiE2eLastProfileSnapClose ?? null,
                debug: w.__hamiE2eProfileTabDebug?.() ?? null,
            });
        }, label)
        .catch((err) => `${label}:dump-failed:${err instanceof Error ? err.message : String(err)}`);
}

async function readProfileOpenDebug(page: Page): Promise<string> {
    return dumpProfileE2E(page, 'open');
}

export async function expectProfileTabOpen(page: Page): Promise<Locator> {
    const visible = page.getByTestId('lawyer-profile').filter({ visible: true }).first();
    const forumTile = page.getByTestId('home-dock-forum-profile');
    try {
        await expect(async () => {
            if ((await page.locator('html').getAttribute('data-hami-profile-open')) !== '1') {
                await forceOpenProfileFromPage(page);
                if ((await page.locator('html').getAttribute('data-hami-profile-open')) !== '1') {
                    if (await forumTile.isVisible().catch(() => false)) {
                        await forumTile
                            .evaluate((el) => (el as HTMLButtonElement).click())
                            .catch(() => undefined);
                    }
                }
            }
            await expect(page.locator('html')).toHaveAttribute('data-hami-profile-open', '1', {
                timeout: 3_000,
            });
            await expect(visible).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 35_000 });
    } catch (err) {
        const snap = await readProfileOpenDebug(page);
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`تبويب الملف لم يُفتح. ${reason} | ${snap}`);
    }
    await expect(page.getByTestId('lawyer-profile-loading')).toHaveCount(0, { timeout: 15_000 });
    try {
        await expect(page.locator('[data-profile-live-tree]')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('[data-profile-open-first-page]')).toHaveCount(0, { timeout: 15_000 });
    } catch (err) {
        const snap = await dumpProfileE2E(page, 'expectProfileTabOpen-live');
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`اعتماد الشجرة الحية فشل. ${reason} | ${snap}`);
    }
    return visible;
}

/**
 * بعد الحفظ: أغلق التبويب من الرئيسية دون إعادة تحميل الصفحة —
 * goto كامل يقرأ السحابة فوق الكتابة المحلية فيُظهر الاسم القديم.
 */
export async function reopenLawyerProfileFromHome(page: Page): Promise<Locator> {
    if (page.isClosed()) {
        throw new Error('reopenLawyerProfileFromHome: الصفحة أُغلقت');
    }
    await flushHamiPersistForE2E(page);
    if ((await page.locator('html').getAttribute('data-hami-profile-open')) === '1') {
        await closeLawyerProfileTab(page);
    }
    await expectProfileTabClosed(page);
    return openLawyerProfile(page);
}

export async function clickVisibleProfileBack(page: Page): Promise<void> {
    const back = page.getByTestId('lawyer-profile-back').first();
    await expect(back).toBeAttached({ timeout: 12_000 });
    await back.evaluate((el) => (el as HTMLButtonElement).click());
}

/** يغلق تبويب الملف — زر الرجوع ثم Escape كاحتياط */
export async function closeLawyerProfileTab(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissProfileBlockers(page);
    await expect(page.getByTestId('lawyer-profile-edit-save')).toHaveCount(0, { timeout: 8_000 }).catch(
        () => undefined,
    );

    for (let attempt = 0; attempt < 3; attempt++) {
        if (page.isClosed()) return;
        if ((await page.locator('html').getAttribute('data-hami-profile-open')) !== '1') {
            break;
        }

        const back = page.getByTestId('lawyer-profile-back').first();
        if ((await back.count()) > 0) {
            await back.evaluate((el) => (el as HTMLButtonElement).click()).catch(() => undefined);
        }
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(200);
    }

    if (page.isClosed()) return;
    await expectProfileTabClosed(page);
}

export async function clickLawyerProfileBack(page: Page): Promise<void> {
    await clickVisibleProfileBack(page);
}

async function clickHomeForumProfile(page: Page): Promise<void> {
    const trigger = page.getByTestId('home-dock-forum-profile');
    await dismissProfileBlockers(page);
    /* click() فقط — pointerdown+click عبر clickNativeElement يبتلع onClick في ربع الملف */
    await trigger.evaluate((el) => (el as HTMLButtonElement).click());
}

export async function openLawyerProfile(page: Page) {
    if (page.isClosed()) {
        throw new Error('openLawyerProfile: الصفحة أُغلقت قبل الفتح');
    }
    const html = page.locator('html');
    const visibleProfile = page.getByTestId('lawyer-profile').filter({ visible: true });
    if (
        (await html.getAttribute('data-hami-profile-open')) === '1' &&
        (await visibleProfile.count()) > 0
    ) {
        return expectProfileTabOpen(page);
    }

    const forumProfile = page.getByTestId('home-dock-forum-profile');
    if ((await forumProfile.count()) === 0) {
        await waitForProfileForceOpenHook(page, false);
        await forceOpenProfileFromPage(page);
        if (
            (await html.getAttribute('data-hami-profile-open')) !== '1' &&
            (await forumProfile.count()) === 0
        ) {
            await bootLawyerDashboardForProfile(page);
        } else {
            await dismissProfileBlockers(page);
        }
    } else {
        await dismissProfileBlockers(page);
    }

    if ((await html.getAttribute('data-hami-profile-open')) !== '1') {
        if (await forumProfile.isVisible().catch(() => false)) {
            await clickHomeForumProfile(page);
        } else if ((await forumProfile.count()) > 0) {
            await forumProfile
                .first()
                .evaluate((el) => (el as HTMLButtonElement).click())
                .catch(() => undefined);
        }
    }

    if ((await html.getAttribute('data-hami-profile-open')) !== '1') {
        if (await forumProfile.isVisible().catch(() => false)) {
            await clickHomeForumProfile(page);
        } else if ((await forumProfile.count()) > 0) {
            await forumProfile
                .first()
                .evaluate((el) => (el as HTMLButtonElement).click())
                .catch(() => undefined);
        }
        await waitForProfileForceOpenHook(page, false);
        await forceOpenProfileFromPage(page);
    }
    return expectProfileTabOpen(page);
}

export async function prepareProfileStudioE2E(page: Page): Promise<void> {
    await prepareProfileE2E(page);
    await bootLawyerDashboardForProfile(page);
}

export async function waitForProfileSettingsSheet(page: Page): Promise<Locator> {
    const sheet = page.getByTestId('profile-settings-sheet');
    const deadline = Date.now() + 20_000;
    try {
        while (Date.now() < deadline) {
            if (await page.getByTestId('profile-settings-sheet-load-error').isVisible().catch(() => false)) {
                throw new Error('تعذّر تحميل استوديو الصفحة');
            }
            if ((await sheet.count()) > 0) {
                await expect(sheet).toBeVisible({ timeout: 8_000 });
                return sheet;
            }
            if ((await page.locator('html').getAttribute('data-hami-profile-open')) !== '1') {
                const snap = await dumpProfileE2E(page, 'studio-profile-closed');
                throw new Error(`الملف أُغلق أثناء انتظار الاستوديو | ${snap}`);
            }
            await page.waitForTimeout(100);
        }
        throw new Error('انتهت مهلة انتظار الاستوديو');
    } catch (err) {
        if (err instanceof Error && err.message.includes('الملف أُغلق أثناء انتظار الاستوديو')) {
            throw err;
        }
        const snap = await dumpProfileE2E(page, 'waitForProfileSettingsSheet');
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`ورقة الاستوديو لم تُركَّب. ${reason} | ${snap}`);
    }
}

/** نقر شريحة الكتالوج على العنصر نفسه — بلا force/إحداثيات تسقط على خلفية الورقة */
export async function clickCatalogChip(page: Page, testId: string): Promise<void> {
    await expect(async () => {
        const sheet = page.getByTestId('profile-settings-sheet');
        if (!(await sheet.isVisible().catch(() => false))) {
            await reopenProfileStudio(page);
        }
        const chip = page.getByTestId(testId);
        if (!(await chip.isVisible().catch(() => false))) {
            const recoverTab =
                testId.startsWith('profile-accent-') ||
                testId.startsWith('profile-material-') ||
                testId.startsWith('profile-portrait-frame-')
                    ? 'profile-settings-tab-appearance'
                    : testId.startsWith('image-template-') || testId.startsWith('image-rim-')
                      ? 'image-studio-tab-frame'
                      : testId.startsWith('text-canvas-')
                        ? 'text-studio-tab-canvas'
                        : null;
            if (recoverTab) {
                const tab = page.getByTestId(recoverTab);
                if (await tab.isVisible().catch(() => false)) {
                    await tab.evaluate((el) => (el as HTMLButtonElement).click());
                }
            }
        }
        await chip
            .evaluate((el) => {
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            })
            .catch(() => undefined);
        await expect(chip).toBeVisible({ timeout: 8_000 });
        await expect(chip).toBeEnabled({ timeout: 8_000 });
        if ((await chip.getAttribute('data-selected')) === 'true') return;
        await chip.evaluate((el) => {
            const btn = el as HTMLButtonElement;
            if (btn.disabled) throw new Error('catalog-chip-disabled');
            btn.click();
        });
        await expect(chip).toHaveAttribute('data-selected', 'true', { timeout: 4_000 });
    }).toPass({ timeout: 25_000 });
}

export async function saveProfileStudioAndClose(page: Page): Promise<void> {
    const saveBtn = page.getByTestId('profile-settings-save');
    await expect(saveBtn).toBeVisible({ timeout: 12_000 });
    await expect(saveBtn).toBeEnabled({ timeout: 12_000 });
    await saveBtn.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByTestId('profile-settings-sheet')).toBeHidden({ timeout: 15_000 });
}

/** نقر تبويب الاستوديو على العنصر نفسه — بلا force يمرّر النقرة للخلفية */
export async function clickProfileStudioTab(page: Page, testId: string): Promise<void> {
    const tab = page.getByTestId(testId);
    await expect(tab).toBeVisible({ timeout: 12_000 });
    await tab.evaluate((el) => (el as HTMLButtonElement).click());
}

/** أصغر JPEG صالح لرفع صورة كتلة الاستوديو / المعرض */
export const E2E_PROFILE_TINY_JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
    'base64',
);

/** يرفع للصورة المفتوحة في الاستوديو دون نقر زر يفتح منتقي النظام */
export async function uploadStudioCustomBlockImage(page: Page): Promise<void> {
    const input = page.getByTestId('profile-studio-block-image-input');
    await expect(input).toBeAttached({ timeout: 12_000 });
    await input.setInputFiles({
        name: 'e2e-studio-block.jpg',
        mimeType: 'image/jpeg',
        buffer: E2E_PROFILE_TINY_JPEG,
    });
    await input.evaluate((el) => (el as HTMLInputElement).blur());
    await expect(page.getByTestId('image-focus-picker')).toBeVisible({ timeout: 20_000 });
}

export async function uploadProfileGalleryImage(page: Page): Promise<void> {
    const input = page.getByTestId('lawyer-profile-gallery-input');
    await expect(input).toBeAttached({ timeout: 12_000 });
    await input.setInputFiles({
        name: 'e2e-gallery.jpg',
        mimeType: 'image/jpeg',
        buffer: E2E_PROFILE_TINY_JPEG,
    });
    await expect(page.getByText(/تم رفع الصورة|تم حفظ الصورة محلياً/)).toBeVisible({
        timeout: 12_000,
    });
}

export function visibleProfileRoot(page: Page): Locator {
    return page.locator('[data-lawyer-profile-root]').filter({ visible: true }).first();
}

export async function openProfileStudio(page: Page) {
    await openLawyerProfile(page);

    const existingSheet = page.getByTestId('profile-settings-sheet');
    if (await existingSheet.isVisible().catch(() => false)) {
        return existingSheet;
    }

    const settingsBtn = page.locator('[data-profile-live-tree]').getByTestId('lawyer-profile-settings');
    await expect(settingsBtn).toBeAttached({ timeout: 15_000 });
    await expect(async () => {
        if ((await existingSheet.count()) > 0) return;
        await settingsBtn.evaluate((el) => (el as HTMLButtonElement).click());
        if ((await page.locator('html').getAttribute('data-hami-profile-open')) !== '1') {
            const snap = await dumpProfileE2E(page, 'settings-click-closed-profile');
            throw new Error(`نقر الاستوديو أغلق الملف | ${snap}`);
        }
        await expect(
            existingSheet.or(page.getByTestId('profile-settings-sheet-loading')),
        ).toBeAttached({ timeout: 8_000 });
    }).toPass({ timeout: 25_000 });
    return waitForProfileSettingsSheet(page);
}

/** يفتح الاستوديو دون إعادة تحميل الصفحة — للاستخدام بعد إغلاق الورقة */
export async function reopenProfileStudio(page: Page) {
    await dismissProfileBlockers(page);

    const existingSheet = page.getByTestId('profile-settings-sheet');
    if (await existingSheet.isVisible().catch(() => false)) {
        return existingSheet;
    }

    const visibleProfile = page.getByTestId('lawyer-profile').filter({ visible: true });
    if ((await visibleProfile.count()) === 0) {
        await page.evaluate(() => window.__hamiE2eForceOpenProfileTab?.()).catch(() => undefined);
        await page.waitForTimeout(400);
    }

    if ((await visibleProfile.count()) === 0) {
        const forumProfile = page.getByTestId('home-dock-forum-profile');
        if (await forumProfile.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await clickHomeForumProfile(page);
        } else {
            return openProfileStudio(page);
        }
    }

    await expect(visibleProfile.first()).toBeVisible({ timeout: 25_000 });

    const settingsBtn = visibleProfile.first().getByTestId('lawyer-profile-settings');
    await settingsBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await settingsBtn.click({ force: true, timeout: 12_000 });
    return waitForProfileSettingsSheet(page);
}

export const E2E_PROFILE_COLD_OPEN_MS = PROFILE_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_PROFILE_CACHED_OPEN_MS = PROFILE_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

export const E2E_FORUM_VISITOR_AUTHOR_ID = 'e2e-forum-author-2';
export const E2E_FORUM_VISITOR_AUTHOR_NAME = 'محامٍ زائر اختبار';
export const E2E_FORUM_VISITOR_POST_ID = 'e2e-forum-post-visitor-profile';
export const COMMUNITY_POSTS_KEY = 'hami:community:posts:v1';

export function buildE2eForumVisitorPost() {
    const now = new Date().toISOString();
    return {
        id: E2E_FORUM_VISITOR_POST_ID,
        authorId: E2E_FORUM_VISITOR_AUTHOR_ID,
        authorName: E2E_FORUM_VISITOR_AUTHOR_NAME,
        content: 'استشارة قانونية تجريبية لفتح ملف زائر من المنتدى — نص كافٍ للعرض',
        tags: ['اختبار'],
        createdAt: now,
        updatedAt: now,
        attachment: null,
        upvoterIds: [] as string[],
        comments: [] as unknown[],
        bestCommentId: null,
        isAnonymous: false,
    };
}

export function buildE2eForumVisitorProfile() {
    return {
        header: {
            name: E2E_FORUM_VISITOR_AUTHOR_NAME,
            title: 'محامٍ استشاري',
            coverImage: '',
            profileImage: '',
            phone: '07701234567',
            city: 'بغداد',
            syndicateId: '12345',
        },
        sections: [],
    };
}

export async function ensureForumVisitorPostSeeded(page: Page): Promise<void> {
    const post = buildE2eForumVisitorPost();
    const postJson = JSON.stringify([post]);
    const profileJson = JSON.stringify(buildE2eForumVisitorProfile());
    const profileKey = `hami:profile:v1:${E2E_FORUM_VISITOR_AUTHOR_ID}`;
    const deletedIdsKey = 'hami:community:deleted-ids:v1';

    await page.evaluate(
        ({ postsKey, postJson, profileKey, profileJson, deletedIdsKey, postId }) => {
            try {
                localStorage.removeItem(deletedIdsKey);
            } catch {
                /* ignore */
            }

            let mergedPosts: unknown[] = [];
            const bridge = (
                window as Window & {
                    __hamiE2eSecureStore?: { getItemSync?: (k: string) => string | null; setItemSync?: (k: string, v: string) => boolean };
                }
            ).__hamiE2eSecureStore;
            try {
                const raw = bridge?.getItemSync?.(postsKey) ?? localStorage.getItem(postsKey);
                const parsed = raw ? JSON.parse(raw) : [];
                if (Array.isArray(parsed)) {
                    mergedPosts = parsed.filter(
                        (item) =>
                            item &&
                            typeof item === 'object' &&
                            (item as { id?: string }).id !== postId,
                    );
                }
            } catch {
                mergedPosts = [];
            }
            const seeded = JSON.parse(postJson);
            const next = JSON.stringify([...seeded, ...mergedPosts]);
            if (bridge?.setItemSync) {
                bridge.setItemSync(postsKey, next);
                try {
                    localStorage.removeItem(postsKey);
                } catch {
                    /* ignore */
                }
            } else {
                localStorage.setItem(postsKey, next);
            }
            localStorage.setItem(profileKey, profileJson);
        },
        {
            postsKey: COMMUNITY_POSTS_KEY,
            postJson,
            profileKey,
            profileJson,
            deletedIdsKey,
            postId: E2E_FORUM_VISITOR_POST_ID,
        },
    );
}

/** منشور منتدى بمؤلف غير الجلسة الحالية + ملفه المحلي */
export async function seedForumVisitorProfileContext(page: Page): Promise<void> {
    await page.addInitScript(
        ({ postsKey, postJson, profileKey, profileJson }) => {
            localStorage.setItem(postsKey, postJson);
            localStorage.setItem(profileKey, profileJson);
        },
        {
            postsKey: COMMUNITY_POSTS_KEY,
            postJson: JSON.stringify([buildE2eForumVisitorPost()]),
            profileKey: `hami:profile:v1:${E2E_FORUM_VISITOR_AUTHOR_ID}`,
            profileJson: JSON.stringify(buildE2eForumVisitorProfile()),
        },
    );
}

export async function openForumVisitorAuthorProfile(page: Page) {
    await ensureForumVisitorPostSeeded(page);
    await openForumFromHome(page, { alreadyOnHome: true });
    await dismissForumBlockers(page);
    await expect(page.getByTestId('forum-post-list')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('forum-post-empty')).toHaveCount(0, { timeout: 25_000 });

    /* openForumFromHome يعيد زرع منشور المنتدى بنفس المؤلف — لا تعتمد على نص الزائر الفريد */
    const authorBtn = page
        .getByTestId('forum-open-author-profile')
        .filter({ hasText: E2E_FORUM_VISITOR_AUTHOR_NAME })
        .or(page.getByRole('button', { name: E2E_FORUM_VISITOR_AUTHOR_NAME }))
        .first();
    const overlay = page.getByTestId('forum-member-profile');
    await expect(authorBtn).toBeVisible({ timeout: 25_000 });
    await expect(async () => {
        if (await overlay.isVisible().catch(() => false)) return;
        await authorBtn.evaluate((el) => (el as HTMLButtonElement).click());
        await expect(overlay).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
    return overlay.getByTestId('lawyer-profile');
}

declare global {
    interface Window {
        __hamiE2eForceOpenProfileTab?: () => void;
        __hamiE2eProfileTabDebug?: () => { activeTab: string };
    }
}

export async function clearProfilePerfMarksInPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        for (const phase of ['open-request', 'first-paint', 'interactive', 'chunk-ready'] as const) {
            performance.clearMarks(`hami:profile:${phase}`);
        }
    });
}

export async function readProfileOpenToInteractiveMs(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const latest = (name: string) => {
            const entries = performance.getEntriesByName(name, 'mark');
            return entries.length > 0 ? entries[entries.length - 1] : undefined;
        };
        const open = latest('hami:profile:open-request');
        const interactive = latest('hami:profile:interactive');
        if (!open || !interactive) return null;
        if (interactive.startTime < open.startTime) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

/** ينتظر تسجيل open-request و interactive — يتجنب سباق rAF بعد إعادة الفتح */
export async function waitForProfileOpenToInteractiveMs(
    page: Page,
    timeoutMs = 20_000,
): Promise<number | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ms = await readProfileOpenToInteractiveMs(page);
        if (ms != null) return ms;
        await page.waitForTimeout(50);
    }
    return null;
}
