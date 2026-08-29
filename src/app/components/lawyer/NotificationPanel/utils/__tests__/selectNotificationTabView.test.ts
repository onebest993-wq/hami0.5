import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { selectNotificationTabView } from '@/app/components/lawyer/NotificationPanel/utils/selectNotificationTabView';

function makeNotif(overrides: Partial<NotificationModel> = {}): NotificationModel {
    return {
        id: 'n-1',
        title: 'إشعار',
        message: 'نص',
        type: 'forum_reply',
        isRead: false,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('selectNotificationTabView', () => {
    const list: NotificationModel[] = [
        makeNotif({ id: 'f1', type: 'forum_reply', isRead: false }),
        makeNotif({ id: 'f2', type: 'forum_mention', isRead: true }),
        makeNotif({ id: 's1', type: 'system_alert', isRead: false }),
        makeNotif({ id: 's2', type: 'ai_insight', isRead: false }),
    ];

    it('يبني عدّادات غير المقروء ومرئيات تبويب المنتدى', () => {
        const view = selectNotificationTabView(list, 'forum');
        expect(view.tabCounts).toEqual({ forum: 1, system: 2 });
        expect(view.visibleNotifications.map((n) => n.id)).toEqual(['f1', 'f2']);
    });

    it('يعرض النظام والوثائق والذكاء في تبويب النظام', () => {
        const view = selectNotificationTabView(list, 'system');
        expect(view.visibleNotifications.map((n) => n.id)).toEqual(['s1', 's2']);
    });
});
