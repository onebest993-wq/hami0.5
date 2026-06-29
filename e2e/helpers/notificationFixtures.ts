import type { Page } from '@playwright/test';
import { stripBootFailureLayer } from './bootFixtures';
import { NOTIFICATION_PERF_BUDGET } from '@/app/services/notifications/notificationPerfBudget';

/** ms من open-request → interactive — للـ E2E */
export async function readNotificationsOpenToInteractiveMs(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const open = performance.getEntriesByName('hami:notifications:open-request', 'mark')[0];
        const interactive = performance.getEntriesByName('hami:notifications:interactive', 'mark')[0];
        if (!open || !interactive) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

export async function clearNotificationPerfMarksInPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`hami:notifications:${phase}`);
        }
    });
}

export const E2E_NOTIFICATIONS_COLD_OPEN_MS = NOTIFICATION_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_NOTIFICATIONS_CACHED_OPEN_MS = NOTIFICATION_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

declare global {
    interface Window {
        __hamiE2ePushNotification?: (partial: {
            id: string;
            title: string;
            message: string;
            type?: string;
            isRead?: boolean;
            createdAt?: string;
        }) => void;
        __hamiE2eNotificationsLoading?: () => boolean;
        __hamiE2eForceOpenNotifications?: () => void;
        __hamiE2eNotificationDebug?: () => {
            showNotifications: boolean;
            notificationPanelMounted: boolean;
        };
    }
}

export const E2E_NOTIFICATION_USER_ID = 'dev-user-uuid-1';

export function notificationStorageKey(userId: string): string {
    return `hami:notifications:v1:${userId}`;
}

export function buildE2eNotificationSeed() {
    const now = new Date().toISOString();
    return [
        {
            id: 'e2e-baseline-read',
            title: 'إشعار مقروء سابق',
            message: 'خط أساس للمنبثقات',
            type: 'forum_reply',
            category: 'forum',
            direction: 'incoming',
            isRead: true,
            createdAt: now,
        },
        {
            id: 'e2e-self-delete',
            title: 'حذفت سؤالاً',
            message: 'سؤال #',
            type: 'forum_reply',
            direction: 'outgoing',
            category: 'forum',
            isRead: false,
            createdAt: now,
        },
        {
            id: 'e2e-self-post',
            title: 'نشرت سؤالاً في المنتدى',
            message: 'سؤال تجريبي',
            type: 'forum_reply',
            direction: 'outgoing',
            category: 'forum',
            isRead: false,
            createdAt: now,
        },
        {
            id: 'e2e-incoming-reply',
            title: 'رد جديد على سؤالك',
            message: 'استشارة عقارية — محامي آخر',
            type: 'forum_reply',
            category: 'forum',
            direction: 'incoming',
            isRead: false,
            createdAt: now,
        },
    ];
}

/** يزرع إشعارات مختلطة (ذاتية + واردة) قبل تحميل الصفحة */
export async function seedNotificationFixtures(page: Page): Promise<void> {
    const items = buildE2eNotificationSeed();
    await page.addInitScript(
        ({ userId, key, payload }) => {
            localStorage.setItem(key, payload);
        },
        {
            userId: E2E_NOTIFICATION_USER_ID,
            key: notificationStorageKey(E2E_NOTIFICATION_USER_ID),
            payload: JSON.stringify(items),
        },
    );
}

export async function dismissBlockingOverlays(page: Page): Promise<void> {
    if (page.isClosed()) return;

    await stripBootFailureLayer(page);
    if (page.isClosed()) return;

    const toastClose = page.getByTestId('smart-toast-item').getByRole('button', { name: 'إغلاق' });
    if (await toastClose.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
        await toastClose.first().click({ force: true, timeout: 2_000 }).catch(() => undefined);
    }

    const deadline = Date.now() + 8_000;
    const closeButtons = page.getByRole('button', { name: 'إغلاق' });

    for (let attempt = 0; attempt < 3 && Date.now() < deadline; attempt++) {
        if (page.isClosed()) return;

        const count = await closeButtons.count().catch(() => 0);
        let clicked = false;

        for (let i = 0; i < count; i += 1) {
            if (page.isClosed() || Date.now() >= deadline) return;

            const btn = closeButtons.nth(i);
            const visible = await btn.isVisible({ timeout: 500 }).catch(() => false);
            if (!visible) continue;

            const inRepository = await btn
                .evaluate((el) => !!el.closest('[data-testid="smart-repository-modal"]'))
                .catch(() => false);
            if (inRepository) continue;

            const inProfileSettings = await btn
                .evaluate((el) => !!el.closest('[data-testid="profile-settings-sheet"]'))
                .catch(() => false);
            if (inProfileSettings) continue;

            await btn.click({ force: true, timeout: 4_000 }).catch(() => undefined);
            clicked = true;
        }

        if (!clicked) break;

        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await page.waitForTimeout(Math.min(150, remaining)).catch(() => undefined);
    }
}

export async function waitForE2eNotificationsBaseline(page: Page): Promise<void> {
    await page.waitForFunction(() => typeof window.__hamiE2eNotificationsLoading === 'function', undefined, {
        timeout: 20_000,
    });
    await page.waitForFunction(() => window.__hamiE2eNotificationsLoading?.() === false, undefined, {
        timeout: 20_000,
    });
}

/** يدفع إشعاراً وارداً جديداً عبر جسر DEV (بعد interactive) */
export async function pushE2eIncomingNotification(
    page: Page,
    partial: { id: string; title: string; message: string },
): Promise<void> {
    await page.waitForFunction(() => typeof window.__hamiE2ePushNotification === 'function', undefined, {
        timeout: 20_000,
    });
    await page.evaluate((payload) => {
        window.__hamiE2ePushNotification?.({
            ...payload,
            type: 'forum_reply',
            isRead: false,
            createdAt: new Date().toISOString(),
        });
    }, partial);
}
