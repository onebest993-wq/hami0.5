import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import {
    applyE2eBootHomeLayoutAtRuntime,
    recoverLawyerDashboardBootError,
    stripBootFailureLayer,
} from './bootFixtures';
import { lawyerDashboardReady } from './lawyerDashboardLocators';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { revealHeaderToolbarTools } from './headerToolbarFixtures';
import { NOTIFICATION_PERF_BUDGET } from '@/app/services/notifications/notificationPerfBudget';/** ms من open-request → interactive — للـ E2E */
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
            direction?: string;
            actionPayload?: Record<string, unknown>;
        }) => void;
        __hamiE2eSeedInbox?: (
            items: Array<{
                id: string;
                title: string;
                message: string;
                type?: string;
                isRead?: boolean;
                createdAt?: string;
                direction?: string;
            }>,
            userId?: string | null,
        ) => number;
        __hamiE2eNotificationsLoading?: () => boolean;
        __hamiE2eForceCloseNotifications?: () => void;
        __hamiE2eForceOpenNotifications?: () => void;
        __hamiE2eNotificationDebug?: () => {
            showNotifications: boolean;
            notificationPanelMounted: boolean;
        };
    }
}
/** يطابق جلسة VITE_SHELL_AUTH_OPEN (`guest-lawyer-1`) — لا `dev-user-uuid-1` */
export const E2E_NOTIFICATION_USER_ID = 'guest-lawyer-1';

export function notificationsHeaderTrigger(page: Page): Locator {
    return page.getByTestId('header-notifications-trigger').first();
}

/** إقلاع خفيف للوحة المحامي — يكفي الهيدر وزر الإشعارات، بلا انتظار شبكة الرئيسية. */
export async function ensureNotificationsDashboardE2E(page: Page): Promise<void> {
    await applyE2eBootHomeLayoutAtRuntime(page);
    await recoverLawyerDashboardBootError(page);
    await expect(lawyerDashboardReady(page)).toBeVisible({ timeout: 60_000 });
    await stripBootFailureLayer(page);
    await dismissProductivityBlockers(page);
    await expect(notificationsHeaderTrigger(page)).toBeAttached({ timeout: 20_000 });
}

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
        {
            id: 'e2e-system-alert',
            title: 'تحديث النظام',
            message: 'إشعار نظام للتجربة',
            type: 'system_alert',
            category: 'system',
            direction: 'incoming',
            isRead: false,
            createdAt: now,
        },
    ];
}

/** يزرع إشعارات مختلطة (ذاتية + واردة) قبل تحميل الصفحة — SecureStore (localStorage + IDB) */
export async function seedNotificationFixtures(page: Page): Promise<void> {
    const items = buildE2eNotificationSeed();
    const payload = JSON.stringify(items);
    const key = notificationStorageKey(E2E_NOTIFICATION_USER_ID);
    await page.addInitScript(
        ({ storageKey, raw, dbName, dbVersion, storeName }) => {
            try {
                localStorage.setItem(storageKey, raw);
            } catch {
                /* ignore */
            }
            try {
                const req = indexedDB.open(dbName, dbVersion);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                };
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction(storeName, 'readwrite');
                    tx.objectStore(storeName).put(raw, storageKey);
                    tx.oncomplete = () => db.close();
                };
            } catch {
                /* ignore */
            }
        },
        {
            storageKey: key,
            raw: payload,
            dbName: 'hami-secure-store',
            dbVersion: 2,
            storeName: 'secure_kv',
        },
    );
}

/** يزرع الوارد عبر مسار التطبيق (zustand + SecureStore) بعد جاهزية الخطافات */
export async function hydrateNotificationFixturesForE2E(page: Page): Promise<void> {
    const items = buildE2eNotificationSeed();
    await waitForNotificationInboxSeedHook(page).catch(() => undefined);
    const seeded = await page
        .evaluate(({ seeds, userId }) => {
            if (typeof window.__hamiE2eSeedInbox === 'function') {
                return window.__hamiE2eSeedInbox(seeds, userId);
            }
            let count = 0;
            for (const item of seeds) {
                if (item.direction === 'outgoing') continue;
                window.__hamiE2ePushNotification?.({
                    id: item.id,
                    title: item.title,
                    message: item.message,
                    type: item.type,
                    isRead: item.isRead,
                    createdAt: item.createdAt,
                    direction: item.direction,
                });
                count += 1;
            }
            return count;
        }, { seeds: items, userId: E2E_NOTIFICATION_USER_ID })
        .catch(() => 0);
    if (seeded > 0) return;

    const payload = JSON.stringify(items);
    const key = notificationStorageKey(E2E_NOTIFICATION_USER_ID);
    const { writeE2eSecureStoreKey } = await import('./secureStoreE2EFixtures');
    await writeE2eSecureStoreKey(page, key, payload);
}

