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

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Create a lazy component with retry logic
 * Handles network failures gracefully
 */
type LazyComponent = ComponentType<Record<string, unknown>>;

const LAZY_IMPORT_TIMEOUT_MS = 18_000;

function lazyWithRetry(
    componentImport: () => Promise<{ default: LazyComponent }>,
    retries: number = 3,
): LazyExoticComponent<LazyComponent> {
    return lazy(() => {
        return new Promise<{ default: LazyComponent }>((resolve, reject) => {
            let settled = false;
            const timeoutId = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error('انتهت مهلة تحميل المكون. تحقق من الاتصال ثم أعد المحاولة.'));
            }, LAZY_IMPORT_TIMEOUT_MS);

            const finish = (fn: () => void) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                fn();
            };

            const attemptImport = (retriesLeft: number) => {
                componentImport()
                    .then((mod) => finish(() => resolve(mod)))
                    .catch((error: unknown) => {
                        if (retriesLeft === 0) {
                            finish(() => reject(error));
                            return;
                        }

                        window.setTimeout(() => {
                            if (import.meta.env.DEV) {
                                console.log(`Retrying component import... (${retriesLeft} retries left)`);
                            }
                            attemptImport(retriesLeft - 1);
                        }, 1000);
                    });
            };

            attemptImport(retries);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// HEAVY MODALS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazySmartFileModal = lazyWithRetry(
    () => import('@/app/components/lawyer/SmartFileModal').then((m) => ({ default: m.SmartFileModal as unknown as LazyComponent }))
);

export const LazyCommunityScreen = lazyWithRetry(() =>
    import('@/app/components/lawyer/CommunityScreen').then((m) => ({ default: m.CommunityScreen as unknown as LazyComponent }))
);

export const LazyDecisionsAndAppealsEngine = lazyWithRetry(() =>
    import('@/app/components/lawyer/DecisionsAndAppealsEngine').then((m) => ({
        default: m.DecisionsAndAppealsEngine as unknown as LazyComponent,
    }))
);

export const LazyDocumentVault = lazyWithRetry(() =>
    import('@/app/components/lawyer/DocumentVault').then((m) => ({ default: m.DocumentVault as unknown as LazyComponent }))
);

export const LazyAlimonyEngine = lazyWithRetry(() =>
    import('@/app/components/lawyer/AlimonyEngine').then((m) => ({ default: m.AlimonyEngine as unknown as LazyComponent }))
);

export const LazyAssetSeizureEngine = lazyWithRetry(() =>
    import('@/app/components/lawyer/AssetSeizureEngine').then((m) => ({ default: m.AssetSeizureEngine as unknown as LazyComponent }))
);

export const LazyPremiumTimelineAuditLog = lazyWithRetry(() =>
    import('@/app/components/lawyer/PremiumTimelineAuditLog').then((m) => ({
        default: m.PremiumTimelineAuditLog as unknown as LazyComponent,
    }))
);

export const LazyAILegalAssistant = lazyWithRetry(() =>
    import('@/app/components/lawyer/AILegalAssistant').then((m) => ({ default: m.default as unknown as LazyComponent }))
);

export const LazyFinancialOperationsCenter = lazyWithRetry(
    () => import('@/app/components/lawyer/FinancialOperationsCenter').then((m) => ({ default: m.FinancialOperationsCenter as unknown as LazyComponent }))
);

export const LazyUnifiedSummonsHub = lazyWithRetry(
    () => import('@/app/components/lawyer/Modal_Unified_Summons_Hub').then((m) => ({ default: m.UnifiedSummonsHub as unknown as LazyComponent }))
);

export const LazyClientRequestsHub = lazyWithRetry(() =>
    import('@/app/components/lawyer/ClientRequestsHub').then((m) => ({
        default: m.ClientRequestsHub as unknown as LazyComponent,
    }))
);

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATORS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyPaymentCalculator = lazyWithRetry(
    () => import('@/app/components/lawyer/Modal_Payment_Calculator').then((m) => ({ default: m.PaymentCalculator as unknown as LazyComponent }))
);

