import React, { Suspense } from 'react';
import type { DecisionsScopeFilter } from './casePhaseFilterEngine';
import type { DecisionsLedgerKindFilter } from './components/JudicialDecisionsLedger';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import {
    LazyDecisionsCommandBar,
    LazyDecisionsScopeFilterBar,
} from './criminalDashboardLazyRegistry';

export type CriminalDashboardRequestsTabFiltersProps = {
    decisionsKindFilter: DecisionsLedgerKindFilter;
    setDecisionsKindFilter: (value: DecisionsLedgerKindFilter) => void;
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
    showTrialsTab: boolean;
    trialSessionsTabLabel: string;
    switchDashboardTab: (tab: CriminalDashboardTab) => void;
    setTrialSessionAddModalOpen: (open: boolean) => void;
    openAdultJudicialDecisionModal: () => void;
    openJuvenileJudicialDecisionModal: () => void;
    openLawyerMotionModal: () => void;
    canCreateDecisionsOrRequests: boolean;
    decisionsScopeFilter: DecisionsScopeFilter;
    setDecisionsScopeFilter: (value: DecisionsScopeFilter) => void;
    decisionsScopeOptions: Array<{ value: DecisionsScopeFilter; label?: string }>;
};

export function CriminalDashboardRequestsTabFilters(props: CriminalDashboardRequestsTabFiltersProps) {
    const {
        decisionsKindFilter,
        setDecisionsKindFilter,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        showTrialsTab,
        trialSessionsTabLabel,
        switchDashboardTab,
        setTrialSessionAddModalOpen,
        openAdultJudicialDecisionModal,
        openJuvenileJudicialDecisionModal,
        openLawyerMotionModal,
        canCreateDecisionsOrRequests,
        decisionsScopeFilter,
        setDecisionsScopeFilter,
        decisionsScopeOptions,
    } = props;

    return (
        <div className="flex flex-col items-center gap-1 print:hidden">
            <Suspense fallback={null}>
                <LazyDecisionsCommandBar
                    activeFilter={decisionsKindFilter}
                    onFilterChange={setDecisionsKindFilter}
                    showInvestigationJudicialTabs={isInvestigationPhase}
                    partyMix={investigationDefendantsPartyMix}
                    showTrialSessionsFilter={showTrialsTab}
                    trialSessionsTabLabel={trialSessionsTabLabel}
                    onOpenTrialSessionModal={() => {
                        switchDashboardTab('requests');
                        setDecisionsKindFilter('trial_sessions');
                        setTrialSessionAddModalOpen(true);
                    }}
                    onOpenAdultJudicialDecisionModal={openAdultJudicialDecisionModal}
                    onOpenJuvenileJudicialDecisionModal={openJuvenileJudicialDecisionModal}
                    onOpenLawyerMotionModal={openLawyerMotionModal}
                    readOnly={!canCreateDecisionsOrRequests}
                />
            </Suspense>
            <Suspense fallback={null}>
                <LazyDecisionsScopeFilterBar
                    value={decisionsScopeFilter}
                    onChange={setDecisionsScopeFilter}
                    options={decisionsScopeOptions}
                />
            </Suspense>
        </div>
    );
}
