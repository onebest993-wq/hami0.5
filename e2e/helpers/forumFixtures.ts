import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { FORUM_PERF_BUDGET } from '@/app/services/forum/forumPerfBudget';
import { waitForLawyerDashboardReady } from './bootFixtures';
import { clickNativeElement } from './executionE2EBoot';
import { prepareProductivityE2E, dismissProductivityBlockers } from './productivityE2EFixtures';

/** يطابق seedLawyerFiles — ليس guest-lawyer-1 (بوابة المنتدى ترفض الضيف) */
export const E2E_FORUM_LAWYER_ID = 'dev-user-uuid-1';
export const E2E_FORUM_SEED_POST_ID = 'e2e-forum-seed-post-1';

function e2eForumSeedPost() {
    const now = new Date().toISOString();
    return {
        id: E2E_FORUM_SEED_POST_ID,
        authorId: 'e2e-forum-author-2',
        authorName: 'محامٍ زائر اختبار',
        content: 'منشور اختبار E2E للمنتىى: تعليق ومتابعة وبحث.',
        tags: [],
        createdAt: now,
        updatedAt: now,
        attachment: null,
        upvoterIds: [],
        comments: [],
        isAnonymous: false,
        isPinned: false,
        isLocked: false,
    };
}

/** ms من open-request → interactive — للـ E2E */
export async function readForumOpenToInteractiveMs(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const open = performance.getEntriesByName('hami:forum:open-request', 'mark')[0];
        const interactive = performance.getEntriesByName('hami:forum:interactive', 'mark')[0];
        if (!open || !interactive) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

export const E2E_FORUM_COLD_OPEN_MS = FORUM_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_FORUM_CACHED_OPEN_MS = FORUM_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

/** زر المنتدى في dock الرئيسية — testid أو aria-label */
export function forumHomeTrigger(page: Page) {
    return page
        .getByTestId('home-dock-forum')
        .or(page.getByRole('button', { name: 'المنتدى القانوني' }))
        .filter({ visible: true });
}

/**
 * سطح فتح المنتدى: شريط كامل، أو بوابة الضيف، أو الطبقة.
 * `.or()` بدون `.first()` يخالف strict mode إذا ظهر أكثر من سطح.
 */
export function forumOpenSurface(page: Page): Locator {
    return page
        .getByTestId('forum-app-bar')
        .or(page.getByTestId('forum-access-denied'))
        .or(page.getByTestId('forum-access-pending'))
        .or(page.getByTestId('forum-access-rejected'))
        .or(page.getByTestId('forum-access-loading'))
        .or(page.getByTestId('forum-screen-shell'))
        .or(page.locator('[data-testid="forum-overlay-host"][data-forum-layer-open="1"]'));
}

async function isForumLayerOpen(page: Page): Promise<boolean> {
    return (
        (await page.getByTestId('forum-screen-shell').isVisible().catch(() => false)) ||
        (await page.getByTestId('forum-screen-loading').isVisible().catch(() => false)) ||
        (await page.getByTestId('forum-app-bar').filter({ visible: true }).isVisible().catch(() => false)) ||
        (await page.getByTestId('forum-access-denied').isVisible().catch(() => false)) ||
        (await page.getByTestId('forum-access-pending').isVisible().catch(() => false)) ||
        (await page.getByTestId('forum-access-rejected').isVisible().catch(() => false)) ||
        (await page.getByTestId('forum-access-loading').isVisible().catch(() => false)) ||
        (await page
            .locator('[data-testid="forum-overlay-host"][data-forum-layer-open="1"]')
            .isVisible()
            .catch(() => false))
    );
}

/** يغلق المنتدى إن كان مفتوحاً وينتظر ظهور dock الرئيسية */
export async function closeForumIfOpen(page: Page): Promise<void> {
    if (page.isClosed()) return;
    if (!(await isForumLayerOpen(page))) return;
    await dismissProductivityBlockers(page);
    const back = page.getByTestId('forum-access-back').or(page.getByTestId('forum-back'));
    if (await back.first().isVisible().catch(() => false)) {
        await back
            .first()
            .evaluate((el) => (el as HTMLButtonElement).click())
            .catch(() => undefined);
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
        if (!(await isForumLayerOpen(page))) break;
        await page.keyboard.press('Escape').catch(() => undefined);
        await forumOpenSurface(page)
            .first()
            .waitFor({ state: 'hidden', timeout: 4_000 })
            .catch(() => undefined);
    }
    await dismissProductivityBlockers(page);
    await forumHomeTrigger(page)
        .first()
        .waitFor({ state: 'visible', timeout: 12_000 })
        .catch(() => undefined);
}

export async function clearForumPerfMarksInPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`hami:forum:${phase}`);
        }
    });
}

