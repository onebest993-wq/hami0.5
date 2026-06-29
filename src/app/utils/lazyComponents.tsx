/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 LAZY COMPONENTS - التحميل الكسول
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lazy loading configuration for heavy components
 * Improves initial load time and reduces bundle size
 *
 * @version 1.0.0
 * @author Hami Legal System
 */

import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { ExecutionDashboardPrefetchMode } from '@/app/runtime/executionDashboardLoader';
import { LazyLawyerNewCase } from '@/app/utils/lazy/lawyerNewCaseModal';

export { LazyLawyerNewCase };

// ═══════════════════════════════════════════════════════════════════════════
// HEAVY MODALS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyClientRequestsHub = lazyWithRetry(() =>
    import('@/app/components/lawyer/ClientRequestsHub').then((m) => ({
        default: m.ClientRequestsHub as unknown as LazyComponent,
    }))
);

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENTS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyExecutionDashboard = lazyWithRetry(() =>
    import('@/app/runtime/executionDashboardLoader').then((m) =>
        m.loadExecutionDashboardModule().then((mod) => ({
            default: mod.ExecutionDashboard as unknown as LazyComponent,
        })),
    ),
);

export const LazyArchivePortal = lazyWithRetry(() =>
    import('@/app/components/lawyer/ArchivePortal.tsx').then((m) => ({
        default: m.ArchivePortal as unknown as LazyComponent,
    }))
);

let archivePortalPrefetch: Promise<unknown> | null = null;

export function resetArchivePortalPrefetch(): void {
    archivePortalPrefetch = null;
}

/** تحميل مسبق أرشيف الإضابير (قائمة التنفيذ/الدعاوى) */
export function prefetchArchivePortal(): void {
    if (typeof window === 'undefined') return;
    if (!archivePortalPrefetch) {
        archivePortalPrefetch = import('@/app/components/lawyer/ArchivePortal.tsx').catch((err) => {
            archivePortalPrefetch = null;
            throw err;
        });
    }
    void archivePortalPrefetch.catch(() => undefined);
}

export const LazyLawsuitsWorkspace = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawsuitsWorkspace').then((m) => ({ default: m.LawsuitsWorkspace as unknown as LazyComponent }))
);

let lawsuitsWorkspacePrefetch: Promise<unknown> | null = null;

export function resetLawsuitsWorkspacePrefetch(): void {
    lawsuitsWorkspacePrefetch = null;
}

/** أرشيف الدعاوى + الإضبارة + workspace — يُستدعى قبل/عند فتح قسم الدعاوى */
export function warmLawsuitWorkspace(): void {
    if (typeof window === 'undefined') return;
    prefetchArchivePortal();
    void import('@/app/components/lawyer/SmartFileModal');
    void import('@/app/components/lawyer/smart-modal/lazySmartFileModalWidgets').then((m) =>
        m.prefetchSmartFileModalShellWidgets(),
    );
    void import('@/app/runtime/smartFileModalLoader').then((m) => {
        void m.loadSmartFileModalModule().catch(() => undefined);
        m.prefetchSmartFileModalPhased();
    });
    if (!lawsuitsWorkspacePrefetch) {
        lawsuitsWorkspacePrefetch = import('@/app/components/lawyer/LawsuitsWorkspace').catch((err) => {
            lawsuitsWorkspacePrefetch = null;
            throw err;
        });
    }
    void lawsuitsWorkspacePrefetch.catch(() => undefined);
}

/** تحميل مسبق مسار الدعاوى — workspace + أرشيف + إضبارة الدعوى */
export function prefetchLawsuitsWorkspace(): void {
    warmLawsuitWorkspace();
}

let urgentOrdersViewPrefetch: Promise<unknown> | null = null;

/** تحميل مسبق خفيف لقائمة الطلبات المستعجلة (بدون ملف الإضبارة الثقيل) */
export function prefetchUrgentOrdersView(): void {
    if (typeof window === 'undefined') return;
    if (!urgentOrdersViewPrefetch) {
        urgentOrdersViewPrefetch = import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard.tsx');
    }
}

