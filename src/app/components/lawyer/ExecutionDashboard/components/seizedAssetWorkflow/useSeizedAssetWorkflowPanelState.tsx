import {
    type UseSeizedAssetWorkflowPanelStateInput,
} from './panelState/seizedAssetWorkflowPanelStateTypes';
import { useSeizedAssetWorkflowFoundation } from './panelState/useSeizedAssetWorkflowFoundation';
import { useSeizedAssetWorkflowHandlers } from './panelState/useSeizedAssetWorkflowHandlers';
import { useSeizedAssetWorkflowSteps } from './panelState/useSeizedAssetWorkflowSteps';

export type { UseSeizedAssetWorkflowPanelStateInput } from './panelState/seizedAssetWorkflowPanelStateTypes';

/**
 * نواة موحّدة لحالة لوحة دورة الحجز (منقول/عقار).
 * الأغلفة العامة تبقى useSeizedMovable/PropertyWorkflowPanelState.
 * Domain logic lives under panelState/.
 */
export function useSeizedAssetWorkflowPanelState(input: UseSeizedAssetWorkflowPanelStateInput) {
    const foundation = useSeizedAssetWorkflowFoundation(input);
    const handlers = useSeizedAssetWorkflowHandlers(foundation);
    const { steps } = useSeizedAssetWorkflowSteps(foundation, handlers);

    return {
        workflowExpanded: foundation.workflowExpanded,
        setWorkflowExpanded: foundation.setWorkflowExpanded,
        relevantPendingRows: foundation.relevantPendingRows,
        steps,
        stepNavRequest: foundation.stepNavRequest,
    };
}

export type SeizedAssetWorkflowPanelState = ReturnType<typeof useSeizedAssetWorkflowPanelState>;