export async function dismissBlockingOverlays(page: Page): Promise<void> {
    if (page.isClosed()) return;

    await stripBootFailureLayer(page);
    if (page.isClosed()) return;

    const toastClose = page.getByTestId('smart-toast-item').getByRole('button', { name: 'إغلاق' });
    // timeout: 0 — الانتظار كان يضيف 1.5ث على كل نقرة بلا توست ظاهر (تذبذب الماسح/المفكرة)
    if (await toastClose.first().isVisible().catch(() => false)) {
        await toastClose.first().click({ force: true, timeout: 2_000 }).catch(() => undefined);
    }

    const repositoryOpen =
        (await page.locator('html').getAttribute('data-hami-repository-open')) === '1';
    if (repositoryOpen) return;

    const deadline = Date.now() + 8_000;
    // exact: وإلا «إغلاق قائمة النقل» (backdrop خارج المودال) يُغلق قائمة النقل أثناء E2E
    const closeButtons = page.getByRole('button', { name: 'إغلاق', exact: true });

    for (let attempt = 0; attempt < 3 && Date.now() < deadline; attempt++) {
        if (page.isClosed()) return;

        const count = await closeButtons.count().catch(() => 0);
        let clicked = false;

        for (let i = 0; i < count; i += 1) {
            if (page.isClosed() || Date.now() >= deadline) return;

            const btn = closeButtons.nth(i);
            const visible = await btn.isVisible().catch(() => false);
            if (!visible) continue;

            const inRepositoryChrome = await btn
                .evaluate((el) => {
                    if (el.closest('[data-testid="smart-repository-modal"]')) return true;
                    if (el.closest('[data-testid="repository-move-room-menu"]')) return true;
                    if (el.closest('[data-testid="repository-rooms-gallery"]')) return true;
                    if (el.closest('[data-testid="repository-add-menu-panel"]')) return true;
                    if (el.closest('[data-testid="repository-room-menu"]')) return true;
                    const testId = el.getAttribute('data-testid') ?? '';
                    if (testId === 'repository-move-room-backdrop') return true;
                    if (testId === 'smart-repository-close') return true;
                    if (testId === 'execution-creation-close') return true;
                    if (testId === 'execution-archive-close') return true;
                    if (el.closest('[data-testid="execution-archive-shell"]')) return true;
                    const label = el.getAttribute('aria-label') ?? '';
                    return label.startsWith('إغلاق قائمة') || label === 'إغلاق معرض الغرف';
                })
                .catch(() => false);
            if (inRepositoryChrome) continue;

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

export async function waitForNotificationE2eHooks(page: Page): Promise<void> {
    await page.waitForFunction(
        () => typeof window.__hamiE2eForceOpenNotifications === 'function',
        undefined,
        { timeout: 20_000 },
    );
}

export async function waitForNotificationInboxSeedHook(page: Page): Promise<void> {
    await page.waitForFunction(
        () =>
            typeof window.__hamiE2eSeedInbox === 'function' ||
            typeof window.__hamiE2ePushNotification === 'function',
        undefined,
        { timeout: 20_000 },
    );
}

export async function clickPanelControl(locator: Locator): Promise<void> {
    await locator.click({ timeout: 8_000, force: true }).catch(async () => {
        await locator.evaluate((el) => {
            if (el instanceof HTMLElement) el.click();
        });
    });
}

async function safePageEvaluate(page: Page, fn: () => void): Promise<void> {
    if (page.isClosed()) return;
    await page.evaluate(fn).catch(() => undefined);
}

async function forceOpenNotificationsInPage(page: Page): Promise<void> {
    await waitForNotificationE2eHooks(page).catch(() => undefined);
    await safePageEvaluate(page, () => window.__hamiE2eForceOpenNotifications?.());
}

async function forceCloseNotificationsInPage(page: Page): Promise<void> {
    await waitForNotificationE2eHooks(page).catch(() => undefined);
    await safePageEvaluate(page, () => window.__hamiE2eForceCloseNotifications?.());
}
async function isGlobalSearchObscuringHeader(page: Page): Promise<boolean> {
    return (
        (await page.getByTestId('global-search-overlay').isVisible({ timeout: 800 }).catch(() => false)) ||
        (await page
            .locator('[data-hami-global-search-shell] .hami-gs-layer[data-search-open="true"]')
            .isVisible({ timeout: 800 })
            .catch(() => false))
    );
}

/** يفتح لوحة الإشعارات من زر الهيدر مع fallback E2E عند VITE_E2E. */
export async function openNotificationsPanel(page: Page): Promise<Locator> {
    if (page.isClosed()) {
        throw new Error('openNotificationsPanel: page is closed');
    }

    await waitForNotificationE2eHooks(page).catch(() => undefined);
    await waitForNotificationInboxSeedHook(page).catch(() => undefined);

    const alreadyHydrated = await page
        .evaluate(() => {
            const w = window as Window & { __hamiE2eNotificationsHydrated?: boolean };
            return Boolean(w.__hamiE2eNotificationsHydrated);
        })
        .catch(() => false);
    if (!alreadyHydrated) {
        await hydrateNotificationFixturesForE2E(page);
        await page
            .evaluate(() => {
                (window as Window & { __hamiE2eNotificationsHydrated?: boolean }).__hamiE2eNotificationsHydrated =
                    true;
            })
            .catch(() => undefined);
    }

    const panel = page.getByTestId('notification-panel');
    const layer = page.locator('[data-notification-root]').first();

    const alreadyOpen = (await layer.getAttribute('data-open').catch(() => null)) === 'true';

    if (!alreadyOpen) {
        await revealHeaderToolbarTools(page).catch(() => undefined);
        const searchObscuresHeader = await isGlobalSearchObscuringHeader(page);
        const trigger = notificationsHeaderTrigger(page);
        const triggerReachable =
            !searchObscuresHeader && (await trigger.isVisible({ timeout: 2_000 }).catch(() => false));

        if (triggerReachable) {
            await lawyerDashboardReady(page).click({ timeout: 5_000 }).catch(() => undefined);
            await clickPanelControl(trigger);
        } else {
            await forceOpenNotificationsInPage(page);
        }

        const opened = (await layer.getAttribute('data-open').catch(() => null)) === 'true';
        if (!opened) {
            await forceOpenNotificationsInPage(page);
        }
    }

    await expect(layer).toHaveAttribute('data-open', 'true', { timeout: 15_000 });
    await expect(page.getByRole('alertdialog', { name: 'خطأ في الإشعارات' })).toBeHidden({
        timeout: 2_000,
    }).catch(() => undefined);

    const incomingCount = await page.getByTestId('notification-card-e2e-incoming-reply').count();
    if (incomingCount === 0) {
        await hydrateNotificationFixturesForE2E(page).catch(() => undefined);
        await expect(page.getByTestId('notification-card-e2e-incoming-reply'))
            .toBeAttached({ timeout: 4_000 })
            .catch(() => undefined);
    }

    return panel;
}

export async function closeNotificationsPanelForE2E(page: Page, timeout = 8_000): Promise<void> {
    if (page.isClosed()) return;

    const panel = page.getByTestId('notification-panel');
    if (await panel.isVisible({ timeout: 800 }).catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => undefined);
    }

    await forceCloseNotificationsInPage(page);
    await expectNotificationsPanelClosed(page, timeout);
}

export async function expectNotificationsPanelClosed(page: Page, timeout = 8_000): Promise<void> {
    const panel = page.getByTestId('notification-panel');
    await expect(panel).toBeHidden({ timeout }).catch(async () => {
        await forceCloseNotificationsInPage(page);
        await expect(panel).toBeHidden({ timeout: 4_000 });
    });
}

export async function waitForE2eNotificationsBaseline(page: Page): Promise<void> {
    await waitForNotificationE2eHooks(page);
    await page.waitForFunction(() => typeof window.__hamiE2eNotificationsLoading === 'function', undefined, {
        timeout: 20_000,
    });
    await page.waitForFunction(() => window.__hamiE2eNotificationsLoading?.() === false, undefined, {
        timeout: 20_000,
    });
}

/** يزرع الوارد ويضمن اللوحة مغلقة — المنبثقات لا تحتاج فتح الورقة (الـ Shell حيّ مع userId). */
export async function primeNotificationPopupHost(page: Page): Promise<void> {
    await waitForNotificationE2eHooks(page);
    await waitForNotificationInboxSeedHook(page);
    await hydrateNotificationFixturesForE2E(page);
    await waitForE2eNotificationsBaseline(page);
    await closeNotificationsPanelForE2E(page, 8_000);
    await page
        .waitForFunction(
            () => !document.documentElement.hasAttribute('data-hami-notifications-open'),
            undefined,
            { timeout: 8_000 },
        )
        .catch(() => undefined);
}
export async function waitForNotificationInteractiveMarks(page: Page, timeout = 15_000): Promise<void> {
    await page.waitForFunction(
        () => {
            const open = performance.getEntriesByName('hami:notifications:open-request', 'mark')[0];
            const interactive = performance.getEntriesByName('hami:notifications:interactive', 'mark')[0];
            return Boolean(open && interactive);
        },
        undefined,
        { timeout },
    );
}

export async function waitForNotificationDismissUnlocked(page: Page): Promise<void> {
    await page.waitForFunction(
        () => !document.documentElement.hasAttribute('data-hami-notif-dismiss-locked'),
        undefined,
        { timeout: 5_000 },
    );
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
            direction: 'incoming',
            isRead: false,
            createdAt: new Date().toISOString(),
        });
    }, partial);
}