/** إعادة محاولة تحميل لوحة الطلبات المستعجلة بعد فشل lazy import */
export function resetUrgentOrdersViewPrefetch(): void {
    urgentOrdersViewPrefetch = null;
}

export const LazyViewUrgentAndOrdersDashboard = lazyWithRetry(() =>
    import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard.tsx').then((m) => ({
        default: m.View_Urgent_And_Orders_Dashboard as unknown as LazyComponent,
    }))
);
export const LazySmartRepositoryModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartRepositoryModal').then((m) => ({
        default: m.SmartRepositoryModal as unknown as LazyComponent,
    })),
);

let smartRepositoryModalPrefetch: Promise<unknown> | null = null;

export function prefetchSmartRepositoryModal(): void {
    if (typeof window === 'undefined') return;
    if (!smartRepositoryModalPrefetch) {
        smartRepositoryModalPrefetch = import('@/app/components/lawyer/SmartRepositoryModal').catch((err) => {
            smartRepositoryModalPrefetch = null;
            throw err;
        });
    }
    void smartRepositoryModalPrefetch.catch(() => undefined);
}

let profileSettingsSheetPrefetch: Promise<unknown> | null = null;

let profileSettingsStudioTabsPrefetched = false;

/** تبويبات الاستوديو — تُحمَّل بالتوازي لتسريع التنقل الداخلي */
export function prefetchProfileSettingsStudioTabs(): void {
    if (typeof window === 'undefined' || profileSettingsStudioTabsPrefetched) return;
    profileSettingsStudioTabsPrefetched = true;
    void import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsPrivacyTab').catch(
        () => undefined,
    );
    void import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab').catch(
        () => undefined,
    );
    void import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsContainersTab').catch(
        () => undefined,
    );
}

export function resetProfileSettingsPrefetchForTests(): void {
    profileSettingsSheetPrefetch = null;
    profileSettingsStudioTabsPrefetched = false;
}

/** استوديو الملف المهني — chunk منفصل داخل ProfileContent */
export function prefetchProfileSettingsSheet(): void {
    if (typeof window === 'undefined') return;
    prefetchProfileSettingsStudioTabs();
    if (!profileSettingsSheetPrefetch) {
        profileSettingsSheetPrefetch = import(
            '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet'
        ).catch((err) => {
            profileSettingsSheetPrefetch = null;
            throw err;
        });
    }
    void profileSettingsSheetPrefetch.catch(() => undefined);
    void import('@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor').catch(() => undefined);
    void import('@/app/components/lawyer/RoyalLawyerProfile/components/ImageBlockStudioEditor').catch(() => undefined);
}

export function loadProfileSettingsSheetModule(): Promise<
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet')
> {
    prefetchProfileSettingsSheet();
    return profileSettingsSheetPrefetch as Promise<
        typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet')
    >;
}

/** المستودع + الملف المهني — chunk + بيانات الملف */
export function warmNotepadAndProfile(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchSmartRepositoryModal();
    prefetchProfileSettingsSheet();
    void import('@/app/runtime/royalLawyerProfileLoader').then((m) => m.prefetchRoyalLawyerProfile(userId));
}

/** الإعدادات فقط — بلا مستودع */
export function warmSettingsShell(): void {
    if (typeof window === 'undefined') return;
    prefetchHamiSettings();
}

/** المستودع + ذاكرة الوثائق — عند hover/فتح المخزن فقط */
export function warmVaultWorkspace(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchSmartRepositoryModal();
    void import('@/app/services/vault/vaultDocsWarmCache').then((m) => m.prefetchSmartVaultDocs(userId));
}

/** الإعدادات + المستودع — للمسارات التي تحتاج الاثنين صراحةً */
export function warmSettingsAndVault(userId?: string | null): void {
    warmSettingsShell();
    warmVaultWorkspace(userId);
}

let voiceRecorderModalPrefetch: Promise<unknown> | null = null;

