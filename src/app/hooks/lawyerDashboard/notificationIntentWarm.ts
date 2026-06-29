import {
    prefetchNotificationPanel,
    loadNotificationPanelModule,
} from '@/app/runtime/notificationPanelLoader';
import { refreshNotificationShellBadge } from '@/app/services/notifications/notificationBackgroundSync';
import { useNotificationStore } from '@/app/stores/notificationStore';

/** عند hover/لمس أيقونة الإشعارات: تحميل مسبق للوحة. */
export function warmNotificationsOnHover(): void {
    prefetchNotificationPanel();
}

/** عند فتح اللوحة: chunk + cache محلي فوري + مزامنة الخلفية. */
export function warmNotificationsOnOpen(userId: string | null | undefined): void {
    warmNotificationsOnHover();
    const uid = userId?.trim();
    if (!uid) return;
    useNotificationStore.getState().hydrateFromLocalPeek(uid);
    void loadNotificationPanelModule().catch(() => undefined);
    if (typeof document !== 'undefined' && document.hidden) return;
    void refreshNotificationShellBadge(uid);
}
