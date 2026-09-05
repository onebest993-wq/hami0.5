import {
    useExecutionGuarantorDetailsModal,
    useExecutionSeizedAssetModalState,
} from '../hooks/useExecutionSeizedAssetModals';
import type { ExecutionOrchestratorCoreInput } from './executionOrchestratorTypes';
import type { ExecutionSeizureOrchestratorSlice } from './executionSeizureOrchestratorTypes';

export type UseExecutionSeizureOrchestratorInput = Pick<
    ExecutionOrchestratorCoreInput,
    | 'executionData'
    | 'executionId'
    | 'decisionsStorageExecutionId'
    | 'executionDataRef'
    | 'focusSeizurePropertyInlineRef'
    | 'focusSeizureMovableInlineRef'
>;

/** حجز الأصول — modals الطلب + كفيل (مسار الخطوات أُزيل). */
export function useExecutionSeizureOrchestrator(
    input: UseExecutionSeizureOrchestratorInput,
): ExecutionSeizureOrchestratorSlice {
    const seizedAssetModals = useExecutionSeizedAssetModalState();

    const guarantor = useExecutionGuarantorDetailsModal({
        executionData: input.executionData,
        executionId: input.executionId,
    });

    return { ...seizedAssetModals, ...guarantor };
}
