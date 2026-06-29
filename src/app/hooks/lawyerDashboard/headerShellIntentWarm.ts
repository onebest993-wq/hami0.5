import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    loadHamiSettingsModule,
    prefetchHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import {
    loadNotificationPanelModule,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';
import {
    loadGlobalSearchOverlayWithEngine,
    prefetchGlobalSearchOverlayChunk,
} from '@/app/runtime/globalSearchLoader';
import { loadRoyalLawyerProfileWithData } from '@/app/runtime/royalLawyerProfileLoader';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { warmNotificationsOnHover, warmNotificationsOnOpen } from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

export function shouldAggressiveHeaderShellWarm(): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (isLitePerformanceActive(s.performance.litePerformance)) return false;
    } catch {
        /* ignore */
    }
    return true;
}

/** تسخين موحّد لأزرار الهيدر — آمن للتكرار (prefetch/idempotent). */
export function warmLawyerDashboardHeaderShell(userId: string | null | undefined): void {
    if (!isRealSignedIn(userId)) return;

    if (shouldAggressiveHeaderShellWarm()) {
        warmSettingsOnOpen();
        warmNotificationsOnOpen(userId);
        warmGlobalSearchOnOpen();
        warmProfileOnOpen(userId);
        return;
    }

    warmSettingsOnHover();
    warmNotificationsOnHover();
    warmGlobalSearchOnHover();
    warmProfileOnHover(userId);
}

/**
 * تحميل chunks إعدادات/إشعارات بالتوازي مع chunk اللوحة — بلا userId.
 * يُستدعى من LawyerBootShell و preloadLawyerDashboardChunk قبل اكتمال auth.
 */
export function preloadLawyerDashboardHeaderShellChunks(): void {
    if (typeof window === 'undefined') return;

    prefetchHamiSettingsModule();
    prefetchNotificationPanel();
    prefetchGlobalSearchOverlayChunk();

    if (!shouldAggressiveHeaderShellWarm()) return;

    void Promise.all([
        loadHamiSettingsModule().catch(() => undefined),
        loadNotificationPanelModule().catch(() => undefined),
    ]);
}

/** تسخين + تحميل كامل لـ chunks الهيدر بالتوازي — يُستدعى عند جاهزية اللوحة. */
export function hydrateLawyerDashboardHeaderShellChunks(userId: string | null | undefined): void {
    if (!isRealSignedIn(userId)) return;

    warmLawyerDashboardHeaderShell(userId);

    if (!shouldAggressiveHeaderShellWarm()) return;

    void Promise.all([
        loadHamiSettingsModule().catch(() => undefined),
        loadNotificationPanelModule().catch(() => undefined),
    ]);

    queueMicrotask(() => {
        void loadGlobalSearchOverlayWithEngine().catch(() => undefined);
        void loadRoyalLawyerProfileWithData(userId).catch(() => undefined);
    });
}
