/**
 * Lazy registry للإضبارة الجزائية — tabs + panels + prefetch بالنية.
 * لا static import للـ tab panels الثقيلة في CriminalDashboard shell.
 * التبويبات الأساسية: preloadable حتى لا يعلّق Suspense بعد اكتمال التحميل.
 */
import { lazy } from 'react';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';

const legalCodesTabImport = () =>
    import('./legalCodes/LegalCodesTab').then((m) => ({ default: m.LegalCodesTab }));

const recursiveProceduralCanvasImport = () =>
    import('./components/RecursiveProceduralCanvas').then((m) => ({
        default: m.RecursiveProceduralCanvas,
    }));

const statementsPhaseSectionsImport = () =>
    import('./components/StatementsPhaseSections').then((m) => ({
        default: m.StatementsPhaseSections,
    }));

const trialsTabImport = () =>
    import('./components/TrialsTab').then((m) => ({ default: m.TrialsTab }));

const criminalDashboardRequestsTabImport = () =>
    import('./CriminalDashboardRequestsTab').then((m) => ({
        default: m.CriminalDashboardRequestsTab,
    }));

const criminalDashboardStatementsTabImport = () =>
    import('./CriminalDashboardStatementsTab').then((m) => ({
        default: m.CriminalDashboardStatementsTab,
    }));

const criminalDashboardTrackingTabImport = () =>
    import('./CriminalDashboardTrackingTab').then((m) => ({
        default: m.CriminalDashboardTrackingTab,
    }));

const criminalDashboardHeaderImport = () =>
    import('./CriminalDashboardHeader').then((m) => ({ default: m.CriminalDashboardHeader }));

const criminalNewCaseImport = () =>
    import('./CriminalNewCase').then((m) => ({ default: m.CriminalNewCase }));

const judicialDecisionsLedgerImport = () =>
    import('./components/JudicialDecisionsLedger').then((m) => ({
        default: m.JudicialDecisionsLedger,
    }));

const criminalPartiesGridImport = () =>
    import('./CriminalPartiesGrid').then((m) => ({ default: m.CriminalPartiesGrid }));

const decisionsCommandBarImport = () =>
    import('./components/DecisionsCommandBar').then((m) => ({ default: m.DecisionsCommandBar }));

const decisionsScopeFilterBarImport = () =>
    import('./components/DecisionsScopeFilterBar').then((m) => ({
        default: m.DecisionsScopeFilterBar,
    }));

const verdictCardsPanelImport = () =>
    import('./components/VerdictCardsPanel').then((m) => ({ default: m.VerdictCardsPanel }));

const liveDetentionCardImport = () =>
    import('./components/LiveDetentionCard').then((m) => ({ default: m.LiveDetentionCard }));

const liveArrestSummonCardImport = () =>
    import('./components/LiveArrestSummonCard').then((m) => ({ default: m.LiveArrestSummonCard }));

const trialDepositionWitnessCardImport = () =>
    import('./components/TrialDepositionWitnessCard').then((m) => ({
        default: m.TrialDepositionWitnessCard,
    }));

const statementHighlightedContentImport = () =>
    import('./components/StatementHighlightedContent').then((m) => ({
        default: m.StatementHighlightedContent,
    }));

export const LazyLegalCodesTab = createPreloadableLazyComponent(legalCodesTabImport);
export const LazyRecursiveProceduralCanvas = createPreloadableLazyComponent(recursiveProceduralCanvasImport);
export const LazyStatementsPhaseSections = createPreloadableLazyComponent(statementsPhaseSectionsImport);
/** جلسات المحاكمة — يُحمَّل مع نية تبويب الطلبات / فلتر trial_sessions */
export const LazyTrialsTab = createPreloadableLazyComponent(trialsTabImport);
export const LazyCriminalDashboardRequestsTab = createPreloadableLazyComponent(
    criminalDashboardRequestsTabImport,
);
export const LazyCriminalDashboardStatementsTab = createPreloadableLazyComponent(
    criminalDashboardStatementsTabImport,
);
export const LazyCriminalDashboardTrackingTab = createPreloadableLazyComponent(
    criminalDashboardTrackingTabImport,
);
export const LazyCriminalNewCase = lazy(criminalNewCaseImport);
export const LazyCriminalDashboardHeader = createPreloadableLazyComponent(criminalDashboardHeaderImport);
export const LazyCriminalPartiesGrid = createPreloadableLazyComponent(criminalPartiesGridImport);
export const LazyTrialDepositionWitnessCard = lazy(trialDepositionWitnessCardImport);

