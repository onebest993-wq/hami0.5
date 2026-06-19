import type { TimelineEvent } from '@/app/types/execution';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';

export type DecisionsAppealsMutationsCoreParams = {
    executionId: string;
    decisions: Decision[];
    setDecisions: React.Dispatch<React.SetStateAction<Decision[]>>;
    persistDecisionsToStorage: (next: Decision[]) => void;
    appealPerspective: AppealUiPerspective;
    reloadFromStorage: () => void;
    onTimelineUpdate: (event: TimelineEvent) => void;
    getMilestoneTimelineSnapshot?: () => unknown;
    resolveDecision: (args: {
        row: Decision;
        resolution: 'approved' | 'rejected';
        executorNote?: string;
    }) => void;
    hubNoteById: Record<string, string>;
    setHubNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setDecisionsHubTab: React.Dispatch<
        React.SetStateAction<'current' | 'previous' | 'appeals' | 'archive'>
    >;
    goToAppealsWithScroll: (decisionId: string) => void;
    newTitle: string;
    newBody: string;
    newDate: string;
    resetAddDecisionForm: () => void;
    setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
};
