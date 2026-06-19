import type { Page } from '@playwright/test';

export const E2E_NOTIFICATION_USER_ID = 'dev-user-uuid-1';

export function notificationStorageKey(userId: string): string {
    return `hami:notifications:v1:${userId}`;
}

export function buildE2eNotificationSeed() {
    const now = new Date().toISOString();
    return [
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
    const closeReminder = page.getByRole('button', { name: 'إغلاق' });
    if (await closeReminder.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeReminder.click();
    }
}
