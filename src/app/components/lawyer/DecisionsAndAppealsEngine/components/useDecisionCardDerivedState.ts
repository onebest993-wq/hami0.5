import { useState } from 'react';
import type { DecisionCardProps } from './decisionCardTypes';
import { deriveDecisionCardPresentation } from './decisionCardDerived/decisionCardPresentationDerived';
import { deriveDecisionCardAppealContext } from './decisionCardDerived/decisionCardAppealDerived';
import { deriveDecisionCardHeirsContext } from './decisionCardDerived/decisionCardHeirsDerived';
import { deriveDecisionCardFollowupShortcuts } from './decisionCardDerived/decisionCardFollowupDerived';
import { deriveDecisionCardEnforcementSurface } from './decisionCardDerived/decisionCardEnforcementDerived';

type UseDecisionCardDerivedStateArgs = Pick<
    DecisionCardProps,
    | 'decision'
    | 'decisions'
    | 'decisionsHubTab'
    | 'dispatcherHub'
    | 'requestNeedsExecutorOutcome'
    | 'buildDecisionCardStatus'
    | 'appealPerspective'
>;

export function useDecisionCardDerivedState({
    decision,
    decisions,
    decisionsHubTab,
    dispatcherHub,
    requestNeedsExecutorOutcome,
    buildDecisionCardStatus,
    appealPerspective = 'creditor_agent',
}: UseDecisionCardDerivedStateArgs) {
    const presentation = deriveDecisionCardPresentation(decision, dispatcherHub);
    const appeal = deriveDecisionCardAppealContext({
        decision,
        decisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
    });
    const heirs = deriveDecisionCardHeirsContext(decision, decisions, requestNeedsExecutorOutcome);
    const followup = deriveDecisionCardFollowupShortcuts({
        decision,
        decisions,
        decisionsHubTab,
        dispatcherHub,
        appealPerspective,
        requestNeedsExecutorOutcome,
        requestFlowContinues: appeal.requestFlowContinues,
    });
    const enforcement = deriveDecisionCardEnforcementSurface({
        decision,
        decisions,
        decisionsHubTab,
        appealPerspective,
        requestNeedsExecutorOutcome,
        appeal,
    });
    const [showReasoning, setShowReasoning] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    return {
        ...presentation,
        ...appeal,
        ...heirs,
        evictionScheduleReady: followup.evictionScheduleReady,
        evictionGraceReady: followup.evictionGraceReady,
        evictionPoliceReady: followup.evictionPoliceReady,
        trustDisburseShortcutReady: followup.trustDisburseShortcutReady,
        guarantorShortcutReady: followup.guarantorShortcutReady,
        showCreditorFollowupActions: followup.showCreditorFollowupActions,
        personalStatusCourtCoerciveBlocked: followup.personalStatusCourtCoerciveBlocked,
        ...enforcement,
        showReasoning,
        setShowReasoning,
        showDetails,
        setShowDetails,
        deleteConfirmId,
        setDeleteConfirmId,
    };
}
