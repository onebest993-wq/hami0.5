import type {
    useExecutionGuarantorDetailsModal,
    useExecutionSeizedAssetModalState,
} from '../hooks/useExecutionSeizedAssetModals';

export type ExecutionSeizureOrchestratorSlice = ReturnType<
    typeof useExecutionSeizedAssetModalState
> &
    ReturnType<typeof useExecutionGuarantorDetailsModal>;
