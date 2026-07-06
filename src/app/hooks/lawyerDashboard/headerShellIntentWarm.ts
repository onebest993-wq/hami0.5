import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    prefetchHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import {
    loadNotificationPanelModule,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';
import { loadRoyalLawyerProfileWithData } from '@/app/runtime/royalLawyerProfileLoader';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { warmNotificationsOnHover, warmNotificationsOnOpen } from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { hydrateSettingsShellForInstantOpen } from '@/app/runtime/settingsBootHydrator';

export type HeaderShellWarmPhase = 'hover' | 'open';

let headerShellHydrateStarted = false;

export function resetHeaderShellIntentWarmForTests(): void {
    headerShellHydrateStarted = false;
}

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
export function warmLawyerDashboardHeaderShell(
    userId: string | null | undefined,
    phase: HeaderShellWarmPhase = 'open',
): void {
    if (!isRealSignedIn(userId)) return;

    const useOpenWarm = phase === 'open' && shouldAggressiveHeaderShellWarm();

    if (useOpenWarm) {
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
 * prefetch خفيف أثناء تحميل chunk اللوحة — بلا تحميل كامل للوحدات (لا منافسة TTFI).
 * يُستدعى من lawyerDashboardChunk قبل اكتمال auth.
 */
export function preloadLawyerDashboardHeaderShellChunks(): void {
    if (typeof window === 'undefined') return;

    prefetchHamiSettingsModule();
    prefetchNotificationPanel();
}

function scheduleHeaderShellHeavyWarm(userId: string): void {
    scheduleIdleWork(
        () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            void hydrateSettingsShellForInstantOpen();
        },
        {
            minDelayMs: 0,
            timeoutMs: 8_000,
        },
    );

    scheduleIdleWork(
        () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            void loadNotificationPanelModule().catch(() => undefined);
        },
        {
            minDelayMs: import.meta.env.DEV ? 600 : 1_500,
            timeoutMs: 8_000,
        },
    );

    scheduleIdleWork(
        () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            void loadRoyalLawyerProfileWithData(userId).catch(() => undefined);
        },
        {
            minDelayMs: import.meta.env.DEV ? 2_000 : 5_000,
            timeoutMs: 15_000,
        },
    );
}

/**
 * بعد جاهزية اللوحة: prefetch خفيف فوراً، ثم تحميل تدريجي idle للـ chunks الثقيلة.
 * لا warm*OnOpen دفعة واحدة — يُحجّب التفاعل الأول.
 */
export function hydrateLawyerDashboardHeaderShellChunks(userId: string | null | undefined): void {
    if (!isRealSignedIn(userId)) return;
    if (headerShellHydrateStarted) return;
    headerShellHydrateStarted = true;

    warmLawyerDashboardHeaderShell(userId, 'hover');

    if (!shouldAggressiveHeaderShellWarm()) return;

    scheduleHeaderShellHeavyWarm(userId);
}