async function waitForForumForceOpenHook(page: Page, required = false): Promise<void> {
    try {
        await page.waitForFunction(
            () =>
                typeof (window as Window & { __hamiE2eForceOpenCommunity?: () => void })
                    .__hamiE2eForceOpenCommunity === 'function',
            { timeout: required ? 25_000 : 12_000 },
        );
    } catch (err) {
        if (required) {
            /* محاولة أخيرة: نقرة الدوك قد تُسلّح stub بعد تأخر التركيب */
            const trigger = forumHomeTrigger(page).first();
            if (await trigger.isVisible().catch(() => false)) {
                await clickNativeElement(trigger).catch(() => undefined);
            }
            try {
                await page.waitForFunction(
                    () =>
                        typeof (window as Window & { __hamiE2eForceOpenCommunity?: () => void })
                            .__hamiE2eForceOpenCommunity === 'function',
                    { timeout: 8_000 },
                );
                return;
            } catch {
                throw new Error(
                    '__hamiE2eForceOpenCommunity لم يُسجَّل — سطح PreDock للمنتىى غير مسلّح',
                );
            }
        }
        void err;
    }
}

async function forceOpenForumFromPage(page: Page): Promise<void> {
    await page
        .evaluate(() => {
            const w = window as Window & { __hamiE2eForceOpenCommunity?: () => void };
            w.__hamiE2eForceOpenCommunity?.();
            window.dispatchEvent(new CustomEvent('hami:open-forum'));
        })
        .catch(() => undefined);
}

async function readForumOpenDebug(page: Page): Promise<string> {
    return page
        .evaluate(() => {
            const w = window as Window & {
                __hamiE2eForceOpenCommunity?: () => void;
                __hamiE2eCommunityDebug?: () => {
                    showCommunity: boolean;
                    communityHostMounted: boolean;
                    activeTab: string;
                };
            };
            const ids = [
                'forum-app-bar',
                'forum-overlay-host',
                'forum-screen',
                'forum-screen-shell',
                'forum-access-denied',
                'forum-access-pending',
                'forum-access-rejected',
                'forum-access-loading',
                'forum-error-fallback',
            ];
            const counts: Record<string, number> = {};
            for (const id of ids) {
                counts[id] = document.querySelectorAll(`[data-testid="${id}"]`).length;
            }
            return JSON.stringify({
                htmlForumOpen: document.documentElement.getAttribute('data-hami-forum-open'),
                forceOpen: typeof w.__hamiE2eForceOpenCommunity,
                debug: w.__hamiE2eCommunityDebug?.() ?? null,
                counts,
                errorFallbackText: document
                    .querySelector('[data-testid="forum-error-fallback"]')
                    ?.textContent?.slice(0, 240) ?? null,
            });
        })
        .catch((err) => `debug-failed:${err instanceof Error ? err.message : String(err)}`);
}

