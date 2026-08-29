import type { ExecutionDashboardProps } from '../../types';
import type { ExecutionDashboardCoreBootPipelineValue } from './executionDashboardCoreBootPipelineTypes';
import {
    buildExecutionDashboardCoreFollowupDebtorPipelineInput,
    buildExecutionDashboardCoreWorkspacePipelineInput,
} from './buildExecutionDashboardCorePipelinesChainInputs';
import { useExecutionDashboardCoreWorkspacePipeline } from './useExecutionDashboardCoreWorkspacePipeline';
import { useExecutionDashboardCoreFileMetadataBinding } from './useExecutionDashboardCoreFileMetadataBinding';
import { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import { useExecutionDashboardCoreClaimGracePersistSegment } from './useExecutionDashboardCoreClaimGracePersistSegment';

export function useExecutionDashboardCorePipelinesChain({
    boot,
    file,
    executionId,
    onUpdate,
}: {
    boot: ExecutionDashboardCoreBootPipelineValue;
    file: ExecutionDashboardProps['file'];
    executionId: string | undefined;
    onUpdate: ExecutionDashboardProps['onUpdate'];
}) {
    const {
        executionData,
        parentExecutionFile,
        viewExecutionData,
        executionDataRef,
        decisionsStorageExecutionId,
        dossierFileKey,
        executionFileKey,
        setDebtorSummonsMarkerLocal,
        setShowExtraCreditors,
        setShowExtraDebtors,
        setShowDecisionsModal,
        showDecisionsModal,
    } = boot;

    const workspacePipeline = useExecutionDashboardCoreWorkspacePipeline(
        buildExecutionDashboardCoreWorkspacePipelineInput({ boot, executionId }),
    );

    const {
        followupOrchestrator,
        activeCoerciveActions,
        activeTimelineEvents,
        decisionsReloadEpoch,
        showToast,
        gracePeriodEnded,
        setShowStatuteWarning,
    } = workspacePipeline;

    const fileMetadataBinding = useExecutionDashboardCoreFileMetadataBinding({
        executionData,
        viewExecutionData,
        parentExecutionFile,
        followupOrchestrator,
        activeCoerciveActions,
        activeTimelineEvents,
    });
    const { claimType, creditors, debtors } = fileMetadataBinding;

    const followupDebtor = useExecutionDashboardCoreFollowupDebtorPipeline(
        buildExecutionDashboardCoreFollowupDebtorPipelineInput({
            executionData,
            viewExecutionData,
            executionId,
            decisionsStorageExecutionId,
            decisionsReloadEpoch: Number(decisionsReloadEpoch ?? 0),
            claimType,
            creditors,
            debtors,
            showToast,
            dossierFileKey,
            executionFileKey,
            setShowDecisionsModal,
            showDecisionsModal,
            setShowExtraCreditors,
            setShowExtraDebtors,
            setDebtorSummonsMarkerLocal,
            workspacePipeline,
        }),
    );

    const {
        claimFinancialLedger,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
    } = useExecutionDashboardCoreClaimGracePersistSegment({
        boot,
        file,
        executionId,
        onUpdate,
        executionData,
        viewExecutionData,
        executionDataRef,
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        showToast,
        gracePeriodEnded,
        setShowStatuteWarning,
    });

    return {
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        claimFinancialLedger,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
    };
}
