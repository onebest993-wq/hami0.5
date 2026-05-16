/**
 * Prefetch lazy route / feature chunks during idle time so navigation
 * reuses cached modules and Suspense fallbacks flash less often.
 * Uses the same import specifiers as React.lazy / lazyComponents for deduplication.
 */

function runWhenIdle(fn: () => void, timeout = 2000): void {
    if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => fn(), { timeout });
    } else {
        setTimeout(fn, 100);
    }
}

function canPrefetch(): boolean {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
    if (typeof navigator === 'undefined') return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!conn) return true;
    if (conn.saveData) return false;
    const effective = String(conn.effectiveType ?? '');
    if (effective === 'slow-2g' || effective === '2g') return false;
    return true;
}

function canPrefetchHeavy(): boolean {
    if (!canPrefetch()) return false;
    if (typeof navigator === 'undefined') return true;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory < 8) return false;
    if (typeof cores === 'number' && cores > 0 && cores < 8) return false;
    return true;
}

/** After splash: warm likely next steps (auth + lawyer). */
export function prefetchAfterSplash(): void {
    if (!canPrefetch()) return;
    runWhenIdle(() => {
        void import("@/app/components/AuthScreens");
        void import("@/app/components/lawyer/LawyerDashboard");
    });
}

/** On auth screen: prioritize lawyer dashboard only. */
export function prefetchForAuthScreen(): void {
    if (!canPrefetch()) return;
    runWhenIdle(() => {
        void import("@/app/components/lawyer/LawyerDashboard");
    });
}

/** Profile / settings / admin — used from lawyer shell. */
export function prefetchSecondaryAppScreens(): void {
    if (!canPrefetch()) return;
    runWhenIdle(() => {
        void import("@/app/components/ProfileScreen");
        void import("@/app/components/SettingsScreens");
        void import("@/app/components/AdminDashboard");
    });
}

/**
 * Lawyer dashboard: defer heavy tab + modal chunks until the browser is idle.
 * Split into two waves to avoid saturating the network on entry.
 */
export function prefetchLawyerDashboardLazyChunks(): void {
    if (!canPrefetch()) return;
    runWhenIdle(() => {
        void import("@/app/components/lawyer/dashboard/UnifiedCommandHub");
        void import("@/app/components/lawyer/LegalCommandCenterDock");
        void import("@/app/components/lawyer/NeuralAlertsCard");
        void import("@/app/components/lawyer/NotificationPanel");
        void import("@/app/components/lawyer/RoyalLawyerProfile");
        void import("@/app/components/lawyer/messaging/MessagesList");
        void import("@/app/components/lawyer/messaging/ChatRoom");
        void import("@/app/components/lawyer/CommunityScreen");
        void import("@/app/components/lawyer/SmartLegalRadar");
    });

    if (!canPrefetchHeavy()) return;
    runWhenIdle(() => {
        void import("@/app/components/lawyer/HamiSettings");
        void import("@/app/components/lawyer/NotepadModal");
        void import("@/app/components/lawyer/dashboard/GlobalSearchResults");
        void import("@/app/components/lawyer/GlobalSearchOverlay");
        void import("@/app/components/lawyer/ClientRequestsHub");
        void import("@/app/components/lawyer/ArchivePortal");
        void import("@/app/components/lawyer/LeadManagement");
        void import("@/app/components/lawyer/CommunicationHub");
        void import("@/app/components/lawyer/TransactionsSystemComplete");
        void import("@/app/components/lawyer/dashboard/LawsuitSubMenu");
        void import("@/app/components/lawyer/dashboard/SmartCriminalLibrary");
        void import("@/app/components/lawyer/SmartVaultModal");
        void import("@/app/components/lawyer/ActionModals");
        void import("@/app/components/lawyer/SmartContractGenerator");
        void import("@/app/components/lawyer/SmartLegalConsultant");
        void import("@/app/components/testing/BackendTestingPanel");
    }, 4500);
}

/**
 * أثقل الوحدات (تنفيذ + دعاوى + ملف ذكي) — تُحمَّل بعد استقرار الشاشة لتفادي تشبع الشبكة مع الموجة الثانية.
 */
export function prefetchLawyerHeavyDeferredChunks(): void {
    if (!canPrefetchHeavy()) return;
    if (import.meta.env.DEV) return;
    runWhenIdle(() => {
        void import("@/app/components/lawyer/SmartFileModal");
        void import("@/app/components/lawyer/ExecutionCreationView");
    }, 12_000);
}
