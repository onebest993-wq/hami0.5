import type React from 'react';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';
import type { Decision } from '../types';
import type { DecisionCardProps } from '../components/decisionCardTypes';
import type { AppealUiPerspective } from '../appealUiLabels';
import type { useDecisionsAppealsAppealRenderers } from '../hooks/useDecisionsAppealsAppealRenderers';
import type { AppealWorkflowCardProps } from '../components/appealWorkflowCardTypes';

type AppealRenderers = ReturnType<typeof useDecisionsAppealsAppealRenderers>;

export type BuildDecisionsAppealsCardPropBundlesParams = {
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    dispatcherHub?: DecisionsDispatcherHubProps;
    executionId: string | undefined;
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    renderers: AppealRenderers;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (
        id: string,
        resolution: 'approved' | 'rejected',
        options?: import('../hooks/useDecisionsAppealsExecutorResolve').ExecutorResolveOptions,
    ) => void;
    goToAppealsWithScroll: (id: string) => void;
    canShowAppealInitialForDecision: (d: Decision) => boolean;
    patchDecisionRow: (decisionId: string, patch: Partial<Decision>) => void;
    logAppealTimeline: (title: string, description?: string) => void;
    handleDeleteDecision: (id: string) => void;
    handleArchiveDecision: (id: string) => void;
    setDecisionsHubTab: (tab: 'current' | 'previous' | 'appeals' | 'archive') => void;
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        timelineTitle?: string,
        timelineDescription?: string,
        tone?: 'emerald' | 'rose' | 'amber' | 'slate',
    ) => void;
};

export function buildDecisionsAppealsCardPropBundles({
    decisions,
    decisionsHubTab,
    dispatcherHub,
    executionId,
    appealPerspective,
    requestNeedsExecutorOutcome,
    renderers,
    hubNoteById,
    setHubNoteById,
    handleExecutorResolveById,
    goToAppealsWithScroll,
    canShowAppealInitialForDecision,
    patchDecisionRow,
    logAppealTimeline,
    handleDeleteDecision,
    handleArchiveDecision,
    setDecisionsHubTab,
    transitionAppealWorkflow,
}: BuildDecisionsAppealsCardPropBundlesParams): {
    decisionCardProps: Omit<DecisionCardProps, 'decision'>;
    appealWorkflowCardProps: Omit<AppealWorkflowCardProps, 'decision'>;
} {
    const {
        DECISION_BTN_PRIMARY_WFULL,
        DECISION_BTN_PRIMARY_FLEX,
        DECISION_BTN_SECONDARY_FLEX,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealDeadlineLapseActions,
        buildDecisionCardStatus,
    } = renderers;

    const decisionCardProps: Omit<DecisionCardProps, 'decision'> = {
        decisions,
        decisionsHubTab,
        dispatcherHub,
        executionId,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        hubNoteById,
        setHubNoteById,
        handleExecutorResolveById,
        goToAppealsWithScroll,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        patchDecisionRow,
        logAppealTimeline,
        btnPrimaryWFull: DECISION_BTN_PRIMARY_WFULL,
        btnPrimaryFlex: DECISION_BTN_PRIMARY_FLEX,
        btnSecondaryFlex: DECISION_BTN_SECONDARY_FLEX,
        onDeleteDecision: handleDeleteDecision,
        onArchiveDecision: handleArchiveDecision,
        onOpenArchiveTab: () => setDecisionsHubTab('archive'),
        renderAppealDeadlineLapseActions,
    };

    const appealWorkflowCardProps: Omit<AppealWorkflowCardProps, 'decision'> = {
        decisions,
        appealPerspective,
        requestNeedsExecutorOutcome,
        buildDecisionCardStatus,
        canShowAppealInitialForDecision,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealAwaitingCassationButtons,
        renderAppealDeadlineLapseActions,
        transitionAppealWorkflow,
    };

    return { decisionCardProps, appealWorkflowCardProps };
}
