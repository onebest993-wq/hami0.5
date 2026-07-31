/** تحميل ديناميكي — لا تبعيات ثقيلة على مسار أول paint. */

export function loadNotificationBootHydrator() {
    return import('@/app/runtime/notificationBootHydrator');
}

export function loadNotificationPerfMetrics() {
    return import('@/app/services/notifications/notificationPerfMetrics');
}

export function loadNotificationStore() {
    return import('@/app/stores/notificationStore');
}

export function loadNotificationIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/notificationIntentWarm');
}
