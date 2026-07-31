import React, { Suspense } from 'react';
import type { OtherEvidenceItem, Statement } from './criminalStore';
import type { TrialDeposition, UpdateTrialDepositionPatch } from './trialDepositionsEngine';
import { LazyStatementsPhaseSections, LazyTrialDepositionWitnessCard } from './criminalDashboardLazyRegistry';
import {
    useCriminalDashboardStatementsTabData,
    type UseCriminalDashboardStatementsTabDataParams,
} from './useCriminalDashboardStatementsTabData';

type CriminalDashboardStatementsTabProps = UseCriminalDashboardStatementsTabDataParams & {
    isEffectiveTrialCourtStage: boolean;
    isStatementsTabReadOnly: boolean;
    id: string;
    showLegalToast: (message: string, duration?: number) => void;
    updateTrialDeposition: (
        caseId: string,
        depositionId: string,
        patch: UpdateTrialDepositionPatch,
    ) => string | null | void;
    deleteTrialDeposition: (caseId: string, depositionId: string) => string | null | void;
    setEditingTrialDeposition: (deposition: TrialDeposition) => void;
    setIsTrialDepositionModalOpen: (open: boolean) => void;
    renderStatementCard: (statement: Statement) => React.ReactNode;
    renderOtherEvidenceCard: (item: OtherEvidenceItem) => React.ReactNode;
};

export function CriminalDashboardStatementsTab(props: CriminalDashboardStatementsTabProps) {
    const {
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
        isEffectiveTrialCourtStage,
        isStatementsTabReadOnly,
        id,
        showLegalToast,
        updateTrialDeposition,
        deleteTrialDeposition,
        setEditingTrialDeposition,
        setIsTrialDepositionModalOpen,
        renderStatementCard,
        renderOtherEvidenceCard,
    } = props;

    const {
        sortedStatementsForNode,
        sortedOtherEvidenceForNode,
        sortedTrialDepositions,
        partitionedStatements,
    } = useCriminalDashboardStatementsTabData({
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
    });

    return (
        <>
            {sortedOtherEvidenceForNode.length > 0 ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-white/80 font-black text-sm">أدلة الإثبات الأخرى</div>
                        <div className="text-white/45 text-[11px] font-bold">
                            {sortedOtherEvidenceForNode.length} دليل
                        </div>
                    </div>
                    <div className="space-y-3">
                        {sortedOtherEvidenceForNode.map(renderOtherEvidenceCard)}
                    </div>
                </div>
            ) : null}

            {isEffectiveTrialCourtStage ? (
                <Suspense fallback={null}>
                    <LazyStatementsPhaseSections
                        trialStatements={partitionedStatements.trial}
                        investigationStatements={partitionedStatements.investigation}
                        trialDepositions={sortedTrialDepositions}
                        renderTrialDeposition={(dep) => (
                            <Suspense fallback={null} key={dep.id}>
                                <LazyTrialDepositionWitnessCard
                                    deposition={dep}
                                    investigationStatements={partitionedStatements.investigation}
                                    trialStatements={partitionedStatements.trial}
                                    allTrialDepositions={sortedTrialDepositions}
                                    readOnly={isStatementsTabReadOnly}
                                    onUpdate={(patch) => {
                                        const err = updateTrialDeposition(id, dep.id, patch);
                                        if (err) {
                                            showLegalToast(err, 4500);
                                        }
                                    }}
                                    onEdit={
                                        isStatementsTabReadOnly
                                            ? undefined
                                            : () => {
                                                  setEditingTrialDeposition(dep);
                                                  setIsTrialDepositionModalOpen(true);
                                              }
                                    }
                                    onDelete={
                                        isStatementsTabReadOnly
                                            ? undefined
                                            : () => {
                                                  const err = deleteTrialDeposition(id, dep.id);
                                                  if (err) {
                                                      showLegalToast(err, 4500);
                                                  }
                                              }
                                    }
                                />
                            </Suspense>
                        )}
                        renderStatement={renderStatementCard}
                    />
                </Suspense>
            ) : sortedStatementsForNode.length === 0 ? null : (
                <div className="space-y-4">{sortedStatementsForNode.map(renderStatementCard)}</div>
            )}
        </>
    );
}