export function prefetchVoiceRecorderModal(): void {
    if (typeof window === 'undefined') return;
    if (!voiceRecorderModalPrefetch) {
        voiceRecorderModalPrefetch = import('@/app/components/lawyer/ActionModals/VoiceRecorderModal').catch(
            (err) => {
                voiceRecorderModalPrefetch = null;
                throw err;
            },
        );
    }
    void voiceRecorderModalPrefetch.catch(() => undefined);
}

let smartFileModalPrefetch: Promise<unknown> | null = null;

/** تحميل مسبق لوحة الإضبارة الجزائية — store ثم dashboard */
export function prefetchCriminalDashboard(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/criminalDashboardLoader').then((m) => {
        m.prefetchCriminalDashboardPhased();
    });
}

/** تحميل مسبق إضبارة الدعوى — chunk رئيسي + shell + widgets */
export function prefetchSmartFileModal(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/smartFileModalLoader').then((m) => {
        void m.loadSmartFileModalModule().catch(() => undefined);
        m.prefetchSmartFileModalPhased();
    });
    if (!smartFileModalPrefetch) {
        smartFileModalPrefetch = import('@/app/runtime/smartFileModalLoader')
            .then((m) => m.loadSmartFileModalModule())
            .catch((err) => {
                smartFileModalPrefetch = null;
                throw err;
            });
    }
    void smartFileModalPrefetch.catch(() => undefined);
}

export function waitForSmartFileModalPrefetch(): Promise<void> {
    prefetchSmartFileModal();
    return (smartFileModalPrefetch ?? Promise.resolve()).then(() => undefined);
}

let executionDashboardPrefetch: Promise<void> | null = null;

export function resetExecutionDashboardPrefetch(): void {
    executionDashboardPrefetch = null;
    void import('@/app/runtime/executionDashboardLoader').then((m) => m.resetExecutionDashboardModuleCache());
}

/** تحميل مسبق إضبارة التنفيذ — deferred | intent | urgent */
export function prefetchExecutionDashboard(mode: ExecutionDashboardPrefetchMode = 'urgent'): void {
    if (typeof window === 'undefined') return;
    const run = import('@/app/runtime/executionDashboardLoader').then((m) => {
        m.prefetchExecutionDashboardByMode(mode);
        if (mode === 'urgent') {
            return m.loadExecutionDashboardModule().then(() => undefined);
        }
        return undefined;
    });
    if (mode === 'urgent' || !executionDashboardPrefetch) {
        executionDashboardPrefetch = run.catch((err) => {
            executionDashboardPrefetch = null;
            throw err;
        });
    }
    void executionDashboardPrefetch.catch(() => undefined);
}

export function waitForExecutionDashboardPrefetch(): Promise<void> {
    prefetchExecutionDashboard('urgent');
    return (executionDashboardPrefetch ?? Promise.resolve()).then(() => undefined);
}

/** أرشيف التنفيذ + الإضبارة — يُستدعى قبل/عند فتح قسم التنفيذ */
export function warmExecutionWorkspace(): void {
    if (typeof window === 'undefined') return;
    prefetchArchivePortal();
    prefetchExecutionDashboard('urgent');
    prefetchExecutionCreationView();
}

/** تحميل مسبق كل أنواع الإضابير (مدني + جزائي + تنفيذ) */
export function prefetchDossierShells(): void {
    prefetchArchivePortal();
    prefetchSmartFileModal();
    prefetchCriminalDashboard();
    prefetchExecutionDashboard('deferred');
}

export function resetCriminalDashboardPrefetch(): void {
    void import('@/app/runtime/criminalDashboardLoader').then((m) => {
        m.resetCriminalDashboardModuleCache();
    });
}

export function resetSmartFileModalPrefetch(): void {
    smartFileModalPrefetch = null;
    void import('@/app/runtime/smartFileModalLoader').then((m) => m.resetSmartFileModalModuleCache());
}

