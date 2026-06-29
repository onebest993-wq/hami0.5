import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { PROFILE_PERF_BUDGET } from '@/app/services/profile/profilePerfBudget';
import { stripBootFailureLayer, suppressWeeklyBackupReminder } from './bootFixtures';
import { bootToHomeDock } from './homeDockFixtures';
import { seedLawyerFiles } from './civilLawsuitFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './productivityE2EFixtures';
import { dismissForumBlockers, openForumFromHome } from './forumFixtures';

export async function prepareProfileE2E(page: Page): Promise<void> {
    await prepareProductivityE2E(page);
    await suppressWeeklyBackupReminder(page);
    await seedLawyerFiles(page);
}

/** إقلاع سريع للوحة — بدون ensureLawyerDashboard/reload (~95s) */
export async function bootLawyerDashboardForProfile(page: Page): Promise<void> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await bootToHomeDock(page);
    await dismissProfileBlockers(page);
    await expect(page.getByTestId('header-profile-trigger')).toBeVisible({ timeout: 15_000 });
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

export async function clickLawyerProfileBack(page: Page): Promise<void> {
    await closeLawyerProfileTab(page);
}

/** يغلق تبويب الملف — زر الرجوع ثم Escape كاحتياط */
export async function closeLawyerProfileTab(page: Page): Promise<void> {
    await dismissProfileBlockers(page);
    await expect(page.getByTestId('lawyer-profile-edit-save')).toHaveCount(0, { timeout: 15_000 }).catch(
        () => undefined,
    );

    const back = page.getByTestId('lawyer-profile-back');
    if (await back.isVisible().catch(() => false)) {
        await back.click({ force: true, timeout: 12_000 });
    }

    if (await page.getByTestId('lawyer-profile').isVisible().catch(() => false)) {
        await page.keyboard.press('Escape');
    }

    await expect(page.getByTestId('lawyer-profile')).toBeHidden({ timeout: 15_000 });
}

async function clickHeaderProfileTrigger(page: Page): Promise<void> {
    const headerTrigger = page.getByTestId('header-profile-trigger');
    await headerTrigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await dismissProfileBlockers(page);
    try {
        await headerTrigger.click({ timeout: 12_000 });
    } catch {
        await dismissProfileBlockers(page);
        await headerTrigger.click({ force: true, timeout: 12_000 });
    }
}

export async function openLawyerProfile(page: Page) {
    const existing = page.getByTestId('lawyer-profile');
    if (await existing.isVisible().catch(() => false)) {
        await expect(page.getByTestId('lawyer-profile-loading')).toHaveCount(0, { timeout: 8_000 }).catch(
            () => undefined,
        );
        return existing;
    }

    const headerTrigger = page.getByTestId('header-profile-trigger');
    if (!(await headerTrigger.isVisible().catch(() => false))) {
        await bootLawyerDashboardForProfile(page);
    } else {
        await dismissProfileBlockers(page);
    }

    await clickHeaderProfileTrigger(page);

    const profile = page.getByTestId('lawyer-profile');
    const tabLoading = page.getByTestId('lawyer-profile-tab-loading');
    const opened =
        (await profile.isVisible({ timeout: 5_000 }).catch(() => false)) ||
        (await tabLoading.isVisible({ timeout: 3_000 }).catch(() => false));
    if (!opened) {
        await page.evaluate(() => window.__hamiE2eForceOpenProfileTab?.());
    }
    await expect(profile.or(tabLoading)).toBeVisible({ timeout: 25_000 });
    await expect(profile).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('lawyer-profile-loading')).toHaveCount(0, { timeout: 15_000 });
    return profile;
}

export async function prepareProfileStudioE2E(page: Page): Promise<void> {
    await prepareProfileE2E(page);
    await bootLawyerDashboardForProfile(page);
}

export async function waitForProfileSettingsSheet(page: Page): Promise<Locator> {
    const sheet = page.getByTestId('profile-settings-sheet');
    const loading = page.getByTestId('profile-settings-sheet-loading');
    await expect(sheet.or(loading)).toBeVisible({ timeout: 20_000 });
    await expect(sheet).toBeVisible({ timeout: 20_000 });
    return sheet;
}

export async function openProfileStudio(page: Page) {
    const profile = await openLawyerProfile(page);
    await dismissProfileBlockers(page);

    const existingSheet = page.getByTestId('profile-settings-sheet');
    if (await existingSheet.isVisible().catch(() => false)) {
        return existingSheet;
    }

    const settingsBtn = profile.getByTestId('lawyer-profile-settings');
    await settingsBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await settingsBtn.click({ force: true, timeout: 12_000 });
    return waitForProfileSettingsSheet(page);
}

/** يفتح الاستوديو دون إعادة تحميل الصفحة — للاستخدام بعد إغلاق الورقة */
export async function reopenProfileStudio(page: Page) {
    let profile = page.getByTestId('lawyer-profile');
    if (!(await profile.isVisible().catch(() => false))) {
        await page.evaluate(() => window.__hamiE2eForceOpenProfileTab?.()).catch(() => undefined);
        if (!(await profile.isVisible({ timeout: 3_000 }).catch(() => false))) {
            return openProfileStudio(page);
        }
    } else {
        await expect(profile).toBeVisible({ timeout: 12_000 });
    }
    await dismissProfileBlockers(page);

    const existingSheet = page.getByTestId('profile-settings-sheet');
    if (await existingSheet.isVisible().catch(() => false)) {
        return existingSheet;
    }

    const settingsBtn = profile.getByTestId('lawyer-profile-settings');
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
            try {
                const raw = localStorage.getItem(postsKey);
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
            localStorage.setItem(postsKey, JSON.stringify([...seeded, ...mergedPosts]));
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
    const postSnippet = buildE2eForumVisitorPost().content.slice(0, 24);

    await ensureForumVisitorPostSeeded(page);
    await openForumFromHome(page);
    await dismissForumBlockers(page);
    await expect(page.getByTestId('forum-post-list')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('forum-post-empty')).toHaveCount(0, { timeout: 25_000 });
    await expect(page.getByText(postSnippet, { exact: false })).toBeVisible({ timeout: 25_000 });

    const authorBtn = page
        .getByTestId('forum-open-author-profile')
        .filter({ hasText: E2E_FORUM_VISITOR_AUTHOR_NAME })
        .or(page.getByRole('button', { name: E2E_FORUM_VISITOR_AUTHOR_NAME }))
        .first();
    await expect(authorBtn).toBeVisible({ timeout: 20_000 });
    await authorBtn.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => undefined);
    await authorBtn.click({ timeout: 12_000 });
    await expect(page.getByTestId('forum-member-profile')).toBeVisible({ timeout: 12_000 });
    return page.getByTestId('lawyer-profile');
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
