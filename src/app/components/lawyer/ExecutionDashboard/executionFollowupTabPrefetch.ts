/** تحميل مسبق لتبويب واحد من محضر المتابعة — لا يجمع كل التبويبات في موجة واحدة */
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';
import { canonicalFollowupTabForPrefetch } from './utils/followupLegacyTabNormalization';
import {
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyFinancialTab,
    LazyOtherPartyTab,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
    prefetchCustodyRemovalWardsModule,
    prefetchFollowupMemoPanels,
} from './executionDashboardLazyRegistryShell';
import {
    LazyOtherPartyActionsLog,
    prefetchEvictionFieldProceduresPanel,
    prefetchExecutionFinancialHubPortal,
} from './executionDashboardLazyRegistryOverlays';
import { prefetchRequestsTabInnerSurfaces } from './requestsTabInnerLazy';
import { prefetchManualOtherPartyLogBlock } from './otherPartyManualLogBlockLazy';

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
// اللوحات الثقيلة (PCFP / FinancialHub) هنا فقط — نية تبويب، لا deep-warm عام
const TAB_LOADERS: Record<ExecutionFollowupTabPrefetchId, () => Promise<unknown>> = {
    personal: () =>
        Promise.all([
            LazyPersonalTab.preload(),
            Promise.resolve(prefetchFollowupMemoPanels()),
            Promise.resolve(prefetchCustodyRemovalWardsModule()),
        ]),
    coercive: () =>
        Promise.all([LazyCoerciveTab.preload(), Promise.resolve(prefetchEvictionFieldProceduresPanel())]),
    financial: () =>
        Promise.all([
            LazyFinancialTab.preload(),
            Promise.resolve(prefetchExecutionFinancialHubPortal()),
        ]),
    other_party: () =>
        Promise.all([
            LazyOtherPartyTab.preload(),
            LazyOtherPartyActionsLog.preload(),
            Promise.resolve(prefetchManualOtherPartyLogBlock()),
        ]),
    seizure_requests: () => LazySeizureRequestsTab.preload(),
    correspondences: () => LazyCommunicationsTab.preload(),
    dossier_controls: () => LazyDossierControlsTab.preload(),
    admin: () =>
        Promise.all([LazyRequestsTab.preload(), Promise.resolve(prefetchRequestsTabInnerSurfaces())]),
    special: () =>
        Promise.all([LazyRequestsTab.preload(), Promise.resolve(prefetchRequestsTabInnerSurfaces())]),
};

function isExecutionFollowupTabPrefetchId(
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

export function prefetchExecutionFollowupDefaultTab(): void {
    prefetchExecutionFollowupTab('seizure_requests');
}
