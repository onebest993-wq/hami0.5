import {
    prefetchNotificationPanel,
    loadNotificationPanelModule,
} from '@/app/runtime/notificationPanelLoader';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';
import { useNotificationStore } from '@/app/stores/notificationStore';

/** عند hover/لمس أيقونة الإشعارات: تحميل مسبق للوحة. */
export function warmNotificationsOnHover(): void {
    if (typeof window === 'undefined') return;
    if (!shouldAllowIntentWarmFromDom()) return;
    prefetchNotificationPanel();
}

/** عند فتح اللوحة: chunk + cache محلي فوري + مزامنة الخلفية. */
export function warmNotificationsOnOpen(userId: string | null | undefined): void {
    if (typeof window === 'undefined') return;
    /* Lite / prefetch-off يتخطّى hover — عند الفتح نفرض تحميل اللوحة */
    if (!shouldAllowIntentWarmFromDom() || isLitePerformanceActive()) {
        void loadNotificationPanelModule().catch(() => undefined);
    } else {
        warmNotificationsOnHover();
    }
    const uid = userId?.trim();
    if (!uid) return;
    useNotificationStore.getState().hydrateFromLocalPeek(uid);
    void loadNotificationPanelModule().catch(() => undefined);
    if (typeof document !== 'undefined' && document.hidden) return;
    void import('@/app/services/notifications/notificationBackgroundSync')
        .then((m) => m.refreshNotificationShellBadge(uid))
        .catch(() => undefined);
}
