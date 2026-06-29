import type { TimelineEvent } from '@/app/types/execution';
import type { ExecutorDecisionsPersistOptions } from '@/app/utils/executionDecisionsNamespace';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';

export type DecisionsAppealsMutationsCoreParams = {
    executionId: string;
    decisions: Decision[];
    setDecisions: React.Dispatch<React.SetStateAction<Decision[]>>;
    persistDecisionsToStorage: (next: Decision[], opts?: ExecutorDecisionsPersistOptions) => Decision[] | null;
    appealPerspective: AppealUiPerspective;
    reloadFromStorage: () => void;
    getEffectiveExecutionData: () => Record<string, unknown> | null;
    resolveWritableExecutionId: () => string | null;
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
