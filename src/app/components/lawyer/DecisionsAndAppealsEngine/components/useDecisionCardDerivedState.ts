import { useState } from 'react';
import type { DecisionCardProps } from './decisionCardTypes';
import { deriveDecisionCardPresentation } from './decisionCardDerived/decisionCardPresentationDerived';
import { deriveDecisionCardAppealContext } from './decisionCardDerived/decisionCardAppealDerived';
import { deriveDecisionCardHeirsContext } from './decisionCardDerived/decisionCardHeirsDerived';
import { deriveDecisionCardFollowupShortcuts } from './decisionCardDerived/decisionCardFollowupDerived';
import { deriveDecisionCardEnforcementSurface } from './decisionCardDerived/decisionCardEnforcementDerived';
import { useDecisionCardSeizureCompletionAction } from './decisionCardDerived/useDecisionCardSeizureCompletionAction';

type UseDecisionCardDerivedStateArgs = Pick<
    DecisionCardProps,
    | 'decision'
    | 'decisions'
    | 'decisionsHubTab'
    | 'dispatcherHub'
    | 'executionId'
    | 'requestNeedsExecutorOutcome'
    | 'buildDecisionCardStatus'
    | 'appealPerspective'
>;

export function useDecisionCardDerivedState({
    decision,
    decisions,
    decisionsHubTab,
    dispatcherHub,
    executionId,
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
    const { seizureCompletionBusy, runSeizureCompletion } = useDecisionCardSeizureCompletionAction(
        decision,
        executionId,
        followup.seizureSubtype,
    );

    const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);
    const [showReasoning, setShowReasoning] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    return {
        ...presentation,
        ...appeal,
        ...heirs,
        seizureCompletionReady: followup.seizureCompletionReady,
        seizureCompletionLabel: followup.seizureCompletionLabel,
        seizureCompletionBusy,
        runSeizureCompletion,
        evictionScheduleReady: followup.evictionScheduleReady,
        evictionGraceReady: followup.evictionGraceReady,
        evictionPoliceReady: followup.evictionPoliceReady,
        trustDisburseShortcutReady: followup.trustDisburseShortcutReady,
        guarantorShortcutReady: followup.guarantorShortcutReady,
        showCreditorFollowupActions: followup.showCreditorFollowupActions,
        personalStatusCourtCoerciveBlocked: followup.personalStatusCourtCoerciveBlocked,
        ...enforcement,
        selectedAction,
        setSelectedAction,
        showReasoning,
        setShowReasoning,
        showDetails,
        setShowDetails,
        deleteConfirmId,
        setDeleteConfirmId,
    };
}
