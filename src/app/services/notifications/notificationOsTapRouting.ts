/**
 * واجهة عامة لتوجيه نقر إشعار نظام التشغيل — التنفيذ مفصول تحت osTap/.
 */
export {
    HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT,
    HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT,
    HAMI_OS_NOTIFICATION_OPEN_MESSAGE,
    HAMI_OS_NOTIFY_QUERY,
    HAMI_OS_NOTIFY_PENDING_KEY,
} from '@/app/services/notifications/notificationOsTapEvents';

export type {
    OsNotificationTapIntent,
    OsNotificationTapResolution,
} from '@/app/services/notifications/osTap/notificationOsTapExtract';

export {
    extractOsNotificationTapData,
    extractOsNotificationFocusId,
    decodeOsNotifyQueryPayload,
} from '@/app/services/notifications/osTap/notificationOsTapExtract';

export {
    resolveOsNotificationTapIntent,
    resolveOsNotificationTap,
    dispatchOsNotificationOpenPanel,
} from '@/app/services/notifications/osTap/notificationOsTapIntent';

export {
    stashPendingOsNotifyIntent,
    consumePendingOsNotifyResolution,
    consumePendingOsNotifyIntent,
} from '@/app/services/notifications/osTap/notificationOsTapPending';
