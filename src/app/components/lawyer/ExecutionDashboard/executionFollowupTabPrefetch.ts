/** تحميل مسبق لتبويب واحد من محضر المتابعة — لا يجمع كل التبويبات في موجة واحدة */
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';
import {
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyFinancialTab,
    LazyOtherPartyActionsLog,
    LazyOtherPartyTab,
    LazyPersonalCoerciveFollowupPanel,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
} from './executionDashboardLazyRegistry';

export type ExecutionFollowupTabPrefetchId =
    | 'personal'
    | 'coercive'
    | 'financial'
    | 'other_party'
    | 'seizure_requests'
    | 'correspondences'
    | 'dossier_controls'
    | 'admin'
    | 'special';

// preload (لا import خام) — يثبّت مكوّن التبويب للرسم المباشر بلا تعليق Suspense
const TAB_LOADERS: Record<ExecutionFollowupTabPrefetchId, () => Promise<unknown>> = {
    personal: () =>
        Promise.all([
            LazyPersonalTab.preload(),
            LazyPersonalCoerciveFollowupPanel.preload(),
        ]),
    coercive: () => LazyCoerciveTab.preload(),
    financial: () => LazyFinancialTab.preload(),
    other_party: () =>
        Promise.all([LazyOtherPartyTab.preload(), LazyOtherPartyActionsLog.preload()]),
    seizure_requests: () => LazySeizureRequestsTab.preload(),
    correspondences: () => LazyCommunicationsTab.preload(),
    dossier_controls: () => LazyDossierControlsTab.preload(),
    admin: () => LazyRequestsTab.preload(),
    special: () => LazyRequestsTab.preload(),
};

export function isExecutionFollowupTabPrefetchId(
    tabId: string,
): tabId is ExecutionFollowupTabPrefetchId {
    return Object.prototype.hasOwnProperty.call(TAB_LOADERS, tabId);
}

export function prefetchExecutionFollowupTab(tabId: string): void {
    if (!isExecutionFollowupTabPrefetchId(tabId)) return;
    switch (tabId) {
        case 'personal':
        case 'coercive':
            prefetchExecutionCoreHandlers('coercive');
            prefetchExecutionCoreHandlers('coercive-lifecycle');
            break;
        case 'admin':
        case 'special':
            prefetchExecutionCoreHandlers('followup-admin-special');
            break;
        case 'seizure_requests':
            // 'seizure' كان no-op — أول تفاعل داخل تبويب الحجز كان يصطدم بجسور باردة
            prefetchExecutionCoreHandlers('seizure-requests');
            break;
        case 'other_party':
            // 'followup-other-party' كان no-op — سخّن جسرَي المدين والدائن معاً
            prefetchExecutionCoreHandlers('followup-other-party-debtor');
            prefetchExecutionCoreHandlers('followup-other-party-creditor');
            break;
        case 'dossier_controls':
            prefetchExecutionCoreHandlers('followup-dossier-controls');
            break;
        default:
            break;
    }
    void TAB_LOADERS[tabId]().catch(() => undefined);
}

/**
 * تسخين كل تبويبات المحضر + جسورها دفعة واحدة (idle فقط) —
 * يجعل التنقل بين التبويبات لحظياً بلا أي Suspense بارد عند أول زيارة.
 */
export function prefetchAllExecutionFollowupTabs(): void {
    (Object.keys(TAB_LOADERS) as ExecutionFollowupTabPrefetchId[]).forEach((tabId) => {
        prefetchExecutionFollowupTab(tabId);
    });
}

/** التبويب الافتراضي عند فتح المحضر بدون تفضيل محفوظ */
export function prefetchExecutionFollowupDefaultTab(): void {
    prefetchExecutionFollowupTab('seizure_requests');
}

/**
 * @deprecated اسم تاريخي — يحمّل التبويب الافتراضي فقط (لا كل التبويبات).
 * استخدم prefetchExecutionFollowupTab للتبويب النشط.
 */
export function prefetchExecutionFollowupAllTabs(): void {
    prefetchExecutionFollowupDefaultTab();
}