export const LazySettlementCalculator = lazyWithRetry(
    () => import('@/app/components/lawyer/Modal_Settlement_Calculator').then((m) => ({ default: m.SettlementCalculator as unknown as LazyComponent }))
);

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENTS (Lazy Loaded)
// ═══════════════════════════════════════════════════════════════════════════

export const LazyExecutionDashboard = lazyWithRetry(
    () => import('@/app/components/lawyer/ExecutionDashboard').then((m) => ({ default: m.ExecutionDashboard as unknown as LazyComponent }))
);

export const LazyCompleteLawsuitSystem = lazyWithRetry(
    () => import('@/app/components/lawyer/CompleteLawsuitSystem').then((m) => ({ default: m.CompleteLawsuitSystem as unknown as LazyComponent }))
);

export const LazySmartLegalConsultant = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartLegalConsultant').then((m) => ({ default: m.SmartLegalConsultant as unknown as LazyComponent }))
);

export const LazySmartUtilities = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartUtilities').then((m) => ({ default: m.SmartUtilities as unknown as LazyComponent }))
);

export const LazySmartContractGenerator = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartContractGenerator').then((m) => ({ default: m.SmartContractGenerator as unknown as LazyComponent }))
);

export const LazyNotepadModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/NotepadModal').then((m) => ({ default: m.NotepadModal as unknown as LazyComponent }))
);

export const LazyArchivePortal = lazyWithRetry(() =>
    import('@/app/components/lawyer/ArchivePortal').then((m) => ({
        default: m.ArchivePortal as unknown as LazyComponent,
    }))
);

/** LawyerDashboard: heavy overlays & tabs (split from main lawyer chunk) */
export const LazyLeadManagement = lazyWithRetry(() =>
    import('@/app/components/lawyer/LeadManagement').then((m) => ({ default: m.LeadManagement as unknown as LazyComponent }))
);
export const LazyCommunicationHub = lazyWithRetry(() =>
    import('@/app/components/lawyer/CommunicationHub').then((m) => ({ default: m.CommunicationHub as unknown as LazyComponent }))
);
export const LazyTransactionsSystem = lazyWithRetry(() =>
    import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem').then((m) => ({
        default: m.TransactionsThreadingSystem as unknown as LazyComponent,
    }))
);
export const LazyLawsuitSubMenu = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawsuitSubMenu').then((m) => ({ default: m.LawsuitSubMenu as unknown as LazyComponent }))
);
export const LazyLawsuitsWorkspace = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawsuitsWorkspace').then((m) => ({ default: m.LawsuitsWorkspace as unknown as LazyComponent }))
);
let urgentOrdersViewPrefetch: Promise<unknown> | null = null;

/** تحميل مسبق خفيف لقائمة الطلبات المستعجلة (بدون ملف الإضبارة الثقيل) */
export function prefetchUrgentOrdersView(): void {
    if (typeof window === 'undefined') return;
    if (!urgentOrdersViewPrefetch) {
        urgentOrdersViewPrefetch = import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard');
    }
}

/** إعادة محاولة تحميل لوحة الطلبات المستعجلة بعد فشل lazy import */
export function resetUrgentOrdersViewPrefetch(): void {
    urgentOrdersViewPrefetch = null;
}

