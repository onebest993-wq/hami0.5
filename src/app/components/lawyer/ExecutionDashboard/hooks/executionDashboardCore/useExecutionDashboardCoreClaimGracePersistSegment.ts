/** Claim ledger → grace/eviction → persist handler segment for core pipelines chain */
import type { ExecutionFile } from '@/app/types/execution';
import { createDefaultFollowupSpecializationFlags } from '@/app/utils/followupSpecializationVisibility';
import { resolveFollowupFlagsFromExecution } from '@/app/utils/executionDomainIsolation';
import { useExecutionDashboardCoreClaimGraceEarnerFollowup } from './useExecutionDashboardCoreClaimGraceEarnerFollowup';
import { useExecutionDashboardCoreClaimGracePersistHandlerSlice } from './useExecutionDashboardCoreClaimGracePersistHandlerSlice';
import { useExecutionDashboardCoreClaimGracePersistPipelines } from './useExecutionDashboardCoreClaimGracePersistPipelines';

export type { ExecutionDashboardCoreClaimGracePersistSegmentParams } from './useExecutionDashboardCoreClaimGracePersistSegment.types';
import type { ExecutionDashboardCoreClaimGracePersistSegmentParams } from './useExecutionDashboardCoreClaimGracePersistSegment.types';

export function useExecutionDashboardCoreClaimGracePersistSegment(
    p: ExecutionDashboardCoreClaimGracePersistSegmentParams,
) {
    const {
        executionData,
        executionId,
        workspacePipeline,
        followupDebtor,
        showToast,
        gracePeriodEnded,
    } = p;

    const followupSpecializationResolved =
        followupDebtor.followupSpecialization ??
        resolveFollowupFlagsFromExecution(
            executionData as Record<string, unknown> | null | undefined,
            executionId,
        ) ??
        createDefaultFollowupSpecializationFlags();

    const followupSpecializationEffectiveResolved =
        followupDebtor.followupSpecializationEffective ?? followupSpecializationResolved;

    const pipelines = useExecutionDashboardCoreClaimGracePersistPipelines(
        p,
        followupSpecializationResolved,
        followupSpecializationEffectiveResolved,
    );

    const {
        claimFinancialLedger,
        graceMasterPipeline,
        executionExtras,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        hideCoerciveTabsForDebtorAgent,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        followupTabsRestricted,
        followupModalSpecializationEffective,
        isSolidaryLiability,
        allDebtorsUnified,
        modalPersonalTabLockedForEmployee,
        modalShowEmployeeAssignmentCoerciveBlock,
        daysSinceNoticeCalculated,
        remaining,
    } = pipelines;

    const { claimFinancialLedgerMerged, financialStatus } =
        useExecutionDashboardCoreClaimGraceEarnerFollowup({
            claimFinancialLedger,
            graceMasterPipeline,
            workspacePipeline,
            followupSpecializationResolved,
            followupSpecializationEffectiveResolved,
            followupModalSpecializationEffective,
            followupTabsRestricted,
            hideCoerciveTabsForDebtorAgent,
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            viewExecutionData: p.viewExecutionData,
            remainingBalanceForSeizure,
            settlementGuarantorGate,
            seizureMatrix,
            isSolidaryLiability,
            allDebtorsUnified,
            modalPersonalTabLockedForEmployee,
            modalShowEmployeeAssignmentCoerciveBlock,
            showToast,
            gracePeriodEnded,
            remaining,
            daysSinceNoticeCalculated,
        });

    const persistHandlerPipeline = useExecutionDashboardCoreClaimGracePersistHandlerSlice({
        p,
        claimFinancialLedger,
        graceMasterPipeline,
        daysSinceNoticeCalculated,
        executionExtras,
    });

    const specificDeliveryConvertedAmount =
        (executionData as { specificDeliveryConvertedAmount?: number | null } | null | undefined)
            ?.specificDeliveryConvertedAmount ?? null;
    const specificDeliveryFinancialized = Boolean(
        (executionData as { specificDeliveryFinancialized?: boolean } | null | undefined)
            ?.specificDeliveryFinancialized,
    );

    return {
        claimFinancialLedger: claimFinancialLedgerMerged,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
    };
}
