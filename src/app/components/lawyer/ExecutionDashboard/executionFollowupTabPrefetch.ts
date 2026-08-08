/** تحميل مسبق لتبويب واحد من محضر المتابعة — لا يجمع كل التبويبات في موجة واحدة */
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';
import { canonicalFollowupTabForPrefetch } from './utils/followupLegacyTabNormalization';
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
    prefetchCustodyRemovalWardsModule,
    prefetchEvictionFieldProceduresPanel,
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
            Promise.resolve(prefetchCustodyRemovalWardsModule()),
        ]),
    coercive: () =>
        Promise.all([LazyCoerciveTab.preload(), Promise.resolve(prefetchEvictionFieldProceduresPanel())]),
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
    const canonical = canonicalFollowupTabForPrefetch(tabId);
    if (!isExecutionFollowupTabPrefetchId(canonical)) return;
    switch (canonical) {
        case 'personal':
        case 'coercive':
            prefetchExecutionCoreHandlers('coercive');
            prefetchExecutionCoreHandlers('coercive-lifecycle');
            break;
        case 'seizure_requests':
            prefetchExecutionCoreHandlers('seizure-requests');
            break;
        case 'admin':
        case 'special':
            break;
        case 'dossier_controls':
            prefetchExecutionCoreHandlers('followup-dossier-controls');
            prefetchExecutionCoreHandlers('dossier-support');
            break;
        case 'other_party':
        case 'financial':
        case 'correspondences':
            // المعالجات على Core أو لا تحتاج جسور handlers — UI فقط عبر TAB_LOADERS
            break;
        default:
            break;
    }
    void TAB_LOADERS[canonical as ExecutionFollowupTabPrefetchId]().catch(() => undefined);
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
