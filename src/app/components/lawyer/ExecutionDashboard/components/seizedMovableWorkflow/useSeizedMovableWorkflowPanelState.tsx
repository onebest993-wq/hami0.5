import type { SeizedMovableWorkflowPanelProps } from './seizedMovableWorkflowTypes';
import { useSeizedAssetWorkflowPanelState } from '../seizedAssetWorkflow/useSeizedAssetWorkflowPanelState';

/** غلاف رفيع — المنطق في useSeizedAssetWorkflowPanelState(assetKind: 'movable'). */
export function useSeizedMovableWorkflowPanelState(props: SeizedMovableWorkflowPanelProps) {
    return useSeizedAssetWorkflowPanelState({ assetKind: 'movable', ...props });
}

export type SeizedMovableWorkflowPanelState = ReturnType<typeof useSeizedMovableWorkflowPanelState>;
