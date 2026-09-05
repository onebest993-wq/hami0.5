import { loadNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import { prefetchNotificationShellModule } from '@/app/runtime/notificationShellLoader';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';
import { useNotificationStore } from '@/app/stores/notificationStore';

function prefetchNotificationOpenChain(): void {
    /* الشِل يضم اللوحة ساكناً — لا prefetch مزدوج للشِل+اللوحة */
    prefetchNotificationShellModule();
}

/** عند hover/لمس أيقونة الإشعارات: تحميل مسبق لمقطع الشِل (يضم اللوحة). */
export function warmNotificationsOnHover(): void {
    if (typeof window === 'undefined') return;
    if (!shouldAllowIntentWarmFromDom()) return;
    prefetchNotificationOpenChain();
}

/** عند فتح اللوحة: chunk + cache محلي فوري + مزامنة الخلفية. */
export function warmNotificationsOnOpen(userId: string | null | undefined): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/sectionChunkRecency')
        .then((m) => m.rememberOpenedSectionChunk('notifications'))
        .catch(() => undefined);
    /* Lite / prefetch-off يتخطّى hover — عند الفتح نفرض تحميل اللوحة */
    if (!shouldAllowIntentWarmFromDom() || isLitePerformanceActive()) {
        prefetchNotificationOpenChain();
        void loadNotificationPanelModule().catch(() => undefined);
    } else {
        warmNotificationsOnHover();
    }
    const uid = userId?.trim();
    if (!uid) return;
    /*
     * تسخين decryptedCache للمفتاح المشفَّر قبل/مع peek sync — بدون هذا
     * getItemSync قد يعيد null على إقلاع بارد حتى توجد بيانات على القرص.
     */
    void import('@/app/services/SecureStoreService')
        .then(({ default: SecureStoreService }) =>
            SecureStoreService.getItem(`hami:notifications:v1:${uid}`),
        )
        .then(() => {
            useNotificationStore.getState().hydrateFromLocalPeek(uid);
        })
        .catch(() => {
            useNotificationStore.getState().hydrateFromLocalPeek(uid);
        });
    useNotificationStore.getState().hydrateFromLocalPeek(uid);
    void loadNotificationPanelModule().catch(() => undefined);
    if (typeof document !== 'undefined' && document.hidden) return;
    void import('@/app/services/notifications/notificationBackgroundSync')
        .then((m) => m.refreshNotificationShellBadge(uid))
        .catch(() => undefined);
}
