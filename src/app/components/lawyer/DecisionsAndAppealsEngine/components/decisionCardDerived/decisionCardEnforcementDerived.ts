import {
    canArchiveExecutorDecisionCard,
    decisionCardSurfaceClasses,
    isExecutorDecisionAppealFinal,
    isExecutorSideAwaitingAppealEntry,
    resolveCreditorDecisionEnforcementState,
    resolveDebtorAgentRequestFateLine,
    resolveExecutorDecisionStatusFlag,
    shouldHideDebtorAgentFateLine,
} from '../../utils';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';
import type { deriveDecisionCardAppealContext } from './decisionCardAppealDerived';

type AppealContext = ReturnType<typeof deriveDecisionCardAppealContext>;

type DeriveDecisionCardEnforcementParams = {
    decision: Decision;
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    appeal: AppealContext;
};

export function deriveDecisionCardEnforcementSurface({
    decision,
    decisions,
    decisionsHubTab,
    appealPerspective,
    requestNeedsExecutorOutcome,
    appeal,
}: DeriveDecisionCardEnforcementParams) {
    const settled = !requestNeedsExecutorOutcome(decision);
    const appealLegallyFinal = isExecutorDecisionAppealFinal(decision, appeal.pipelineRow, {
        appealWindowClosed: appeal.appealWindowClosed,
        appealTrackActive: appeal.hasActiveAppeal && !appeal.appealWindowClosed,
    });
    const enforcementState = resolveCreditorDecisionEnforcementState(decision, appeal.pipelineRow, {
        hubTab: decisionsHubTab,
        appealLegallyFinal,
        needsExecutor: requestNeedsExecutorOutcome(decision),
        appealPerspective,
        allDecisions: decisions,
    });
    const isCassated =
        appeal.pipelineRow.appealResult === 'نقض القرار' &&
        appeal.pipelineRow.appealStatus === 'final' &&
        appeal.requestAppealGate.kind === 'lifecycle_reset';
    const manualExecutorStatusFlag = appeal.isManualLedgerCard
        ? resolveExecutorDecisionStatusFlag(decision)
        : null;
    const cardClassName = `${decisionCardSurfaceClasses(enforcementState.visual, decisionsHubTab)}${
        manualExecutorStatusFlag === 3 ? ' opacity-50' : ''
    }`;
    const hideDebtorFateLine = shouldHideDebtorAgentFateLine(
        enforcementState.pillLabel,
        appeal.requestAppealGate,
    );
    const debtorFateLine =
        appealPerspective === 'debtor_agent' && settled && !hideDebtorFateLine
            ? resolveDebtorAgentRequestFateLine(enforcementState, appeal.requestAppealGate)
            : null;
    const canArchive = canArchiveExecutorDecisionCard(decision, appeal.pipelineRow, {
        hubTab: decisionsHubTab === 'previous' ? 'previous' : 'current',
        settled,
        appealLegallyFinal,
    });
    const executorAppealEntryOpen = isExecutorSideAwaitingAppealEntry(decision, appeal.pipelineRow);

    return {
        settled,
        appealLegallyFinal,
        enforcementState,
        isCassated,
        manualExecutorStatusFlag,
        cardClassName,
        hideDebtorFateLine,
        debtorFateLine,
        canArchive,
        executorAppealEntryOpen,
    };
}
