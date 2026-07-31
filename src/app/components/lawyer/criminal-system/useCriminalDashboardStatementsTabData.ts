import { useMemo } from 'react';
import type { CriminalDefendant, OtherEvidenceItem, Statement } from './criminalStore';
import { filterStatementsExcludingUnknown } from './criminalUnknownDefendant';
import { eventBelongsToJourneyBranch, eventBelongsToJourneyNode } from './stageJourneyRuntimeCore';
import { partitionStatementsByPhase } from './casePhaseFilterEngine';
import type { TrialDeposition } from './trialDepositionsEngine';
import { sortTrialDepositionsDesc } from './trialDepositionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import { sortTrialSessionsAsc } from './trialSessionsEngine';

export type UseCriminalDashboardStatementsTabDataParams = {
    statementsTabActive: boolean;
    statements: Statement[];
    otherEvidenceItems: OtherEvidenceItem[];
    defendants: CriminalDefendant[];
    trialDepositions: TrialDeposition[];
    trialSessions: TrialSession[];
    selectedJourneyNode: Parameters<typeof eventBelongsToJourneyNode>[2];
    isHistoricalNodeView: boolean;
    activeJourneyBranch: Parameters<typeof eventBelongsToJourneyBranch>[1];
    stageJourney: Parameters<typeof eventBelongsToJourneyNode>[3];
};

export function useCriminalDashboardStatementsTabData({
    statementsTabActive,
    statements,
    otherEvidenceItems,
    defendants,
    trialDepositions,
    trialSessions,
    selectedJourneyNode,
    isHistoricalNodeView,
    activeJourneyBranch,
    stageJourney,
}: UseCriminalDashboardStatementsTabDataParams) {
    const sortedStatements = useMemo(() => {
        if (!statementsTabActive) return [];
        const visible = filterStatementsExcludingUnknown(statements, defendants);
        const list = [...visible];
        list.sort((a, b) => {
            const aTime = typeof a.date === 'string' ? Date.parse(a.date) : 0;
            const bTime = typeof b.date === 'string' ? Date.parse(b.date) : 0;
            return bTime - aTime;
        });
        return list;
    }, [statementsTabActive, statements, defendants]);

    const sortedOtherEvidenceItems = useMemo(() => {
        if (!statementsTabActive) return [];
        const list = [...otherEvidenceItems];
        list.sort((a, b) => {
            const aKey = String(a.attachmentDate ?? a.createdAt ?? '').trim();
            const bKey = String(b.attachmentDate ?? b.createdAt ?? '').trim();
            const aTime = aKey ? Date.parse(aKey) : 0;
            const bTime = bKey ? Date.parse(bKey) : 0;
            return bTime - aTime;
        });
        return list;
    }, [statementsTabActive, otherEvidenceItems]);

    const sortedTrialDepositions = useMemo(
        () => (statementsTabActive ? sortTrialDepositionsDesc(trialDepositions) : []),
        [statementsTabActive, trialDepositions],
    );

    const sortedTrialSessionsForDepositions = useMemo(
        () => (statementsTabActive ? sortTrialSessionsAsc(trialSessions) : []),
        [statementsTabActive, trialSessions],
    );

    const sortedStatementsForNode = useMemo(() => {
        if (!statementsTabActive) return [];
        if (!selectedJourneyNode || !isHistoricalNodeView) return sortedStatements;
        const nodeFiltered = sortedStatements.filter((st) =>
            eventBelongsToJourneyNode(st.date, st.proceduralNodeId, selectedJourneyNode, stageJourney),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((st) =>
            eventBelongsToJourneyBranch(
                { proceduralNodeId: st.proceduralNodeId },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [statementsTabActive, activeJourneyBranch, isHistoricalNodeView, stageJourney, selectedJourneyNode, sortedStatements]);

    const sortedOtherEvidenceForNode = useMemo(() => {
        if (!statementsTabActive) return [];
        if (!selectedJourneyNode || !isHistoricalNodeView) return sortedOtherEvidenceItems;
        const nodeFiltered = sortedOtherEvidenceItems.filter((ev) =>
            eventBelongsToJourneyNode(
                String(ev.attachmentDate ?? ev.createdAt ?? ''),
                ev.proceduralNodeId,
                selectedJourneyNode,
                stageJourney,
            ),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((ev) =>
            eventBelongsToJourneyBranch(
                { proceduralNodeId: ev.proceduralNodeId },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [statementsTabActive, activeJourneyBranch, isHistoricalNodeView, selectedJourneyNode, sortedOtherEvidenceItems, stageJourney]);

    const partitionedStatements = useMemo(
        () =>
            statementsTabActive
                ? partitionStatementsByPhase(sortedStatementsForNode, stageJourney)
                : { investigation: [], trial: [] },
        [statementsTabActive, sortedStatementsForNode, stageJourney],
    );

    return {
        sortedStatementsForNode,
        sortedOtherEvidenceForNode,
        sortedTrialDepositions,
        sortedTrialSessionsForDepositions,
        partitionedStatements,
    };
}
