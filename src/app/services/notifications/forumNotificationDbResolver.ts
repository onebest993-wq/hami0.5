import type { ForumNotification } from '@/app/services/forum/forumTypes';
import { NotificationDB } from '@/app/services/notifications/notificationForumStorage';

type ForumNotificationDb = {
    getNotifications(userId: string): Promise<ForumNotification[]>;
    addNotification(notif: ForumNotification): Promise<void>;
    updateNotification(
        userId: string,
        notificationId: string,
        patch: Partial<
            Pick<ForumNotification, 'title' | 'message' | 'read' | 'createdAt' | 'activityCount' | 'dedupeKey'>
        >,
    ): Promise<void>;
};

let clientDbPromise: Promise<ForumNotificationDb> | null = null;
let serverDbPromise: Promise<ForumNotificationDb> | null = null;

/** يختار NotificationDB (عميل) أو ServerNotificationDB (خادم) حسب runtime. */
export async function resolveForumNotificationDb(): Promise<ForumNotificationDb> {
    if (typeof window === 'undefined') {
        if (!serverDbPromise) {
            serverDbPromise = import('@/app/services/notifications/notificationForumStorage.server').then(
                (m) => m.ServerNotificationDB,
            );
        }
        return serverDbPromise;
    }
    if (!clientDbPromise) {
        clientDbPromise = Promise.resolve(NotificationDB);
    }
    return clientDbPromise;
}

export function resetForumNotificationDbResolverForTests(): void {
    clientDbPromise = null;
    serverDbPromise = null;
}
