import type React from 'react';
import type { Decision } from '../types';
import type { AppealDeadlineWindows, DecisionsAppealsAppealSlot } from '../utils';
import type { AppealUiPerspective } from '../appealUiLabels';
import { cassationButtonTitles } from '../utils';

export type AppealWorkflowCardProps = {
    decision: Decision;
    decisions: Decision[];
    appealCardRank?: number;
    appealCardsTotal?: number;
    appealPerspective?: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    buildDecisionCardStatus: (
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[],
    ) => { statusPillEl: React.ReactNode };
    canShowAppealInitialForDecision: (d: Decision) => boolean;
    renderAppealEntryButtons: (
        decision: Decision,
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean; lockedBecauseActiveCopy?: boolean },
    ) => React.ReactNode;
    renderAppealGrievanceDecideButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        windows?: AppealDeadlineWindows,
    ) => React.ReactNode;
    renderAppealTamyeezPhasePanel: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        cassTips: ReturnType<typeof cassationButtonTitles>,
        onCommitTamyeezNumber: (v: string) => void,
    ) => React.ReactNode;
    renderAppealAwaitingCassationButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        appealWindowClosed: boolean,
        canManageAppealHere: boolean,
    ) => React.ReactNode;
    renderAppealDeadlineLapseActions: (decision: Decision) => React.ReactNode;
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        timelineTitle?: string,
        timelineDescription?: string,
        tone?: 'emerald' | 'rose' | 'amber' | 'slate',
    ) => void;
};
