/**
 * Lazy registry — تبويبات محضر المتابعة فقط.
 * لا يُستورد من شِل أول viewport حتى لا يُقيَّم مع طلاء الإضبارة.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

const personalCoerciveFollowupPanelImport = () =>
    import('../execution/PersonalCoerciveFollowupPanel').then((m) => ({
        default: m.PersonalCoerciveFollowupPanel,
    }));

export const LazyPersonalCoerciveFollowupPanel = createPreloadableLazyComponent(
    personalCoerciveFollowupPanelImport,
);

const employeeAssignmentCoerciveImport = () =>
    import('@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock').then((m) => ({
        default: m.EmployeeAssignmentCoerciveFollowupBlock,
    }));

export const LazyEmployeeAssignmentCoerciveFollowupBlock = createPreloadableLazyComponent(
    employeeAssignmentCoerciveImport,
);

export function prefetchFollowupMemoPanels(): void {
    void LazyPersonalCoerciveFollowupPanel.preload();
    void LazyEmployeeAssignmentCoerciveFollowupBlock.preload();
}

export const LazyPersonalTab = createPreloadableLazyComponent(() =>
    import('./components/PersonalTab').then((m) => ({ default: m.PersonalTab })),
);
export const LazyCoerciveTab = createPreloadableLazyComponent(() =>
    import('./components/CoerciveTab').then((m) => ({ default: m.CoerciveTab })),
);
export const LazyFinancialTab = createPreloadableLazyComponent(() =>
    import('./components/FinancialTab').then((m) => ({ default: m.FinancialTab })),
);
export const LazyOtherPartyTab = createPreloadableLazyComponent(() =>
    import('./components/OtherPartyTab').then((m) => ({ default: m.OtherPartyTab })),
);
export const LazySeizureRequestsTab = createPreloadableLazyComponent(() =>
    import('./components/SeizureRequestsTab').then((m) => ({ default: m.SeizureRequestsTab })),
);
export const LazyCommunicationsTab = createPreloadableLazyComponent(() =>
    import('./components/CommunicationsTab').then((m) => ({ default: m.CommunicationsTab })),
);
export const LazyRequestsTab = createPreloadableLazyComponent(() =>
    import('./components/RequestsTab').then((m) => ({ default: m.RequestsTab })),
);
export const LazyDossierControlsTab = createPreloadableLazyComponent(() =>
    import('./components/DossierControlsTab').then((m) => ({ default: m.DossierControlsTab })),
);
