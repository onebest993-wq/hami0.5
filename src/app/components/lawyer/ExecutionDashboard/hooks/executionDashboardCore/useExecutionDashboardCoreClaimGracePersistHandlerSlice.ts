import { openBreakInventoryCompletion, openJudicialCustodianCompletion } from '@/app/utils/executorApprovalWorkflow';
import { buildExecutionDashboardCorePersistHandlerPipelineInput } from './buildExecutionDashboardCorePipelinesChainInputs';
import { useExecutionDashboardCorePersistHandlerPipeline } from './useExecutionDashboardCorePersistHandlerPipeline';
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';
import type { ExecutionDashboardCoreClaimGracePersistSegmentParams } from './useExecutionDashboardCoreClaimGracePersistSegment';
import type { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import type { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './useExecutionDashboardCoreGraceMasterEvictionPipeline';
import type { ExecutionFile } from '@/app/types/execution';

export function useExecutionDashboardCoreClaimGracePersistHandlerSlice(args: {
    p: ExecutionDashboardCoreClaimGracePersistSegmentParams;
    claimFinancialLedger: ReturnType<typeof useExecutionDashboardCoreClaimFinancialLedgerPipeline>;
    graceMasterPipeline: ReturnType<typeof useExecutionDashboardCoreGraceMasterEvictionPipeline>;
    daysSinceNoticeCalculated: number;
    executionExtras: ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };
}) {
    const { p, claimFinancialLedger, graceMasterPipeline, daysSinceNoticeCalculated, executionExtras } = args;
    const {
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
        setShowStatuteWarning,
    } = p;

    const {
        currentFileId,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        debtorSummonsMarkerLocal,
        isUnifiedTabActive,
        unifiedTabId,
        setExecutionStorageTick,
        setShowDecisionsModal,
        showDecisionsModal,
        decisionsStorageExecutionId,
    } = boot;

    const { claimType, lawyerStartedPostNoticeExecution } = fileMetadataBinding;

    const {
        effectiveDebtors,
        activeWorkspaceDebtorForFollowup,
        effectiveFollowupDebtorEntry,
        debtorBrowserTabsMode,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        isRepresentingDebtor,
        activeDebtorNoticeScope,
        unifiedSummonsTargetDebtorKey,
    } = followupDebtor;

    const { decisionsReloadEpoch: decisionsReloadEpochRaw, showStatuteWarning } = workspacePipeline;
    const decisionsReloadEpoch = Number(decisionsReloadEpochRaw) || 0;

    const {
        isNonFinancialClaim,
        isMaritalFurnitureClaim,
        maritalFurnitureItemsForFollowup,
        isAlimonyClaim,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        isEvictionExecutionModule,
        monetaryExecutionStrictPathFlag,
        debtorNotifiedForEvictionGrace,
    } = claimFinancialLedger;

    const { statuteStatus, unifiedCollectionApproved } = graceMasterPipeline;

    return useExecutionDashboardCorePersistHandlerPipeline(
        buildExecutionDashboardCorePersistHandlerPipelineInput({
            executionData,
            executionId,
            claimType,
            isNonFinancialClaim,
            decisionsReloadEpoch,
            isEvictionExecutionModule,
            monetaryExecutionStrictPathFlag,
            isAlimonyClaim,
            executionExtras:
                executionExtras as unknown as ExecutionDashboardCorePersistHandlerPipelineInput['executionExtras'],
            activeDebtorIsDeceased,
            primaryDebtorKeyResolved,
            debtorNotifiedForEvictionGrace,
            daysSinceNoticeCalculated,
            showStatuteWarning,
            setShowStatuteWarning,
            statuteStatus,
            file,
            currentFileId,
            isMaritalFurnitureClaim,
            onUpdate,
            isHistoricalMode,
            activeSubFileId,
            parentDossierId,
            maritalFurnitureItemsForFollowup,
            effectiveDebtors,
            financialPrincipalAmount,
            financialLawyerFeesAmount,
            unifiedCollectionApproved,
            effectiveFollowupDebtorEntry,
            activeWorkspaceDebtorForFollowup,
            debtorBrowserTabsMode,
            lawyerStartedPostNoticeExecution,
            activeDebtorNoticeScope,
            debtorSummonsMarkerLocal,
            unifiedSummonsTargetDebtorKey,
            setShowDecisionsModal,
            showDecisionsModal,
            decisionsStorageExecutionId,
            openBreakInventoryCompletion:
                openBreakInventoryCompletion as unknown as ExecutionDashboardCorePersistHandlerPipelineInput['openBreakInventoryCompletion'],
            openJudicialCustodianCompletion:
                openJudicialCustodianCompletion as unknown as ExecutionDashboardCorePersistHandlerPipelineInput['openJudicialCustodianCompletion'],
            isUnifiedTabActive,
            unifiedTabId,
            executionDataRef,
            setExecutionStorageTick,
            viewExecutionData,
            workspacePipeline,
            graceMasterPipeline,
            isRepresentingDebtor,
            openFollowupModalPersisted: followupDebtor.openFollowupModalPersisted,
        }),
    );
}
