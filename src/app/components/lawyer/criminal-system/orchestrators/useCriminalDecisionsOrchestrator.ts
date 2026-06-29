import { useCallback, useEffect, useState } from 'react';
import type { CaseStage, JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalCaseStage } from '../criminalStore';
import { defaultDecisionsScopeForStage, type DecisionsScopeFilter } from '../casePhaseFilterEngine';
import type { DecisionsLedgerKindFilter } from '../judicialDecisionsLedgerEngine';
import type { JudicialCassationAppealModalVariant } from '../components/JudicialCassationAppealModal';
import type { CriminalDecisionsOrchestratorSlice } from './criminalOrchestratorSliceTypes';

const DECISIONS_PAGE_SIZE = 12;

export type UseCriminalDecisionsOrchestratorParams = {
    effectiveUiStage: CriminalCaseStage;
    caseId: string;
    selectedNodeFilter: string;
    selectedJourneyBranchId: string;
};

/** فلاتر سجل القرارات + مودالات الطعن */
export function useCriminalDecisionsOrchestrator({
    effectiveUiStage,
    caseId,
    selectedNodeFilter,
    selectedJourneyBranchId,
}: UseCriminalDecisionsOrchestratorParams): CriminalDecisionsOrchestratorSlice {
    const [decisionsScopeFilter, setDecisionsScopeFilter] = useState<DecisionsScopeFilter>(() =>
        defaultDecisionsScopeForStage(effectiveUiStage as CaseStage),
    );
    const [visibleLawyerRequestsCount, setVisibleLawyerRequestsCount] = useState(DECISIONS_PAGE_SIZE);
    const [visibleJudicialDecisionsCount, setVisibleJudicialDecisionsCount] =
        useState(DECISIONS_PAGE_SIZE);
    const [decisionsKindFilter, setDecisionsKindFilter] = useState<DecisionsLedgerKindFilter>('all');
    const [trialSessionAddModalOpen, setTrialSessionAddModalOpen] = useState(false);
    const [cassationAppealModal, setCassationAppealModal] = useState<{
        decision: JudicialDecision;
        variant: JudicialCassationAppealModalVariant;
    } | null>(null);
    const [cassationResultContext, setCassationResultContext] = useState<{
        decision: JudicialDecision;
        appeal: JudicialDecisionAppeal;
    } | null>(null);

    useEffect(() => {
        setVisibleLawyerRequestsCount(DECISIONS_PAGE_SIZE);
        setVisibleJudicialDecisionsCount(DECISIONS_PAGE_SIZE);
    }, [decisionsKindFilter, decisionsScopeFilter, selectedNodeFilter, selectedJourneyBranchId, caseId]);

    useEffect(() => {
        if (decisionsKindFilter !== 'trial_sessions') {
            setTrialSessionAddModalOpen(false);
        }
    }, [decisionsKindFilter]);

    const openAppealModal = useCallback(
        (decision: JudicialDecision, variant: JudicialCassationAppealModalVariant) => {
            setCassationAppealModal({ decision, variant });
        },
        [],
    );

    return {
        decisionsScopeFilter,
        setDecisionsScopeFilter,
        effectiveDecisionsScope: decisionsScopeFilter,
        visibleLawyerRequestsCount,
        setVisibleLawyerRequestsCount,
        visibleJudicialDecisionsCount,
        setVisibleJudicialDecisionsCount,
        decisionsKindFilter,
        setDecisionsKindFilter,
        trialSessionAddModalOpen,
        setTrialSessionAddModalOpen,
        cassationAppealModal,
        setCassationAppealModal,
        cassationResultContext,
        setCassationResultContext,
        openAppealModal,
        decisionsPageSize: DECISIONS_PAGE_SIZE,
    };
}
