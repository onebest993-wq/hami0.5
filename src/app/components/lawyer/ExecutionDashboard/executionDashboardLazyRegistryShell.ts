/**
 * Lazy registry — أقسام أول viewport والجسم المتأخر. تبويبات المحضر في
 * `executionDashboardFollowupTabLazy` حتى لا تُقيَّم مع طلاء الإضبارة.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
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
