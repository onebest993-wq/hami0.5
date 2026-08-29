import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
    buildExecutionDashboardCoreGraceMasterEvictionPipelineInput,
} from './buildExecutionDashboardCorePipelinesChainInputs';
import {
    useExecutionDashboardCoreClaimFinancialLedgerPipeline,
    type ExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
} from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './useExecutionDashboardCoreGraceMasterEvictionPipeline';
import { buildRestrictedFollowupTabIds } from './executionDashboardFollowupSeizureTabs';
import { computeShowGuarantorInSeizureFollowupTab } from './executionDashboardFollowupSeizureTabs';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from './executionDashboardCoreGraceMasterEvictionPipelineInput';
import type { ExecutionDashboardCoreClaimGracePersistSegmentParams } from './useExecutionDashboardCoreClaimGracePersistSegment.types';
import { createDefaultFollowupSpecializationFlags } from '@/app/utils/followupSpecializationVisibility';

export function useExecutionDashboardCoreClaimGracePersistPipelines(
    p: ExecutionDashboardCoreClaimGracePersistSegmentParams,
    followupSpecializationResolved: ReturnType<typeof createDefaultFollowupSpecializationFlags>,
    followupSpecializationEffectiveResolved: ReturnType<typeof createDefaultFollowupSpecializationFlags>,
) {
    const {
        executionData,
        viewExecutionData,
        executionDataRef,
        executionId,
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        boot,
        showToast,
    } = p;

    const { isHistoricalMode, decisionsStorageExecutionId, executionFileKey, dossierLifecycleRow } =
        boot;

    const {
        claimType,
        debtors,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        evictionCaseExpensesSum,
        initiator,
        docType,
        classification,
        evictionPremisesUseResolved,
    } = fileMetadataBinding;

    const {
        effectiveDebtors,
        allDebtorsUnified,
        isSolidaryLiability,
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        allDebtorRowsForLiability,
        activeDebtorSolidary,
        activeWorkspaceDebtorForFollowup,
        effectiveFollowupDebtorEntry,
        debtorBrowserTabsMode,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        followupModalSpecialization,
        followupModalSpecializationEffective,
        followupSectionTabOrder,
        followupModalTabs,
        followupTabsRestricted,
        showPersonalCoerciveFollowupTab,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        personalTabLockedForEmployee,
        assignmentWorkspaceCtx,
        primaryDebtorKeyResolved,
        activeDebtorEntityKind,
        isRepresentingDebtor,
        hideCoerciveTabsForDebtorAgent,
        activeTimelineEventsDebtorScoped,
        clearThirdPartyFundsDraft,
        modalPersonalTabLockedForEmployee,
        modalShowEmployeeAssignmentCoerciveBlock,
    } = followupDebtor;

    const { decisionsReloadEpoch: decisionsReloadEpochRaw } = workspacePipeline;
    const decisionsReloadEpoch = Number(decisionsReloadEpochRaw) || 0;
    const executionFileKeyResolved = String(executionFileKey ?? '');

    const restrictedFollowupTabIdsPreEarner = useMemo(
        () =>
            buildRestrictedFollowupTabIds({
                specialization: followupSpecializationResolved,
                showPersonalCoerciveFollowupTab,
            }),
        [
            followupSpecializationResolved.hideFollowupCoerciveTab,
            followupSpecializationResolved.hideFollowupSeizureRequestsTab,
            followupSpecializationResolved.hidePersonalCoerciveFollowupTab,
            showPersonalCoerciveFollowupTab,
        ],
    );

    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };

    const claimFinancialLedger = useExecutionDashboardCoreClaimFinancialLedgerPipeline(
        buildExecutionDashboardCoreClaimFinancialLedgerPipelineInput({
            executionData,
            viewExecutionData,
            executionId,
            claimType,
            totalAmount,
            debtAmount,
            lawyerFeesAmount,
            executionFee,
            clientFeesAmount,
            courtFees,
            directorateFees,
            evictionCaseExpensesSum,
            liabilityGroupTabsMode,
            activeLiabilityGroup,
            allDebtorRowsForLiability,
            decisionsStorageExecutionId,
            executionFileKey: executionFileKeyResolved,
            decisionsReloadEpoch,
            showToast: showToast as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['showToast'],
            docType,
            classification,
            activeDebtorEntityKind,
            followupSpecialization:
                followupSpecializationResolved as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['followupSpecialization'],
            followupSectionTabOrder:
                followupSectionTabOrder as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['followupSectionTabOrder'],
            followupModalTabs:
                followupModalTabs as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['followupModalTabs'],
            followupTabsRestricted,
            restrictedFollowupTabIds:
                restrictedFollowupTabIdsPreEarner as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['restrictedFollowupTabIds'],
            hideFollowupCoerciveTab: followupSpecializationResolved.hideFollowupCoerciveTab,
            hideCoerciveTabsForDebtorAgent,
            showPersonalCoerciveFollowupTab,
            isSolidaryLiability,
            allDebtorsUnified,
            activeDebtorIsEmployee,
            activeDebtorIsDeceased,
            activeWorkspaceDebtorForFollowup,
            workspacePipeline: {
                ...workspacePipeline,
                effectiveDebtors,
                clearThirdPartyFundsDraft,
                executionDataRef,
                debtorBrowserTabsMode,
            },
            openFollowupModalPersisted: followupDebtor.openFollowupModalPersisted,
        }) as unknown as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
    );

    const {
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        isPersonalStatusExecutionClaim,
        isAlimonyClaim,
        isAlimonyClaimType,
        isEvictionExecutionModule,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        debtorNotifiedForEvictionGrace,
        monetaryStrictForSummoningEngine,
    } = claimFinancialLedger;

    const showGuarantorInSeizureFollowupTabPreEarner = useMemo(
        () =>
            computeShowGuarantorInSeizureFollowupTab({
                activeDebtorIsDeceased,
                activeDebtorIsEmployee,
                viewExecutionData,
                followupSpecialization: followupSpecializationResolved,
                remainingBalanceForSeizure,
                settlementGuarantorGate,
            }),
        [
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            viewExecutionData,
            followupSpecializationResolved,
            remainingBalanceForSeizure,
            settlementGuarantorGate,
        ],
    );

    const graceMasterPipeline = useExecutionDashboardCoreGraceMasterEvictionPipeline(
        buildExecutionDashboardCoreGraceMasterEvictionPipelineInput({
            executionData,
            executionId,
            debtors,
            effectiveDebtors,
            isEvictionExecutionModule,
            claimType,
            isAlimonyClaim,
            initiator,
            totalOwed,
            parsedCourtFees,
            financialPrincipalAmount,
            activeDebtorIsEmployee,
            followupSpecializationEffective:
                followupSpecializationEffectiveResolved as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupSpecializationEffective'],
            followupModalSpecialization:
                followupModalSpecialization as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecialization'],
            followupModalSpecializationEffective:
                followupModalSpecializationEffective as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecializationEffective'],
            followupModalDebtorIsEmployee,
            followupModalDebtorIsDeceased,
            decisionsReloadEpoch,
            isRepresentingDebtor,
            decisionsStorageExecutionId,
            followupSpecialization: followupSpecializationResolved,
            showPersonalCoerciveFollowupTab,
            showGuarantorInSeizureFollowupTab: showGuarantorInSeizureFollowupTabPreEarner,
            isPersonalStatusExecutionClaim,
            isAlimonyClaimType,
            custodyRemovalClaimActive,
            employeeCoerciveDetentionRestricted,
            remainingBalanceForSeizure,
            viewExecutionData,
            settlementGuarantorGate,
            activeDebtorIsDeceased,
            assignmentWorkspaceCtx,
            primaryDebtorKeyResolved,
            personalTabLockedForEmployee,
            dossierLifecycleRow:
                dossierLifecycleRow as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['dossierLifecycleRow'],
            activeDebtorSolidary,
            allDebtorsUnified,
            isHistoricalMode,
            debtorNotifiedForEvictionGrace,
            evictionPremisesUseResolved,
            workspacePipeline: {
                ...workspacePipeline,
                debtorBrowserTabsMode,
                effectiveFollowupDebtorEntry,
                activeWorkspaceDebtorForFollowup,
                activeTimelineEventsDebtorScoped,
                monetaryStrictForSummoningEngine,
            },
        }),
    );

    return {
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
        daysSinceNoticeCalculated: Number(graceMasterPipeline.daysSinceNoticeCalculated) || 0,
        remaining: graceMasterPipeline.remaining,
    };
}