/** النظام الجزائي — chunk منفصل (CriminalDashboard + store ثقيل) */
export const LazyCriminalDashboard = lazyWithRetry(() =>
    import('@/app/runtime/criminalDashboardLoader').then((m) =>
        m.loadCriminalDashboardModule().then((mod) => ({
            default: mod.CriminalDashboard as unknown as LazyComponent,
        })),
    ),
);
export const LazyHamiSettings = lazyWithRetry(() =>
    import('@/app/runtime/hamiSettingsLoader').then((m) =>
        m.loadHamiSettingsModule().then((mod) => ({
            default: mod.HamiSettings as unknown as LazyComponent,
        })),
    ),
);
export function prefetchHamiSettings(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/hamiSettingsLoader').then((m) => m.prefetchHamiSettingsModule());
}
export const LazyRoyalLawyerProfile = lazyWithRetry(() =>
    import('@/app/runtime/royalLawyerProfileLoader').then((m) =>
        m.loadRoyalLawyerProfileModule().then((mod) => ({
            default: mod.RoyalLawyerProfile as unknown as LazyComponent,
        })),
    ),
);
export function prefetchRoyalLawyerProfile(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/royalLawyerProfileLoader').then((m) => m.prefetchRoyalLawyerProfile(userId));
}
export const LazySmartLegalRadar = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartLegalRadar.tsx').then((m) => ({ default: m.SmartLegalRadar as unknown as LazyComponent }))
);
export function prefetchSmartLegalRadar(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/SmartLegalRadar.tsx');
}
export const LazyExecutionCreationView = lazyWithRetry(() =>
    import('@/app/components/lawyer/ExecutionCreationView.tsx').then((m) => ({ default: m.ExecutionCreationView as unknown as LazyComponent }))
);
export function prefetchExecutionCreationView(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/ExecutionCreationView.tsx');
}
export const LazyGlobalSearchOverlay = lazyWithRetry(() =>
    import('@/app/components/lawyer/GlobalSearchOverlay').then((m) => ({
        default: m.GlobalSearchOverlay as unknown as LazyComponent,
    })),
);
export function prefetchGlobalSearchOverlay(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/globalSearchLoader').then((m) => m.prefetchGlobalSearchOverlay());
    void import('@/app/components/lawyer/GlobalSearchOverlay');
}

export function warmTasksWorkspace(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet');
    void import('@/app/components/lawyer/dashboard/TasksManagerOverlay');
    void import('@/app/components/lawyer/dashboard/TasksManager');
}

/** overlays الإنتاجية — مهام، معاملات، إشعارات، تقويم */
export function warmDashboardOverlays(): void {
    if (typeof window === 'undefined') return;
    warmTasksWorkspace();
    prefetchTransactionsHub();
    void import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard');
    void import('@/app/components/lawyer/NotificationPanel');
    void import('@/app/components/lawyer/SmartLegalRadar.tsx');
}

export function prefetchProductivityOverlays(): void {
    if (typeof window === 'undefined') return;
    warmSettingsShell();
    warmNotepadAndProfile();
    prefetchVoiceRecorderModal();
    warmDashboardOverlays();
}

let transactionsHubPrefetch: Promise<unknown> | null = null;

export function resetTransactionsHubPrefetch(): void {
    transactionsHubPrefetch = null;
}

/** تحميل مسبق مسار المعاملات — الواجهة + مخزن البيانات */
export function prefetchTransactionsHub(): void {
    if (typeof window === 'undefined') return;
    if (!transactionsHubPrefetch) {
        transactionsHubPrefetch = Promise.all([
            import('@/app/runtime/transactionsHubLoader').then((m) => m.loadTransactionsHubModule()),
            import('@/app/modules/transactionsThreading/store').catch(() => undefined),
        ]).catch((err) => {
            transactionsHubPrefetch = null;
            throw err;
        });
    }
    void transactionsHubPrefetch.catch(() => undefined);
}

export const LazyTransactionsThreadingSystem = lazyWithRetry(() =>
    import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem').then((m) => ({
        default: m.TransactionsThreadingSystem as unknown as LazyComponent,
    })),
);

export const LazyTasksManagerOverlay = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/TasksManagerOverlay').then((m) => ({
        default: m.TasksManagerOverlay as unknown as LazyComponent,
    })),
);

export const LazyFieldTasksBottomSheet = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet').then((m) => ({
        default: m.FieldTasksBottomSheet as unknown as LazyComponent,
    })),
);

