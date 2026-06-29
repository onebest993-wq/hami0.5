import type { ReactNode } from 'react';
import {
    appealPipelineRowForCard,
    appealWindowsForDecision,
    buildAppealProceedingsForDecision,
    cassationButtonTitles,
    deriveDecisionHubStatus,
    isCreditorRequestFlowContinues,
    isExecutorRequestAppealCycleSuperseded,
    resolveCreditorRequestAppealGate,
    resolveEffectiveAwaitingCassationParty,
} from '../../utils';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { decisionHasAppealActivity } from './decisionAppealActivity';

type BuildDecisionCardAppealDerivedParams = {
    decision: Decision;
    decisions: Decision[];
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    buildDecisionCardStatus: (
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[],
    ) => { statusPillEl: ReactNode };
};

export function deriveDecisionCardAppealContext({
    decision,
    decisions,
    appealPerspective,
    requestNeedsExecutorOutcome,
    buildDecisionCardStatus,
}: BuildDecisionCardAppealDerivedParams) {
    const isManualLedgerCard = decision.manualExecutorLedgerEntry === true;
    const hubStatus = deriveDecisionHubStatus(decision, requestNeedsExecutorOutcome);
    const showExecutorPendingFooter =
        !isManualLedgerCard && hubStatus === 'pending';
    const windows = appealWindowsForDecision(decision);
    const appealWindowClosed = !windows.canTamyeez;
    const appealBusyOnCopy = Boolean(decision.activeAppealCopyId);
    const canManageAppealHere = true;
    const hasAppealActivity = decisionHasAppealActivity(decision);
    const hasActiveAppeal = hasAppealActivity || Boolean(decision.activeAppealCopyId);
    const cassTips = cassationButtonTitles(decision, appealPerspective);
    const { statusPillEl } = buildDecisionCardStatus(decision, appealWindowClosed, decisions);
    const pipelineRow = appealPipelineRowForCard(decision, decisions);
    const appealProceedings = buildAppealProceedingsForDecision(pipelineRow, appealPerspective);
    const showRegisteredAppealPathLine = appealProceedings.length > 0;
    const requestAppealGate = resolveCreditorRequestAppealGate(
        decision,
        pipelineRow,
        appealPerspective,
    );
    const requestFlowContinues = isCreditorRequestFlowContinues(
        decision,
        pipelineRow,
        appealPerspective,
    );
    const appealCycleSealed = isExecutorRequestAppealCycleSuperseded(
        decision,
        decisions,
        appealPerspective,
    );
    const legacyAppealActionsVisible =
        !isManualLedgerCard &&
        requestAppealGate.kind === 'continue' &&
        !appealBusyOnCopy;
    const awaitingCreditorCassationEntry =
        appealPerspective === 'debtor_agent' &&
        requestAppealGate.kind === 'paused' &&
        resolveEffectiveAwaitingCassationParty(pipelineRow, decision) === 'lawyer' &&
        pipelineRow.appealStatus !== 'tamyeez_filed' &&
        pipelineRow.appealPhase !== 'cassation';

    return {
        isManualLedgerCard,
        showExecutorPendingFooter,
        windows,
        appealWindowClosed,
        appealBusyOnCopy,
        canManageAppealHere,
        hasActiveAppeal,
        cassTips,
        statusPillEl,
        pipelineRow,
        showRegisteredAppealPathLine,
        requestAppealGate,
        requestFlowContinues,
        appealCycleSealed,
        legacyAppealActionsVisible,
        awaitingCreditorCassationEntry,
    };
}