export const LazyViewUrgentAndOrdersDashboard = lazyWithRetry(() =>
    import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard').then((m) => ({
        default: m.View_Urgent_And_Orders_Dashboard as unknown as LazyComponent,
    }))
);
export const LazySmartVaultModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartVaultModal').then((m) => ({ default: m.SmartVaultModal as unknown as LazyComponent }))
);
export const LazySmartCriminalLibrary = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/SmartCriminalLibrary').then((m) => ({ default: m.SmartCriminalLibrary as unknown as LazyComponent }))
);
export const LazyHamiSettings = lazyWithRetry(() =>
    import('@/app/components/lawyer/HamiSettings').then((m) => ({ default: m.HamiSettings as unknown as LazyComponent }))
);
export const LazyRoyalLawyerProfile = lazyWithRetry(() =>
    import('@/app/components/lawyer/RoyalLawyerProfile').then((m) => ({ default: m.RoyalLawyerProfile as unknown as LazyComponent }))
);
export const LazySmartLegalRadar = lazyWithRetry(() =>
    import('@/app/components/lawyer/SmartLegalRadar').then((m) => ({ default: m.SmartLegalRadar as unknown as LazyComponent }))
);
export const LazyExecutionCreationView = lazyWithRetry(() =>
    import('@/app/components/lawyer/ExecutionCreationView').then((m) => ({ default: m.ExecutionCreationView as unknown as LazyComponent }))
);
export const LazyGlobalSearchOverlay = lazyWithRetry(() =>
    import('@/app/components/lawyer/GlobalSearchOverlay').then((m) => ({ default: m.GlobalSearchOverlay as unknown as LazyComponent }))
);
export const LazyGlobalSearchResults = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/GlobalSearchResults').then((m) => ({ default: m.GlobalSearchResults as unknown as LazyComponent }))
);
export const LazyBackendTestingPanel = lazyWithRetry(() =>
    import('@/app/components/testing/BackendTestingPanel').then((m) => ({ default: m.BackendTestingPanel as unknown as LazyComponent }))
);
export const LazyNeuralAlertsCard = lazyWithRetry(() =>
    import('@/app/components/lawyer/NeuralAlertsCard').then((m) => ({ default: m.NeuralAlertsCard as unknown as LazyComponent }))
);

/** LawyerDashboard shell: defer until home / auth / notifications / messaging */
export const LazyUnifiedCommandHub = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/UnifiedCommandHub').then((m) => ({ default: m.UnifiedCommandHub as unknown as LazyComponent }))
);
export const LazyLegalCommandCenterDock = lazyWithRetry(() =>
    import('@/app/components/lawyer/LegalCommandCenterDock').then((m) => ({ default: m.LegalCommandCenterDock as unknown as LazyComponent }))
);
export const LazyTasksManager = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/TasksManager').then((m) => ({ default: m.TasksManager as unknown as LazyComponent }))
);
export const LazyLawyerAuth = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawyerAuth').then((m) => ({ default: m.LawyerAuth as unknown as LazyComponent }))
);
export const LazyNotificationPanel = lazyWithRetry(() =>
    import('@/app/components/lawyer/NotificationPanel').then((m) => ({ default: m.NotificationPanel as unknown as LazyComponent }))
);
export const LazyScannerModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/ActionModals').then((m) => ({ default: m.ScannerModal as unknown as LazyComponent }))
);
export const LazyVoiceRecorderModal = lazyWithRetry(() =>
    import('@/app/components/lawyer/ActionModals').then((m) => ({ default: m.VoiceRecorderModal as unknown as LazyComponent }))
);
export const LazyMessagesList = lazyWithRetry(() =>
    import('@/app/components/lawyer/messaging/MessagesList').then((m) => ({ default: m.MessagesList as unknown as LazyComponent }))
);
export const LazyChatRoom = lazyWithRetry(() =>
    import('@/app/components/lawyer/messaging/ChatRoom').then((m) => ({ default: m.ChatRoom as unknown as LazyComponent }))
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

export default {
    LazySmartFileModal,
    LazyDecisionsAndAppealsEngine,
    LazyDocumentVault,
    LazyAlimonyEngine,
    LazyAssetSeizureEngine,
    LazyPremiumTimelineAuditLog,
    LazyAILegalAssistant,
    LazyFinancialOperationsCenter,
    LazyUnifiedSummonsHub,
    LazyClientRequestsHub,
    LazyPaymentCalculator,
    LazySettlementCalculator,
    LazyExecutionDashboard,
    LazyCompleteLawsuitSystem,
    LazySmartLegalConsultant,
    LazySmartUtilities,
    LazySmartContractGenerator,
    LazyNotepadModal,
    LazyArchivePortal,
    ModalLoadingFallback,
    ComponentLoadingFallback,
    ScreenLoadingFallback,
    ComponentErrorFallback
};
