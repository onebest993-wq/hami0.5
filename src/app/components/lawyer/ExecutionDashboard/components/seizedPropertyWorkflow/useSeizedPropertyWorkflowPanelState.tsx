import type { SeizedPropertyWorkflowPanelProps } from './seizedPropertyWorkflowTypes';
import { useSeizedAssetWorkflowPanelState } from '../seizedAssetWorkflow/useSeizedAssetWorkflowPanelState';

/** غلاف رفيع — المنطق في useSeizedAssetWorkflowPanelState(assetKind: 'property'). */
export function useSeizedPropertyWorkflowPanelState(props: SeizedPropertyWorkflowPanelProps) {
    return useSeizedAssetWorkflowPanelState({ assetKind: 'property', ...props });
}

export type SeizedPropertyWorkflowPanelState = ReturnType<
    typeof useSeizedPropertyWorkflowPanelState
>;
