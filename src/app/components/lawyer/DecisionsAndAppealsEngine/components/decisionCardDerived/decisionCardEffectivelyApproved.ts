import {
    appealPipelineRowForCard,
    appealWindowsForDecision,
    isExecutorDecisionAppealFinal,
    resolveCreditorDecisionEnforcementState,
} from '../../utils';
import type { Decision } from '../../types';
import type { AppealUiPerspective } from '../../appealUiLabels';

export function isDecisionEffectivelyApproved(
    decision: Decision,
    decisions: Decision[],
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive',
    requestNeedsExecutorOutcome: (d: Decision) => boolean,
    appealPerspective: AppealUiPerspective,
): boolean {
    if (decision.executorOutcome === 'withdrawn' || decision.lawyerWithdrawn === true) return false;
    const pipeline = appealPipelineRowForCard(decision, decisions);
    const windowsForD = appealWindowsForDecision(decision);
    const appealWindowClosedForD = !windowsForD.canTamyeez;
    const appealLegallyFinalForD = isExecutorDecisionAppealFinal(decision, pipeline, {
        appealWindowClosed: appealWindowClosedForD,
        appealTrackActive: false,
    });
    const state = resolveCreditorDecisionEnforcementState(decision, pipeline, {
        hubTab: decisionsHubTab,
        appealLegallyFinal: appealLegallyFinalForD,
        needsExecutor: requestNeedsExecutorOutcome(decision),
        appealPerspective,
        allDecisions: decisions,
    });
    return state.enforced;
}
