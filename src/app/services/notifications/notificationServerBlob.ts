/**
 * واجهة عامة لصندوق إشعارات الخادم — التنفيذ مفصول تحت inbox/.
 */
export type { AppendIncomingNotificationInput } from '@/app/services/notifications/inbox/notificationServerInboxAppend';
export type { ShellNotificationStorageMeta } from '@/app/services/notifications/inbox/notificationServerInboxQuery';

export { appendIncomingNotificationServer } from '@/app/services/notifications/inbox/notificationServerInboxAppend';

export {
    upsertNotificationModelsServer,
    saveNotificationBlobServer,
    markNotificationReadServer,
    markAllNotificationsReadServer,
    mergeNotificationBlobServer,
} from '@/app/services/notifications/inbox/notificationServerInboxOps';

export {
    readNotificationBlobServer,
    listNotificationsServer,
    getShellNotificationStorageMeta,
    wipeShellNotificationsServer,
    cleanupLegacyForumPrefixServer,
} from '@/app/services/notifications/inbox/notificationServerInboxQuery';
