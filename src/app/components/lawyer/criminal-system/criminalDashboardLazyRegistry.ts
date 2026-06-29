// @ts-nocheck
/**
 * Lazy registry للإضبارة الجزائية — tabs + panels + prefetch بالنية.
 * لا static import للـ tab panels الثقيلة في CriminalDashboard shell.
 */
import { lazy } from 'react';
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

export const LazyLegalCodesTab = lazy(legalCodesTabImport);
export const LazyRecursiveProceduralCanvas = lazy(recursiveProceduralCanvasImport);
export const LazyStatementsPhaseSections = lazy(statementsPhaseSectionsImport);
export const LazyTrialsTab = lazy(trialsTabImport);
export const LazyCriminalNewCase = lazy(criminalNewCaseImport);
export const LazyJudicialDecisionsLedger = lazy(judicialDecisionsLedgerImport);
export const LazyCriminalPartiesGrid = lazy(criminalPartiesGridImport);

export const LazyDecisionsCommandBar = lazy(decisionsCommandBarImport);
export const LazyDecisionsScopeFilterBar = lazy(decisionsScopeFilterBarImport);
export const LazyVerdictCardsPanel = lazy(verdictCardsPanelImport);
export const LazyLiveDetentionCard = lazy(liveDetentionCardImport);
export const LazyLiveArrestSummonCard = lazy(liveArrestSummonCardImport);
export const LazyTrialDepositionWitnessCard = lazy(trialDepositionWitnessCardImport);
export const LazyStatementHighlightedContent = lazy(statementHighlightedContentImport);

const tabPrefetchers: Record<CriminalDashboardTab, () => void> = {
    requests: () => {
        void decisionsCommandBarImport().catch(() => undefined);
        void decisionsScopeFilterBarImport().catch(() => undefined);
        void verdictCardsPanelImport().catch(() => undefined);
        void liveDetentionCardImport().catch(() => undefined);
        void liveArrestSummonCardImport().catch(() => undefined);
        void judicialDecisionsLedgerImport().catch(() => undefined);
        void trialsTabImport().catch(() => undefined);
    },
    statements: () => {
        void statementsPhaseSectionsImport().catch(() => undefined);
        void statementHighlightedContentImport().catch(() => undefined);
        void trialDepositionWitnessCardImport().catch(() => undefined);
    },
    tracking: () => {
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
