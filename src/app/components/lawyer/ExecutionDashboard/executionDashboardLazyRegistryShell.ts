/**
 * Lazy registry — shell / first-paint sections + followup tabs.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { UnifiedSeizureLogHostProps } from './components/UnifiedSeizureLogHost';
import { prefetchExecutionTimelineSurface } from './executionTimelineSurfaceLazy';

const actionGridSectionImport = () =>
    import('./components/ActionGridSection').then((m) => ({ default: m.ActionGridSection }));
const dashboardHeaderImport = () =>
    import('./components/DashboardHeaderSection').then((m) => ({ default: m.DashboardHeaderSection }));
const partiesSectionImport = () =>
    import('./components/PartiesSection').then((m) => ({ default: m.PartiesSection }));
const debtorsSectionImport = () =>
    import('./components/DebtorsSection').then((m) => ({ default: m.DebtorsSection }));
const timelineSectionImport = () =>
    import('./components/TimelineSection').then((m) => ({ default: m.TimelineSection }));
const dossierLifecyclePanelImport = () =>
    import('./components/DossierLifecyclePanel').then((m) => ({ default: m.DossierLifecyclePanel }));
const dossierSwitcherImport = () =>
    import('./components/DossierSwitcher').then((m) => ({ default: m.DossierSwitcher }));
const unifiedSeizureLogHostImport = () =>
    import('./components/UnifiedSeizureLogHost').then((m) => ({ default: m.UnifiedSeizureLogHost }));
const colleagueConsultationHeaderButtonImport = () =>
    import('@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton').then((m) => ({
        default: m.ColleagueConsultationHeaderButton,
    }));

export const LazyDashboardHeaderSection = createPreloadableLazyComponent(dashboardHeaderImport);
export const LazyPartiesSection = createPreloadableLazyComponent(partiesSectionImport);
export const LazyDebtorsSection = createPreloadableLazyComponent(debtorsSectionImport);
export const LazyActionGridSection = createPreloadableLazyComponent(actionGridSectionImport);
export const LazyTimelineSection = createPreloadableLazyComponent(timelineSectionImport);
export const LazyDossierLifecyclePanel = createPreloadableLazyComponent(dossierLifecyclePanelImport);

export const LazyUnifiedSeizureLogHost =
    createPreloadableLazyComponent<UnifiedSeizureLogHostProps>(unifiedSeizureLogHostImport);

export function prefetchUnifiedSeizureLogHost(): void {
    void LazyUnifiedSeizureLogHost.preload();
}

export function prefetchExecutionDossierDeepSurface(): void {
    void dossierSwitcherImport().catch(() => {});
    void colleagueConsultationHeaderButtonImport().catch(() => {});
    void import('./executionDashboardSeizureRequestSubjectModalLazy')
        .then((m) => m.LazySeizureRequestSubjectModal.preload())
        .catch(() => {});
}

/** أقسام أول viewport — الأطراف + الشبكة + السجل. لا تُؤجَّل للخمول. */
export function preloadExecutionDashboardFirstViewportSections(): Promise<void> {
    return Promise.all([
        LazyDashboardHeaderSection.preload(),
        LazyPartiesSection.preload(),
        LazyDebtorsSection.preload(),
        LazyActionGridSection.preload(),
        LazyTimelineSection.preload(),
        prefetchExecutionTimelineSurface(),
        import('./debtorCardRowBadgesClusterLazy')
            .then((m) => m.LazyDebtorCardRowBadgesCluster.preload())
            .catch(() => undefined),
    ]).then(() => undefined);
}

export function prefetchExecutionDashboardShell(): void {
    void preloadExecutionDashboardFirstViewportSections();
    const warmHeaderOverlay = () => {
        void LazyDossierLifecyclePanel.preload();
    };
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => warmHeaderOverlay(), { timeout: 1_800 });
    } else {
        setTimeout(warmHeaderOverlay, 200);
    }
}

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

const visitationScheduleModuleImport = () =>
    import('./components/VisitationScheduleModule').then((m) => ({
        default: m.VisitationScheduleModule,
    }));

export const LazyVisitationScheduleModule = createPreloadableLazyComponent(visitationScheduleModuleImport);

export function prefetchVisitationScheduleModule(): void {
    void LazyVisitationScheduleModule.preload();
}

export const LazyCustodyRemovalWardsModule = createPreloadableLazyComponent(() =>
    import('./components/CustodyRemovalWardsModule').then((m) => ({
        default: m.CustodyRemovalWardsModule,
    }))
);

export function prefetchCustodyRemovalWardsModule(): void {
    void LazyCustodyRemovalWardsModule.preload();
}

export const LazyMaritalFurnitureModule = createPreloadableLazyComponent(() =>
    import('./components/MaritalFurnitureModule').then((m) => ({
        default: m.MaritalFurnitureModule,
    }))
);

export function prefetchMaritalFurnitureModule(): void {
    void LazyMaritalFurnitureModule.preload();
}

export const LazyPersonalTab = createPreloadableLazyComponent(() =>
    import('./components/PersonalTab').then((m) => ({ default: m.PersonalTab }))
);
export const LazyCoerciveTab = createPreloadableLazyComponent(() =>
    import('./components/CoerciveTab').then((m) => ({ default: m.CoerciveTab }))
);
export const LazyFinancialTab = createPreloadableLazyComponent(() =>
    import('./components/FinancialTab').then((m) => ({ default: m.FinancialTab }))
);
export const LazyOtherPartyTab = createPreloadableLazyComponent(() =>
    import('./components/OtherPartyTab').then((m) => ({ default: m.OtherPartyTab }))
);
export const LazySeizureRequestsTab = createPreloadableLazyComponent(() =>
    import('./components/SeizureRequestsTab').then((m) => ({ default: m.SeizureRequestsTab }))
);
export const LazyCommunicationsTab = createPreloadableLazyComponent(() =>
    import('./components/CommunicationsTab').then((m) => ({ default: m.CommunicationsTab }))
);
export const LazyRequestsTab = createPreloadableLazyComponent(() =>
    import('./components/RequestsTab').then((m) => ({ default: m.RequestsTab }))
);
export const LazyDossierControlsTab = createPreloadableLazyComponent(() =>
    import('./components/DossierControlsTab').then((m) => ({ default: m.DossierControlsTab }))
);