/** سطوح قرارات/طلبات — نفس هوية التحميل مع tabPrefetchers */
export const LazyDecisionsCommandBar = createPreloadableLazyComponent(decisionsCommandBarImport);
export const LazyDecisionsScopeFilterBar = createPreloadableLazyComponent(decisionsScopeFilterBarImport);
export const LazyJudicialDecisionsLedger = createPreloadableLazyComponent(judicialDecisionsLedgerImport);
export const LazyLiveArrestSummonCard = createPreloadableLazyComponent(liveArrestSummonCardImport);
export const LazyLiveDetentionCard = createPreloadableLazyComponent(liveDetentionCardImport);
export const LazyVerdictCardsPanel = createPreloadableLazyComponent(verdictCardsPanelImport);

/** محركات ثقيلة — فقط عند نية التبويب، لا من idle الـ store قبل أول فتح */
function prefetchCriminalHeavyEnginesOnTabIntent(): void {
    void import('./trialSessionsEngine').catch(() => undefined);
    void import('./cassationEngine').catch(() => undefined);
    void import('./proceduralContainersEngine').catch(() => undefined);
}

const tabPrefetchers: Record<CriminalDashboardTab, () => void> = {
    requests: () => {
        prefetchCriminalHeavyEnginesOnTabIntent();
        void LazyCriminalDashboardRequestsTab.preload();
        void LazyDecisionsCommandBar.preload();
        void LazyDecisionsScopeFilterBar.preload();
        void LazyVerdictCardsPanel.preload();
        void LazyLiveDetentionCard.preload();
        void LazyLiveArrestSummonCard.preload();
        void LazyJudicialDecisionsLedger.preload();
        void LazyTrialsTab.preload();
    },
    statements: () => {
        void import('./trialSessionsEngine').catch(() => undefined);
        void LazyCriminalDashboardStatementsTab.preload();
        void LazyStatementsPhaseSections.preload();
        void statementHighlightedContentImport().catch(() => undefined);
        void trialDepositionWitnessCardImport().catch(() => undefined);
    },
    tracking: () => {
        void import('./proceduralContainersEngine').catch(() => undefined);
        void LazyCriminalDashboardTrackingTab.preload();
        void LazyRecursiveProceduralCanvas.preload();
    },
    legal_codes: () => {
        void LazyLegalCodesTab.preload();
    },
};

export function prefetchCriminalDashboardTab(tab: CriminalDashboardTab): void {
    if (typeof window === 'undefined') return;
    tabPrefetchers[tab]?.();
}

export function prefetchCriminalTrialsTab(): void {
    prefetchCriminalDashboardTab('requests');
}

export function prefetchCriminalPartiesGrid(): void {
    if (typeof window === 'undefined') return;
    void criminalPartiesGridImport().catch(() => undefined);
}

export function prefetchCriminalJudicialDecisionsLedger(): void {
    if (typeof window === 'undefined') return;
    void judicialDecisionsLedgerImport().catch(() => undefined);
}

export function prefetchCriminalDashboardDefaultTab(): void {
    prefetchCriminalDashboardTab('requests');
}

/** سطوح قرارات/طلبات — تُسخَّن عند نية تبويب الطلبات */
export function prefetchCriminalRequestsDecisionSurfaces(): void {
    if (typeof window === 'undefined') return;
    tabPrefetchers.requests();
}

/** يثبّت الرأس + الأطراف فقط — تبويب الطلبات عند النية أو idle أطول. */
export function preloadCriminalDashboardShellSurfaces(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalDashboardHeader.preload();
    void LazyCriminalPartiesGrid.preload();
}

/** تسخين ثانوي — تبويبات غير الطلبات بعد idle. */
export function preloadCriminalDashboardSecondaryShellSurfaces(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalDashboardStatementsTab.preload();
    void LazyCriminalDashboardTrackingTab.preload();
    void LazyLegalCodesTab.preload();
    void LazyStatementsPhaseSections.preload();
    void LazyRecursiveProceduralCanvas.preload();
}

/** تبويب الطلبات — نية التبويب أو idle أطول من قشرة الرأس/الأطراف. */
export function preloadCriminalDashboardRequestsTabSurface(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalDashboardRequestsTab.preload();
}
