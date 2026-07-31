import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    prefetchHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import {
    loadNotificationPanelModule,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';

function loadGlobalSearchIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
}

function loadNotificationIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/notificationIntentWarm');
}

function loadProfileIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/profileIntentWarm');
}

function loadSettingsIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/settingsIntentWarm');
}

function loadSettingsBootHydrator() {
    return import('@/app/runtime/settingsBootHydrator');
}

function loadProfileBootHydrator() {
    return import('@/app/runtime/profileBootHydrator');
}

function loadProfileHubLoader() {
    return import('@/app/runtime/profileHubLoader');
}

function loadRoyalLawyerProfileLoader() {
    return import('@/app/runtime/royalLawyerProfileLoader');
}

export type HeaderShellWarmPhase = 'hover' | 'open';

let headerShellHydrateStarted = false;

export function resetHeaderShellIntentWarmForTests(): void {
    headerShellHydrateStarted = false;
}

export async function shouldAggressiveHeaderShellWarm(): Promise<boolean> {
    try {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
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

    if (phase !== 'open') {
        void loadSettingsIntentWarm().then((m) => m.warmSettingsOnHover());
        void loadNotificationIntentWarm().then((m) => m.warmNotificationsOnHover());
        void loadGlobalSearchIntentWarm().then((m) => m.warmGlobalSearchOnHover());
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
        return;
    }

    void shouldAggressiveHeaderShellWarm().then((aggressive) => {
        if (aggressive) {
            void loadSettingsIntentWarm().then((m) => m.warmSettingsOnOpen());
            void loadNotificationIntentWarm().then((m) => m.warmNotificationsOnOpen(userId));
            void loadGlobalSearchIntentWarm().then((m) => m.warmGlobalSearchOnOpen());
            void loadProfileIntentWarm().then((m) => m.warmProfileOnOpen(userId));
            return;
        }
        void loadSettingsIntentWarm().then((m) => m.warmSettingsOnHover());
        void loadNotificationIntentWarm().then((m) => m.warmNotificationsOnHover());
        void loadGlobalSearchIntentWarm().then((m) => m.warmGlobalSearchOnHover());
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
    });
}

/**
 * prefetch خفيف أثناء تحميل chunk اللوحة — بلا تحميل كامل للوحدات (لا منافسة TTFI).
 * يُستدعى من lawyerDashboardChunk قبل اكتمال auth.
 */
export function preloadLawyerDashboardHeaderShellChunks(): void {
    if (typeof window === 'undefined') return;

    prefetchHamiSettingsModule();
    prefetchSettingsOverlayEntry();
    prefetchNotificationPanel();
    void import('@/app/runtime/globalSearchLoader')
        .then((m) => m.prefetchGlobalSearchOverlayChunk())
        .catch(() => undefined);
    void loadProfileHubLoader().then((m) => m.prefetchProfileHubModule());
}

function scheduleHeaderShellHeavyWarm(userId: string): void {
    // الملف المهني أولاً — فتح فوري بعد الإقلاع/إعادة التشغيل
    scheduleIdleWork(
        () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            void loadProfileBootHydrator()
                .then((m) => m.hydrateProfileShellForInstantOpenWithData(userId, false))
                .catch(() => undefined);
            void loadRoyalLawyerProfileLoader()
                .then((m) => m.loadRoyalLawyerProfileWithData(userId))
                .catch(() => undefined);
        },
        {
            minDelayMs: 0,
            timeoutMs: 8_000,
        },
    );

    scheduleIdleWork(
        () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            void loadSettingsBootHydrator()
                .then((m) => m.hydrateSettingsShellForInstantOpen())
                .catch(() => undefined);
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
            void import('@/app/runtime/globalSearchLoader')
                .then((m) => m.loadGlobalSearchOverlayWithEngine())
                .catch(() => undefined);
        },
        {
            minDelayMs: import.meta.env.DEV ? 900 : 2_000,
            timeoutMs: 8_000,
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

    void shouldAggressiveHeaderShellWarm().then((aggressive) => {
        if (!aggressive) return;
        scheduleHeaderShellHeavyWarm(userId);
    });
}
