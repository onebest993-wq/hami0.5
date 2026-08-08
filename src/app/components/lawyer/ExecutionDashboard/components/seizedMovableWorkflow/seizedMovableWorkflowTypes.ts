import type { SeizedMovable } from '@/app/types/execution';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { MovableInlineSaveContext } from '../../utils/movableSeizureInlinePersistence';

export type SeizedMovableWorkflowPanelProps = {
    movable: SeizedMovable;
    workflowStatus: string;
    decisionsStorageExecutionId: string;
    executionId?: string;
    executionDataId?: string;
    executionData?: Record<string, unknown> | null;
    decisions: Array<Record<string, unknown>>;
    movables: SeizedMovable[];
    movableInlineSaveCtx: MovableInlineSaveContext;
    showToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
    decisionsReloadEpoch?: number;
    appealPerspective?: AppealUiPerspective;
};

export type MovableWorkflowStep2Lane = 'auction' | 'objection';

export type MovableWorkflowStepNavRequest = {
    targetStepId: string;
    collapseStepId?: string;
    seq: number;
};
