import {
    useExecutionGuarantorDetailsModal,
    useExecutionSeizedAssetModalState,
    useExecutionSeizedPropertyStepEvents,
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

/** حجز الأصول — modals + أحداث الخطوات + كفيل */
export function useExecutionSeizureOrchestrator(
    input: UseExecutionSeizureOrchestratorInput,
): ExecutionSeizureOrchestratorSlice {
    const seizedAssetModals = useExecutionSeizedAssetModalState();

    useExecutionSeizedPropertyStepEvents({
        executionDataId: input.executionData?.id,
        executionId: input.executionId,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionDataRef: input.executionDataRef,
        focusSeizurePropertyInlineRef: input.focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef: input.focusSeizureMovableInlineRef,
        setSeizedPropertyStepEntityKind: seizedAssetModals.setSeizedPropertyStepEntityKind,
        setSeizedPropertyStepDecisionId: seizedAssetModals.setSeizedPropertyStepDecisionId,
        setSeizedPropertyStepPropertyId: seizedAssetModals.setSeizedPropertyStepPropertyId,
        setSeizedPropertyStepKind: seizedAssetModals.setSeizedPropertyStepKind,
        setSeizedPropertyExpertsNamesDraft: seizedAssetModals.setSeizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertReportDateDraft: seizedAssetModals.setSeizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertPriceDraft: seizedAssetModals.setSeizedPropertyExpertPriceDraft,
        setSeizedPropertyAuctionDateDraft: seizedAssetModals.setSeizedPropertyAuctionDateDraft,
        setSeizedPropertyBuyerNameDraft: seizedAssetModals.setSeizedPropertyBuyerNameDraft,
        setSeizedPropertyAwardAmountDraft: seizedAssetModals.setSeizedPropertyAwardAmountDraft,
        setSeizedPropertyStepNotesDraft: seizedAssetModals.setSeizedPropertyStepNotesDraft,
        setSeizedPropertyStepModalOpen: seizedAssetModals.setSeizedPropertyStepModalOpen,
    });

    const guarantor = useExecutionGuarantorDetailsModal({
        executionData: input.executionData,
        executionId: input.executionId,
    });

    return { ...seizedAssetModals, ...guarantor };
}
