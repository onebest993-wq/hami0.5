import { useMemo } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, LawyerRequest } from './criminalStore';
import type { JudicialDecision } from '@/app/types/criminal';
import type { JourneyNode } from '@/app/types/criminal';
import type { JourneyBranchTrack } from './stageJourney';
import { mergeJudicialDecisionsFromRequests } from './judicialDecisionsEngine';
import { sortJudicialDecisionsNewestFirst } from './judicialDecisionAppealLiteCore';
import {
    buildDecisionsScopeFilterOptions,
    filterByDecisionsScope,
    filterTrialSessionsByDecisionsScope,
    type DecisionsScopeFilter,
} from './casePhaseFilterEngine';
import { applyDecisionsLedgerKindFilter, type DecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import {
    eventBelongsToJourneyBranchLite,
    eventBelongsToJourneyNodeLite,
    getIdentifiedDefendantsLite,
    resolveInvestigationDefendantsPartyMixLite,
} from './criminalRequestsTabLitePrimitives';
import { isLawyerRequestPending } from './lawyerRequestStatusMachine';
import { resolveCassationRemandRetrialPivotDate } from './trialSessionsDisplay';
import type { TrialSession } from './trialSessionsDisplay';
import type { VerdictCard } from './verdictCardsEngine';

type UseCriminalDashboardRequestsTabDataParams = {
    requestsTabActive: boolean;
    criminalCase: CriminalCase;
    defendants: CriminalDefendant[];
    sortedLawyerRequestsForNode: LawyerRequest[];
    effectiveDecisionsScope: DecisionsScopeFilter;
    effectiveUiStage: CaseStage;
    stageJourney: JourneyNode[];
    trialSessions: TrialSession[];
    activeJourneyBranch: JourneyBranchTrack | null;
    isHistoricalNodeView: boolean;
    selectedJourneyNode: JourneyNode | null;
    decisionsKindFilter: DecisionsLedgerKindFilter;
    verdictCards: VerdictCard[];
    visibleLawyerRequestsCount: number;
    visibleJudicialDecisionsCount: number;
};

export function useCriminalDashboardRequestsTabData({
    requestsTabActive,
    criminalCase,
    defendants,
    sortedLawyerRequestsForNode,
    effectiveDecisionsScope,
    effectiveUiStage,
    stageJourney,
    trialSessions,
    activeJourneyBranch,
    isHistoricalNodeView,
    selectedJourneyNode,
    decisionsKindFilter,
    verdictCards,
    visibleLawyerRequestsCount,
    visibleJudicialDecisionsCount,
}: UseCriminalDashboardRequestsTabDataParams) {
    const resolvedFilterStage = effectiveUiStage;

    const investigationDefendantsPartyMix = useMemo(
        () => resolveInvestigationDefendantsPartyMixLite(getIdentifiedDefendantsLite(defendants)),
        [defendants],
    );

    const phaseFilteredLawyerRequests = useMemo(
        () =>
            requestsTabActive
                ? filterByDecisionsScope(
                      sortedLawyerRequestsForNode,
                      effectiveDecisionsScope,
                      resolvedFilterStage,
                      stageJourney,
                      (r) => ({ requestDate: r.requestDate, proceduralNodeId: r.proceduralNodeId }),
                  )
                : [],
        [requestsTabActive, sortedLawyerRequestsForNode, effectiveDecisionsScope, resolvedFilterStage, stageJourney],
    );

    const judicialDecisionsLedger = useMemo<JudicialDecision[]>(
        () =>
            requestsTabActive
                ? mergeJudicialDecisionsFromRequests(
                      (criminalCase as { judicialDecisions?: JudicialDecision[] })?.judicialDecisions,
                      criminalCase?.lawyerRequests,
                  )
                : [],
        [requestsTabActive, criminalCase],
    );

    const judicialDecisionsForNode = useMemo(() => {
        if (!requestsTabActive) return [];
        if (!selectedJourneyNode || !isHistoricalNodeView) return judicialDecisionsLedger;
        const nodeFiltered = judicialDecisionsLedger.filter((d) =>
            eventBelongsToJourneyNodeLite(
                String(d.issuedAt ?? ''),
                d.proceduralNodeId,
                selectedJourneyNode,
                stageJourney,
            ),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((d) =>
            eventBelongsToJourneyBranchLite(
                { proceduralNodeId: d.proceduralNodeId, defendantIds: d.defendantIds },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [requestsTabActive, activeJourneyBranch, isHistoricalNodeView, judicialDecisionsLedger, selectedJourneyNode, stageJourney]);

    const phaseScopedJudicialDecisions = useMemo(
        () =>
            requestsTabActive
                ? filterByDecisionsScope(
                      judicialDecisionsForNode,
                      effectiveDecisionsScope,
                      resolvedFilterStage,
                      stageJourney,
                      (d) => ({ issuedAt: d.issuedAt, proceduralNodeId: d.proceduralNodeId }),
                  )
                : [],
        [requestsTabActive, judicialDecisionsForNode, effectiveDecisionsScope, resolvedFilterStage, stageJourney],
    );

    const kindFilteredJudicialDecisions = useMemo(
        () =>
            requestsTabActive
                ? sortJudicialDecisionsNewestFirst(
                      applyDecisionsLedgerKindFilter(
                          phaseScopedJudicialDecisions,
                          decisionsKindFilter,
                          investigationDefendantsPartyMix,
                      ),
                  )
                : [],
        [requestsTabActive, phaseScopedJudicialDecisions, decisionsKindFilter, investigationDefendantsPartyMix],
    );

    const scopedPendingLawyerRequests = useMemo(
        () => phaseFilteredLawyerRequests.filter((r) => isLawyerRequestPending(r)),
        [phaseFilteredLawyerRequests],
    );

    const visibleLawyerRequests = useMemo(
        () => scopedPendingLawyerRequests.slice(0, visibleLawyerRequestsCount),
        [scopedPendingLawyerRequests, visibleLawyerRequestsCount],
    );

    const visibleJudicialDecisions = useMemo(
        () => kindFilteredJudicialDecisions.slice(0, visibleJudicialDecisionsCount),
        [kindFilteredJudicialDecisions, visibleJudicialDecisionsCount],
    );

    const phaseFilteredTrialSessions = useMemo(
        () =>
            requestsTabActive
                ? filterTrialSessionsByDecisionsScope(
                      trialSessions,
                      effectiveDecisionsScope,
                      resolvedFilterStage,
                      stageJourney,
                  )
                : [],
        [requestsTabActive, trialSessions, effectiveDecisionsScope, resolvedFilterStage, stageJourney],
    );

    const verdictCardsForNode = useMemo(() => {
        if (!requestsTabActive) return [];
        if (!selectedJourneyNode || !isHistoricalNodeView) return verdictCards;
        const nodeFiltered = verdictCards.filter((c) =>
            eventBelongsToJourneyNodeLite(c.issuedAt, c.proceduralNodeId, selectedJourneyNode, stageJourney),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((c) =>
            eventBelongsToJourneyBranchLite(
                {
                    proceduralNodeId: c.proceduralNodeId,
                    defendantIds: c.defendantIds,
                    targetDefendantId: c.defendantIds?.[0],
                },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [requestsTabActive, activeJourneyBranch, isHistoricalNodeView, selectedJourneyNode, stageJourney, verdictCards]);

    const phaseFilteredVerdictCards = useMemo(
        () =>
            requestsTabActive
                ? filterByDecisionsScope(
                      verdictCardsForNode,
                      effectiveDecisionsScope,
                      resolvedFilterStage,
                      stageJourney,
                      (c) => ({ issuedAt: c.issuedAt, proceduralNodeId: c.proceduralNodeId }),
                  )
                : [],
        [requestsTabActive, verdictCardsForNode, effectiveDecisionsScope, resolvedFilterStage, stageJourney],
    );

    const currentVerdictCardsForPanel = useMemo(() => {
        if (!requestsTabActive) return [];
        if (effectiveDecisionsScope !== 'current') return [];
        return phaseFilteredVerdictCards;
    }, [requestsTabActive, effectiveDecisionsScope, phaseFilteredVerdictCards]);

    const decisionsScopeOptions = useMemo(
        () =>
            requestsTabActive
                ? buildDecisionsScopeFilterOptions(
                      judicialDecisionsForNode,
                      sortedLawyerRequestsForNode,
                      stageJourney,
                      resolvedFilterStage,
                      trialSessions,
                      verdictCardsForNode,
                  )
                : [],
        [
            requestsTabActive,
            judicialDecisionsForNode,
            sortedLawyerRequestsForNode,
            stageJourney,
            resolvedFilterStage,
            trialSessions,
            verdictCardsForNode,
        ],
    );

    const remandPivotDate = useMemo(
        () => resolveCassationRemandRetrialPivotDate(verdictCards),
        [verdictCards],
    );

    return {
        investigationDefendantsPartyMix,
        phaseFilteredLawyerRequests,
        judicialDecisionsLedger,
        kindFilteredJudicialDecisions,
        pendingLawyerRequestsForFeed: scopedPendingLawyerRequests,
        visibleLawyerRequests,
        visibleJudicialDecisions,
        phaseFilteredTrialSessions,
        currentVerdictCardsForPanel,
        verdictCardsForNode,
        decisionsScopeOptions,
        remandPivotDate,
    };
}