async function expectForumOpenedFromHome(page: Page): Promise<Locator> {
    await dismissForumBlockers(page);
    if (await page.getByTestId('forum-access-denied').isVisible().catch(() => false)) {
        throw new Error('المنتدى بقي على بوابة الضيف — جلسة E2E غير معتمدة');
    }
    if (await page.getByTestId('forum-access-pending').isVisible().catch(() => false)) {
        throw new Error('المنتدى بقي على قيد التدقيق — جلسة E2E غير معتمدة');
    }
    if (await page.getByTestId('forum-access-rejected').isVisible().catch(() => false)) {
        throw new Error('المنتدى بقي على رفض التوثيق — جلسة E2E غير معتمدة');
    }

    const appBar = page.getByTestId('forum-app-bar').filter({ visible: true }).first();
    try {
        await expect(async () => {
            if (await page.getByTestId('forum-error-fallback').isVisible().catch(() => false)) {
                throw new Error('المنتدى سقط على forum-error-fallback');
            }
            if (await page.getByTestId('forum-access-denied').isVisible().catch(() => false)) {
                throw new Error('المنتدى بقي على بوابة الضيف — جلسة E2E غير معتمدة');
            }
            if (await page.getByTestId('forum-access-pending').isVisible().catch(() => false)) {
                throw new Error('المنتدى بقي على قيد التدقيق — جلسة E2E غير معتمدة');
            }
            if (await page.getByTestId('forum-access-rejected').isVisible().catch(() => false)) {
                throw new Error('المنتدى بقي على رفض التوثيق — جلسة E2E غير معتمدة');
            }
            if (!(await appBar.isVisible().catch(() => false))) {
                await forceOpenForumFromPage(page);
            }
            await expect(appBar).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 45_000 });
    } catch (err) {
        const snap = await readForumOpenDebug(page);
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`شريط المنتدى لم يظهر. ${reason} | ${snap}`);
    }

    const overlay = page.locator('[data-testid="forum-overlay-host"][data-forum-layer-open="1"]');
    if (await overlay.isVisible().catch(() => false)) {
        return overlay;
    }
    return page.getByTestId('forum-screen-shell').filter({ visible: true }).first();
}

/** فتح المنتدى من dock الرئيسية — شريط كامل أو بوابة «المنتدى مغلق» للضيف */
export async function openForumFromHome(
    page: Page,
    options?: { alreadyOnHome?: boolean },
): Promise<Locator> {
    await dismissProductivityBlockers(page);
    await hydrateForumE2ESession(page);

    if (await isForumLayerOpen(page)) {
        await closeForumIfOpen(page);
    }
    if (await isForumLayerOpen(page)) {
        await dismissForumBlockers(page);
        return expectForumOpenedFromHome(page);
    }

    if (!options?.alreadyOnHome) {
        await waitForLawyerDashboardReady(page);
        await dismissProductivityBlockers(page);
        await hydrateForumE2ESession(page);
    }

    /* نقرة الدوك أولاً: stub يُسلّح PreDock حتى قبل تسجيل الخطاف الحي */
    const trigger = forumHomeTrigger(page).first();
    if (await trigger.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => undefined);
        await clickNativeElement(trigger);
    }
    await waitForForumForceOpenHook(page, Boolean(options?.alreadyOnHome));
    await forceOpenForumFromPage(page);

    return expectForumOpenedFromHome(page);
}

/** يمنع طبقة hami-boot-failure من حجب النقرات أثناء اختبارات المنتدى */
export async function prepareForumE2E(page: Page): Promise<void> {
    await prepareProductivityE2E(page);
    await page.route('**/api/kv-proxy**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, value: null }),
        });
    });
    await page.route('**/api/forum/posts**', async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, posts: [e2eForumSeedPost()], total: 1 }),
            });
            return;
        }
        if (method === 'POST') {
            let body: { action?: string; post?: unknown } = {};
            try {
                body = route.request().postDataJSON() as { action?: string; post?: unknown };
            } catch {
                body = {};
            }
            if (body.action === 'create' || body.action === 'sync') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ok: true, post: body.post }),
                });
                return;
            }
        }
        await route.continue();
    });
    await page.route('**/api/auth/lawyer-verification**', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    record: { status: 'active' },
                }),
            });
            return;
        }
        await route.continue();
    });
    await page.addInitScript(applyForumE2ELawyerSession);
}

