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
import { LazyLawyerNewCase } from '@/app/utils/lazy/lawyerNewCaseModal';

export { LazyLawyerNewCase };

// ═══════════════════════════════════════════════════════════════════════════
// HEAVY MODALS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazySmartFileModal = lazyWithRetry(
    () => import('@/app/components/lawyer/SmartFileModal').then((m) => ({ default: m.SmartFileModal as unknown as LazyComponent }))
);

export const LazyClientRequestsHub = lazyWithRetry(() =>
    import('@/app/components/lawyer/ClientRequestsHub').then((m) => ({
        default: m.ClientRequestsHub as unknown as LazyComponent,
    }))
);

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENTS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyExecutionDashboard = lazyWithRetry(
    () => import('@/app/components/lawyer/ExecutionDashboard.tsx').then((m) => ({ default: m.ExecutionDashboard as unknown as LazyComponent }))
);

export const LazySmartContractGenerator = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartContractGenerator.tsx').then((m) => ({ default: m.SmartContractGenerator as unknown as LazyComponent }))
);

export const LazyNotepadModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/NotepadModal').then((m) => ({ default: m.NotepadModal as unknown as LazyComponent }))
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
export const LazySmartVaultModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartVaultModal.tsx').then((m) => ({ default: m.SmartVaultModal as unknown as LazyComponent }))
);
let criminalDashboardPrefetch: Promise<unknown> | null = null;
let smartFileModalPrefetch: Promise<unknown> | null = null;

/** تحميل مسبق لوحة الإضبارة الجزائية + المتجر قبل النقر */
export function prefetchCriminalDashboard(): void {
    if (typeof window === 'undefined') return;
    if (!criminalDashboardPrefetch) {
        criminalDashboardPrefetch = Promise.all([
            import('@/app/components/lawyer/criminal-system/criminalStore'),
            import('@/app/components/lawyer/criminal-system/CriminalDashboard'),
        ]);
    }
}

/** تحميل مسبق إضبارة المدني قبل النقر */
export function prefetchSmartFileModal(): void {
    if (typeof window === 'undefined') return;
    if (!smartFileModalPrefetch) {
        smartFileModalPrefetch = Promise.all([
            import('@/app/components/lawyer/SmartFileModal'),
            import('@/app/components/lawyer/smart-modal/SmartFileModalContent'),
        ]);
    }
}

let executionDashboardPrefetch: Promise<unknown> | null = null;

/** تحميل مسبق إضبارة التنفيذ (chunk ثقيل ~750KB) */
export function prefetchExecutionDashboard(): void {
    if (typeof window === 'undefined') return;
    if (!executionDashboardPrefetch) {
        executionDashboardPrefetch = import('@/app/components/lawyer/ExecutionDashboard.tsx');
    }
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell').then((m) => {
        m.prefetchExecutionDashboardShell();
        m.prefetchExecutionFollowupDefaultTab();
    }).catch(() => {});
}

/** تحميل مسبق كل أنواع الإضابير (مدني + جزائي + تنفيذ) */
export function prefetchDossierShells(): void {
    prefetchArchivePortal();
    prefetchSmartFileModal();
    prefetchCriminalDashboard();
    prefetchExecutionDashboard();
}

export function resetCriminalDashboardPrefetch(): void {
    criminalDashboardPrefetch = null;
}

export function resetSmartFileModalPrefetch(): void {
    smartFileModalPrefetch = null;
}

/** النظام الجزائي — chunk منفصل (CriminalDashboard + store ثقيل) */
export const LazyCriminalDashboard = lazyWithRetry(() =>
    import('@/app/components/lawyer/criminal-system/CriminalDashboard').then((m) => ({
        default: m.CriminalDashboard as unknown as LazyComponent,
    })),
);
export const LazyHamiSettings = lazyWithRetry(() =>
    import('@/app/components/lawyer/HamiSettings/index').then((m) => ({ default: m.HamiSettings as unknown as LazyComponent }))
);
export const LazyRoyalLawyerProfile = lazyWithRetry(() =>
    import('@/app/runtime/royalLawyerProfileLoader').then((m) =>
        m.loadRoyalLawyerProfileModule().then((mod) => ({
            default: mod.RoyalLawyerProfile as unknown as LazyComponent,
        })),
    ),
);
export function prefetchRoyalLawyerProfile(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/royalLawyerProfileLoader').then((m) => m.prefetchRoyalLawyerProfile());
}
export const LazySmartLegalRadar = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartLegalRadar.tsx').then((m) => ({ default: m.SmartLegalRadar as unknown as LazyComponent }))
);
export const LazyExecutionCreationView = lazyWithRetry(() =>
    import('@/app/components/lawyer/ExecutionCreationView.tsx').then((m) => ({ default: m.ExecutionCreationView as unknown as LazyComponent }))
);
export const LazyGlobalSearchOverlay = lazyWithRetry(() =>
    import('@/app/runtime/globalSearchLoader').then((m) =>
        m.loadGlobalSearchOverlayModule().then((mod) => ({
            default: mod.GlobalSearchOverlay as unknown as LazyComponent,
        })),
    ),
);
export function prefetchGlobalSearchOverlay(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/globalSearchLoader').then((m) => m.prefetchGlobalSearchOverlay());
}
export const LazyUnifiedCommandHub = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/UnifiedCommandHub').then((m) => ({ default: m.UnifiedCommandHub as unknown as LazyComponent }))
);
export function prefetchLawyerHomeHubCard(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/lawyerDashboardLoader').then((m) => m.prefetchLawyerDashboardEntry());
}

export const LazyLawyerHomeHubCard = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawyerHomeHubCard').then((m) => ({
        default: m.LawyerHomeHubCard as unknown as LazyComponent,
    })),
);
export const LazyLegalCommandCenterDock = lazyWithRetry(() =>
    import('@/app/components/lawyer/LegalCommandCenterDock').then((m) => ({ default: m.LegalCommandCenterDock as unknown as LazyComponent }))
);
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
