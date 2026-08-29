/**
 * جسر الإشعارات الموحّد — ويب + Capacitor أصلي
 * التنفيذ مفصول تحت bridge/ — هذه واجهة إعادة تصدير عامة.
 */
export { HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT } from '@/app/services/notifications/notificationOsTapEvents';

export {
    initializeHamiNotificationBridge,
    requestHamiNotificationPermission,
} from '@/app/services/notifications/bridge/hamiBridgeNativePlugin';

export {
    toCapacitorNotificationPayload,
    syncNativeScheduledNotifications,
} from '@/app/services/notifications/bridge/hamiBridgeSchedule';

export {
    showHamiNotification,
    previewHamiOsNotification,
} from '@/app/services/notifications/bridge/hamiBridgePresent';
