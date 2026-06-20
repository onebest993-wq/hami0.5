import type React from 'react';
import type { AppealUiPerspective } from '../../appealUiLabels';
import type { Decision } from '../../types';
import type { AppealDeadlineWindows } from '../../utils';

export type UseDecisionsAppealsAppealRenderersArgs = {
    appealPerspective: AppealUiPerspective;
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    setAppealDetailDecision: (d: Decision | null) => void;
    setDecisionsHubTab: (tab: 'current' | 'previous' | 'appeals' | 'archive') => void;
    goToAppealsWithScroll: (id: string) => void;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    getAppealStatus: (d: Decision) => AppealDeadlineWindows;
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        title: string,
        timelineMsg: string,
        toastTone?: 'amber' | 'emerald' | 'rose'
    ) => void;
    commitExecutorSideAppealEntry: (
        decision: Decision,
        stage: 'grievance' | 'cassation',
        appellants: import('../../utils').ManualAppealAppellantActor[]
    ) => void;
    applyWaiveInitialAppeal: (decision: Decision) => void;
    applyCassationCourtDecision: (
        decision: Decision,
        outcome: 'rad_laheeza' | 'naqd'
    ) => void;
    applyGrievanceCourtOutcome: (
        decision: Decision,
        granted: boolean,
        opts?: { skipHubTabSwitch?: boolean }
    ) => void;
    applyWaiveCassationAfterDebtorGrievance: (decision: Decision) => void;
    patchDecisionRow: (decisionId: string, patch: Partial<Decision>) => void;
    logAppealTimeline: (title: string, description?: string) => void;
    tamyeezNumberDraftById: Record<string, string>;
    setTamyeezNumberDraftById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    tamyeezEditOpenById: Record<string, boolean>;
    setTamyeezEditOpenById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};
