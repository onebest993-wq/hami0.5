import type React from 'react';
import type { DecisionsDispatcherHubProps } from '../engine/decisionsEngineTypes';
import type { Decision } from '../types';
import type {
    AppealDeadlineWindows,
    DecisionsAppealsAppealSlot,
    cassationButtonTitles,
} from '../utils';
import type { AppealUiPerspective } from '../appealUiLabels';

export type DecisionCardProps = {
    decision: Decision;
    decisions: Decision[];
    dispatcherHub?: DecisionsDispatcherHubProps;
    executionId: string | undefined;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    buildDecisionCardStatus: (
        decision: Decision,
        appealWindowClosed: boolean,
        allDecisions: Decision[]
    ) => { statusPillEl: React.ReactNode };
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleExecutorResolveById: (id: string, resolution: 'approved' | 'rejected') => void;
    goToAppealsWithScroll: (id: string) => void;
    canShowAppealInitialForDecision: (d: Decision) => boolean;
    renderAppealEntryButtons: (
        decision: Decision,
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean; lockedBecauseActiveCopy?: boolean }
    ) => React.ReactNode;
    renderAppealGrievanceDecideButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        windows?: AppealDeadlineWindows
    ) => React.ReactNode;
    renderAppealAwaitingCassationButtons: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        appealWindowClosed: boolean,
        canManageAppealHere: boolean
    ) => React.ReactNode;
    renderAppealTamyeezPhasePanel: (
        decision: Decision,
        slot: DecisionsAppealsAppealSlot,
        cassTips: ReturnType<typeof cassationButtonTitles>,
        onCommitTamyeezNumber: (v: string) => void
    ) => React.ReactNode;
    patchDecisionRow: (decisionId: string, patch: Partial<Decision>) => void;
    logAppealTimeline: (title: string, description?: string) => void;
    btnPrimaryWFull: string;
    btnPrimaryFlex: string;
    btnSecondaryFlex: string;
    onDeleteDecision: (id: string) => void;
    onArchiveDecision: (id: string) => void;
    onOpenArchiveTab?: () => void;
    renderAppealDeadlineLapseActions: (decision: Decision) => React.ReactNode;
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    appealPerspective?: AppealUiPerspective;
};
