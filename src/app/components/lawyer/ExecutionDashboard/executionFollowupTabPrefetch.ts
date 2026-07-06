/** تحميل مسبق لتبويب واحد من محضر المتابعة — لا يجمع كل التبويبات في موجة واحدة */
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';

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

const TAB_LOADERS: Record<ExecutionFollowupTabPrefetchId, () => Promise<unknown>> = {
    personal: () =>
        Promise.all([
            import('./components/PersonalTab'),
            import('../execution/PersonalCoerciveFollowupPanel'),
        ]),
    coercive: () => import('./components/CoerciveTab'),
    financial: () => import('./components/FinancialTab'),
    other_party: () => import('./components/OtherPartyTab'),
    seizure_requests: () => import('./components/SeizureRequestsTab'),
    correspondences: () => import('./components/CommunicationsTab'),
    dossier_controls: () => import('./components/DossierControlsTab'),
    admin: () => import('./components/RequestsTab'),
    special: () => import('./components/RequestsTab'),
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
            break;
        case 'admin':
        case 'special':
            prefetchExecutionCoreHandlers('followup-admin-special');
            break;
        case 'seizure_requests':
            prefetchExecutionCoreHandlers('seizure');
            break;
        case 'other_party':
            prefetchExecutionCoreHandlers('followup-other-party');
            break;
        case 'dossier_controls':
            prefetchExecutionCoreHandlers('followup-dossier-controls');
            break;
        default:
            break;
    }
    void TAB_LOADERS[tabId]().catch(() => undefined);
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