export function prefetchLawyerHomeHubCard(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/LawyerHomeHubCard');
}

/** حاويات الرئيسية — chunk + مكوّنات الرئيسية فوراً */
export function warmLawyerHomeShell(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/LawyerDashboardParts/components/Header').catch(() => undefined);
    prefetchLawyerHomeHubCard();
    void import('@/app/components/lawyer/LegalCommandCenterDock');
    void import('@/app/components/lawyer/dashboard/commandHub/CommandHubTiles');
}

/** حاويات الرئيسية — تُحمَّل فوراً (تنبيهات + دوك + شريط الأوامر) */
export function prefetchLawyerHomeShellCritical(): void {
    warmLawyerHomeShell();
}

export function prefetchLawyerHomeShellWidgets(): void {
    if (typeof window === 'undefined') return;
    prefetchLawyerHomeShellCritical();
    prefetchSmartRepositoryModal();
}

export const LazyTasksManager = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/TasksManager.tsx').then((m) => ({ default: m.TasksManager as unknown as LazyComponent }))
);
export const LazyNotificationPanel = lazyWithRetry(() =>
    import('@/app/runtime/notificationPanelLoader').then((m) =>
        m.loadNotificationPanelModule().then((mod) => ({
            default: mod.NotificationPanel as unknown as LazyComponent,
        })),
    ),
);
export function prefetchNotificationPanel(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/notificationPanelLoader').then((m) => m.prefetchNotificationPanel());
}
export const LazyCommunityScreen = lazyWithRetry(() =>
    import('@/app/components/lawyer/CommunityScreen.tsx').then((m) => ({
        default: m.CommunityScreen as unknown as LazyComponent,
    }))
);

export function prefetchCommunityScreen(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/CommunityScreen.tsx');
    void import('@/app/services/forumApiService').then(({ ForumApiService }) =>
        ForumApiService.listPostsPaginated(20, 0).catch(() => {
            /* prefetch اختياري */
        }),
    );
}
// ═══════════════════════════════════════════════════════════════════════════
// LOADING FALLBACKS
// ═══════════════════════════════════════════════════════════════════════════

/** Minimal loading spinner */
export const ModalLoadingFallback = () => (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
        <div className="bg-[#0B1120] border-2 border-amber-500/40 rounded-3xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500/30 border-t-amber-500"></div>
            <p className="text-amber-400 font-bold text-sm">جاري التحميل...</p>
        </div>
    </div>
);

export const ComponentLoadingFallback = () => (
    <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500/30 border-t-blue-500"></div>
            <p className="text-gray-400 text-xs">جاري التحميل...</p>
        </div>
    </div>
);

export const ScreenLoadingFallback = () => (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/20"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-amber-500 absolute inset-0"></div>
            </div>
            <div className="text-center">
                <p className="text-amber-400 font-bold text-lg mb-1">حامي للمحاماة</p>
                <p className="text-gray-500 text-sm">جاري تحميل النظام...</p>
            </div>
        </div>
    </div>
);

type ComponentErrorFallbackProps = {
    error: unknown;
    resetErrorBoundary: () => void;
};

export const ComponentErrorFallback = ({ error, resetErrorBoundary }: ComponentErrorFallbackProps) => (
    <div className="flex items-center justify-center p-8">
        <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 max-w-md">
            <h3 className="text-red-400 font-bold text-lg mb-2">⚠️ خطأ في التحميل</h3>
            <p className="text-gray-300 text-sm mb-4">حدث خطأ أثناء تحميل هذا المكون.</p>
            <details className="mb-4">
                <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">عرض التفاصيل التقنية</summary>
                <pre className="text-red-300 text-[10px] mt-2 p-2 bg-black/30 rounded overflow-auto">
                    {error instanceof Error ? error.message : String(error)}
                </pre>
            </details>
            <button
                type="button"
                onClick={resetErrorBoundary}
                className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg py-2 text-red-400 font-bold text-sm transition-all"
            >
                إعادة المحاولة
            </button>
        </div>
    </div>
);
