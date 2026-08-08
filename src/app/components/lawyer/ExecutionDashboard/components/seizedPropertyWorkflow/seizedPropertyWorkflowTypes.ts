import type { SeizedProperty } from '@/app/types/execution';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { PropertyInlineSaveContext } from '../../utils/propertySeizureInlinePersistence';

export type SeizedPropertyWorkflowPanelProps = {
    property: SeizedProperty;
    workflowStatus: string;
    decisionsStorageExecutionId: string;
    executionId?: string;
    executionDataId?: string;
    executionData?: Record<string, unknown> | null;
    decisions: Array<Record<string, unknown>>;
    properties: SeizedProperty[];
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    showToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
    onOpenAppeals?: (decisionId: string) => void;
    decisionsReloadEpoch?: number;
    appealPerspective?: AppealUiPerspective;
};

export type PropertyWorkflowStep2Lane = 'auction' | 'objection';

export type PropertyWorkflowStepNavRequest = {
    targetStepId: string;
    collapseStepId?: string;
    seq: number;
};
