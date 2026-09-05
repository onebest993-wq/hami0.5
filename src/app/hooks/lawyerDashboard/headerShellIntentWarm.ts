import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    prefetchHamiSettingsModule,
} from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import {
    loadNotificationPanelModule,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';
import { runWarmSteps } from '@/app/runtime/yieldToMain';

function loadGlobalSearchIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
}

function loadNotificationIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/notificationIntentWarm');
}

function loadProfileIntentWarm() {
    return import('@/app/runtime/profileShellPrime');
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
    return import('@/app/runtime/royalLawyerProfileLoader');
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
    const { isSectionBackgroundPrefetchAllowed } = await import('@/app/runtime/sectionPrefetchPolicy');
    return isSectionBackgroundPrefetchAllowed();
}

/** تسخين موحّد لأزرار الهيدر — آمن للتكرار (prefetch/idempotent). */
export function warmLawyerDashboardHeaderShell(
    userId: string | null | undefined,
    phase: HeaderShellWarmPhase = 'open',
): void {
    if (!hasLocalAppSession(userId)) return;

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
 * prefetch خفيف بعد content-ready — تحليل متسلسل، الأرخص أولاً ثم الإعدادات (~٨٣٦ ك.ب).
 * lite / prefetch-off: لا — النية عند اللمسة وrecency يغطيان آخر قسم.
 */
export function preloadLawyerDashboardHeaderShellChunks(): void {
    if (typeof window === 'undefined') return;

    void shouldAggressiveHeaderShellWarm().then((ok) => {
        if (!ok) return;
        void runWarmSteps([
            () => {
                prefetchNotificationPanel();
            },
            () => loadProfileHubLoader().then((m) => m.prefetchProfileHubModule()),
            () =>
                import('@/app/runtime/globalSearchLoader').then((m) =>
                    m.prefetchGlobalSearchOverlayChunk(),
                ),
            () => {
                prefetchHamiSettingsModule();
                prefetchSettingsOverlayEntry();
            },
        ]);
    });
}

function scheduleHeaderShellHeavyWarm(userId: string): void {
    void shouldAggressiveHeaderShellWarm().then((ok) => {
        if (!ok) return;
        scheduleIdleWork(
            () => {
                void runWarmSteps(
                    [
                        () =>
                            loadProfileBootHydrator().then((m) =>
                                m.hydrateProfileShellForInstantOpenWithData(userId, false),
                            ),
                        () =>
                            loadRoyalLawyerProfileLoader().then((m) =>
                                m.loadRoyalLawyerProfileWithData(userId),
                            ),
                        () =>
                            loadSettingsBootHydrator().then((m) =>
                                m.hydrateSettingsShellForInstantOpen(),
                            ),
                        () => loadNotificationPanelModule(),
                        () =>
                            import('@/app/runtime/notificationBootHydrator').then((m) =>
                                m.hydrateNotificationShellForInstantOpen(true),
                            ),
                        () =>
                            import('@/app/runtime/globalSearchLoader').then((m) =>
                                m.loadGlobalSearchOverlayWithEngine(),
                            ),
                    ],
                    () => typeof document !== 'undefined' && document.hidden,
                );
            },
            {
                minDelayMs: 0,
                timeoutMs: 8_000,
            },
        );
    });
}

/**
 * بعد جاهزية اللوحة: hover متسلسل ثم idle للوحدات الثقيلة.
 * لا warm*OnOpen دفعة واحدة — يُحجّب التفاعل الأول ويضاعف parse على الأصل.
 */
export function hydrateLawyerDashboardHeaderShellChunks(
    userId: string | null | undefined,
): Promise<void> {
    const uid = userId?.trim();
    if (!uid || !hasLocalAppSession(uid)) return Promise.resolve();
    if (headerShellHydrateStarted) return Promise.resolve();
    headerShellHydrateStarted = true;

    return shouldAggressiveHeaderShellWarm().then((aggressive) => {
        if (!aggressive) return;
        return runWarmSteps([
            () => loadNotificationIntentWarm().then((m) => m.warmNotificationsOnHover()),
            () => loadProfileIntentWarm().then((m) => m.warmProfileOnHover(uid)),
            () => loadGlobalSearchIntentWarm().then((m) => m.warmGlobalSearchOnHover()),
            () => loadSettingsIntentWarm().then((m) => m.warmSettingsOnHover()),
        ]).then(() => {
            scheduleHeaderShellHeavyWarm(uid);
        });
    });
}
