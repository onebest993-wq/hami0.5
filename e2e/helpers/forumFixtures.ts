import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { FORUM_PERF_BUDGET } from '@/app/services/forum/forumPerfBudget';
import { prepareProductivityE2E, dismissProductivityBlockers } from './productivityE2EFixtures';

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
        .or(page.getByRole('button', { name: 'المنتدى القانوني' }));
}

/** يغلق المنتدى إن كان مفتوحاً وينتظر ظهور dock الرئيسية */
export async function closeForumIfOpen(page: Page): Promise<void> {
    if (page.isClosed()) return;
    const screen = page.getByTestId('forum-screen');
    const loading = page.getByTestId('forum-screen-loading');
    const appBar = page.getByTestId('forum-app-bar');
    const isOpen =
        (await screen.isVisible().catch(() => false)) ||
        (await loading.isVisible().catch(() => false)) ||
        (await appBar.isVisible().catch(() => false));
    if (!isOpen) return;
    await dismissProductivityBlockers(page);
    const back = page.getByTestId('forum-back');
    if (await back.isVisible().catch(() => false)) {
        await back.click({ timeout: 5_000, force: true }).catch(() => undefined);
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
        if (
            !(await screen.isVisible().catch(() => false)) &&
            !(await loading.isVisible().catch(() => false)) &&
            !(await appBar.isVisible().catch(() => false))
        ) {
            break;
        }
        await page.keyboard.press('Escape').catch(() => undefined);
        await screen.or(loading).or(appBar).waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => undefined);
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

async function waitHomeDockForumReady(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissProductivityBlockers(page);
    await page
        .getByTestId('lawyer-dashboard-ready')
        .waitFor({ state: 'visible', timeout: 45_000 })
        .catch(() => undefined);
    const trigger = forumHomeTrigger(page).first();
    await trigger.waitFor({ state: 'visible', timeout: 25_000 });
    await trigger.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => undefined);
}

/** فتح المنتدى من dock الرئيسية — مع إعادة محاولة عند detach */
export async function openForumFromHome(page: Page): Promise<Locator> {
    await dismissProductivityBlockers(page);

    const screen = page.getByTestId('forum-screen');
    const loading = page.getByTestId('forum-screen-loading');
    const appBar = page.getByTestId('forum-app-bar');
    const forumOpen =
        (await screen.isVisible().catch(() => false)) ||
        (await loading.isVisible().catch(() => false)) ||
        (await appBar.isVisible().catch(() => false));
    if (forumOpen) {
        await closeForumIfOpen(page);
    }
    if (await screen.isVisible().catch(() => false)) {
        await dismissForumBlockers(page);
        await expect(page.getByTestId('forum-app-bar')).toBeVisible({ timeout: 10_000 });
        return screen;
    }
    if (await appBar.isVisible().catch(() => false)) {
        await dismissForumBlockers(page);
        return screen;
    }
    if (await loading.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => undefined);
        await loading.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => undefined);
    }

    await waitHomeDockForumReady(page);

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const trigger = forumHomeTrigger(page).first();
            await trigger.waitFor({ state: 'visible', timeout: 15_000 });
            await trigger.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => undefined);
            await trigger.hover().catch(() => undefined);
            await trigger.click({ timeout: 15_000, force: true });
            await expect(screen.or(loading)).toBeVisible({ timeout: 20_000 });
            await dismissForumBlockers(page);
            await expect(page.getByTestId('forum-app-bar')).toBeVisible({ timeout: 20_000 });
            return screen;
        } catch (err) {
            lastError = err;
            if (attempt === 0 && (await screen.isVisible().catch(() => false))) {
                await dismissForumBlockers(page);
                return screen;
            }
        }
    }
    throw lastError;
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
        if (route.request().method() !== 'GET') {
            await route.continue();
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, posts: [], total: 0 }),
        });
    });
    await page.addInitScript(() => {
        try {
            sessionStorage.removeItem('hami:lawyer-community-open');
            sessionStorage.setItem('hami:community-section', 'forum');
        } catch {
            /* ignore */
        }
    });
}

export async function dismissForumBlockers(page: Page): Promise<void> {
    await dismissProductivityBlockers(page);
}
