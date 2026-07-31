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
export const LazyTrialsTab = lazy(trialsTabImport);
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
export const LazyJudicialDecisionsLedger = lazy(judicialDecisionsLedgerImport);
export const LazyCriminalPartiesGrid = createPreloadableLazyComponent(criminalPartiesGridImport);

export const LazyDecisionsCommandBar = lazy(decisionsCommandBarImport);
export const LazyDecisionsScopeFilterBar = lazy(decisionsScopeFilterBarImport);
export const LazyVerdictCardsPanel = lazy(verdictCardsPanelImport);
export const LazyLiveDetentionCard = lazy(liveDetentionCardImport);
export const LazyLiveArrestSummonCard = lazy(liveArrestSummonCardImport);
export const LazyTrialDepositionWitnessCard = lazy(trialDepositionWitnessCardImport);
export const LazyStatementHighlightedContent = lazy(statementHighlightedContentImport);

/** محركات ثقيلة — فقط عند نية التبويب، لا من idle الـ store قبل أول فتح */
function prefetchCriminalHeavyEnginesOnTabIntent(): void {
    void import('./trialSessionsEngine').catch(() => undefined);
    void import('./cassationEngine').catch(() => undefined);
    void import('./proceduralContainersEngine').catch(() => undefined);
}

const tabPrefetchers: Record<CriminalDashboardTab, () => void> = {
    requests: () => {
        prefetchCriminalHeavyEnginesOnTabIntent();
        void criminalDashboardRequestsTabImport().catch(() => undefined);
        void decisionsCommandBarImport().catch(() => undefined);
        void decisionsScopeFilterBarImport().catch(() => undefined);
        void verdictCardsPanelImport().catch(() => undefined);
        void liveDetentionCardImport().catch(() => undefined);
        void liveArrestSummonCardImport().catch(() => undefined);
        void judicialDecisionsLedgerImport().catch(() => undefined);
        void trialsTabImport().catch(() => undefined);
    },
    statements: () => {
        void import('./trialSessionsEngine').catch(() => undefined);
        void criminalDashboardStatementsTabImport().catch(() => undefined);
        void statementsPhaseSectionsImport().catch(() => undefined);
        void statementHighlightedContentImport().catch(() => undefined);
        void trialDepositionWitnessCardImport().catch(() => undefined);
    },
    tracking: () => {
        void import('./proceduralContainersEngine').catch(() => undefined);
        void criminalDashboardTrackingTabImport().catch(() => undefined);
        void recursiveProceduralCanvasImport().catch(() => undefined);
    },
    legal_codes: () => {
        void legalCodesTabImport().catch(() => undefined);
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

export function prefetchCriminalLegalCodesTab(): void {
    prefetchCriminalDashboardTab('legal_codes');
}

export function prefetchCriminalProceduralCanvas(): void {
    prefetchCriminalDashboardTab('tracking');
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

/** يثبّت الرأس + الأطراف + التبويب الافتراضي فقط — باقي التبويبات عند النية/idle. */
export function preloadCriminalDashboardShellSurfaces(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalDashboardHeader.preload();
    void LazyCriminalPartiesGrid.preload();
    void LazyCriminalDashboardRequestsTab.preload();
}

/** تسخين ثانوي لبقية أسطح القشرة — بعد idle حتى لا تنافس أول رسم. */
export function preloadCriminalDashboardSecondaryShellSurfaces(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalDashboardStatementsTab.preload();
    void LazyCriminalDashboardTrackingTab.preload();
    void LazyLegalCodesTab.preload();
    void LazyStatementsPhaseSections.preload();
    void LazyRecursiveProceduralCanvas.preload();
}