/** يزرع جلسة محامٍ معتمد للمنتدى — init + بعد إقلاع اللوحة */
export function applyForumE2ELawyerSession(): void {
    try {
        (window as Window & { __HAMI_E2E_FORUM__?: boolean }).__HAMI_E2E_FORUM__ = true;
        sessionStorage.removeItem('hami:lawyer-community-open');
        sessionStorage.setItem('hami:community-section', 'forum');
        const userId = 'dev-user-uuid-1';
        const user = {
            id: userId,
            email: 'e2e.forum@local',
            role: 'authenticated',
            app_metadata: {
                provider: 'email',
                providers: ['email'],
                role: 'lawyer',
                systemRole: 'lawyer',
                verification_status: 'active',
            },
            user_metadata: {
                accountType: 'lawyer',
                role: 'lawyer',
                fullName: 'E2E Forum Lawyer',
                verificationStatus: 'active',
            },
        };
        localStorage.setItem('hami:dev-mock-user', JSON.stringify(user));
        localStorage.setItem('hami:dev-mock-access-token', `dev-access-token-${userId}`);
        const now = new Date().toISOString();
        const seedPost = {
            id: 'e2e-forum-seed-post-1',
            authorId: 'e2e-forum-author-2',
            authorName: 'محامٍ زائر اختبار',
            content: 'منشور اختبار E2E للمنتىى: تعليق ومتابعة وبحث.',
            tags: [],
            createdAt: now,
            updatedAt: now,
            attachment: null,
            upvoterIds: [],
            comments: [],
            isAnonymous: false,
            isPinned: false,
            isLocked: false,
        };
        let posts: unknown[] = [seedPost];
        try {
            const existingRaw = localStorage.getItem('hami:community:posts:v1');
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            if (Array.isArray(existing) && existing.length > 0) {
                const byId = new Map<string, unknown>();
                for (const row of existing) {
                    if (row && typeof row === 'object' && typeof (row as { id?: string }).id === 'string') {
                        byId.set((row as { id: string }).id, row);
                    }
                }
                if (!byId.has(seedPost.id)) {
                    posts = [seedPost, ...existing];
                } else {
                    posts = existing;
                }
            }
        } catch {
            posts = [seedPost];
        }
        localStorage.setItem('hami:community:posts:v1', JSON.stringify(posts));
        localStorage.setItem(
            'hami:auth:lawyer-verification:v1',
            JSON.stringify({
                [userId]: {
                    userId,
                    status: 'active',
                    submittedAt: now,
                    updatedAt: now,
                    payload: {
                        email: 'e2e.forum@local',
                        fullName: 'E2E',
                        familyName: 'Forum',
                        phone: '07000000000',
                        governorate: 'بغداد',
                        lawyerBarRoom: 'بغداد',
                        idFrontDataUrl: null,
                        idBackDataUrl: null,
                        faceSelfieDataUrl: null,
                        faceAssistOptedIn: false,
                    },
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

export async function hydrateForumE2ESession(page: Page): Promise<void> {
    await page.waitForFunction(
        () =>
            typeof (window as Window & { __hamiE2eApplyDevMockAuth?: () => boolean })
                .__hamiE2eApplyDevMockAuth === 'function',
        { timeout: 12_000 },
    ).catch(() => undefined);
    await page.evaluate(applyForumE2ELawyerSession);
    await page.evaluate(() => {
        (window as Window & { __hamiE2eApplyDevMockAuth?: () => boolean }).__hamiE2eApplyDevMockAuth?.();
    });
    const seeded = await page.evaluate(() => {
        try {
            const raw = localStorage.getItem('hami:dev-mock-user');
            const id = raw ? (JSON.parse(raw) as { id?: string }).id : null;
            return id && id !== 'guest-lawyer-1' ? id : null;
        } catch {
            return null;
        }
    });
    if (!seeded) {
        throw new Error('hydrateForumE2ESession: بذرة المحامي المعتمد غير موجودة بعد الزرع');
    }
}

export async function dismissForumBlockers(page: Page): Promise<void> {
    await dismissProductivityBlockers(page);
}
