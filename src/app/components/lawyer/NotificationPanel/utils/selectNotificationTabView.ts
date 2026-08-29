import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import {
    isForumNotification,
    isSystemNotification,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';

export function selectNotificationTabView(
    notifications: NotificationModel[],
    activeTab: NotificationTab,
): {
    visibleNotifications: NotificationModel[];
    tabCounts: { forum: number; system: number };
} {
    let forum = 0;
    let system = 0;
    const visible: NotificationModel[] = [];
    for (const n of notifications) {
        const forumItem = isForumNotification(n);
        if (!n.isRead) {
            if (forumItem) forum += 1;
            else if (isSystemNotification(n)) system += 1;
        }
        if (activeTab === 'forum' ? forumItem : isSystemNotification(n)) {
            visible.push(n);
        }
    }
    return { visibleNotifications: visible, tabCounts: { forum, system } };
}
