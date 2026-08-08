/** Claim ledger → grace/eviction → persist handler segment for core pipelines chain */
import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { openBreakInventoryCompletion, openJudicialCustodianCompletion } from '@/app/utils/executorApprovalWorkflow';
import type { ExecutionDashboardProps } from '../../types';
import {
    buildExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
    buildExecutionDashboardCoreGraceMasterEvictionPipelineInput,
    buildExecutionDashboardCorePersistHandlerPipelineInput,
} from './buildExecutionDashboardCorePipelinesChainInputs';
import {
    useExecutionDashboardCoreClaimFinancialLedgerPipeline,
    type ExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
} from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './useExecutionDashboardCoreGraceMasterEvictionPipeline';
import { useExecutionDashboardCorePersistHandlerPipeline } from './useExecutionDashboardCorePersistHandlerPipeline';
import { buildRestrictedFollowupTabIds } from './executionDashboardFollowupSeizureTabs';
import {
    buildFollowupModalTabsFromFlags,
    buildFollowupSectionTabOrderFromFlags,
} from './buildFollowupModalTabsFromFlags';
import { useExecutionDashboardFollowupSeizureTabs } from './useExecutionDashboardFollowupSeizureTabs';
import { computeShowGuarantorInSeizureFollowupTab } from './executionDashboardFollowupSeizureTabs';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from './executionDashboardCoreGraceMasterEvictionPipelineInput';
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';
import type { useExecutionDashboardCoreFileMetadataBinding } from './useExecutionDashboardCoreFileMetadataBinding';
import type { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import type { ExecutionDashboardCoreBootPipelineValue } from './executionDashboardCoreBootPipelineTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';

export type ExecutionDashboardCoreClaimGracePersistSegmentParams = {
    boot: ExecutionDashboardCoreBootPipelineValue;
    file: ExecutionDashboardProps['file'];
    executionId: string | undefined;
    onUpdate: ExecutionDashboardProps['onUpdate'];
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionDataRef: import('react').MutableRefObject<ExecutionFile | null>;
    workspacePipeline: ExecutionDashboardCoreWorkspacePipelineValue;
    fileMetadataBinding: ReturnType<typeof useExecutionDashboardCoreFileMetadataBinding>;
    followupDebtor: ReturnType<typeof useExecutionDashboardCoreFollowupDebtorPipeline>;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        _legacyOptions?: unknown,
    ) => void;
    gracePeriodEnded: boolean;
    setShowStatuteWarning: (show: boolean) => void;
};

export function useExecutionDashboardCoreClaimGracePersistSegment(
    p: ExecutionDashboardCoreClaimGracePersistSegmentParams,
) {
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
        showToast,
        gracePeriodEnded,
        setShowStatuteWarning,
    } = p;

    const {
        currentFileId,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        dossierLifecycleRow,
        debtorSummonsMarkerLocal,
        isUnifiedTabActive,
        unifiedTabId,
        setExecutionStorageTick,
        setShowDecisionsModal,
        showDecisionsModal,
        decisionsStorageExecutionId,
        executionFileKey,
    } = boot;

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
        lawyerStartedPostNoticeExecution,
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
        followupSpecialization,
        followupSpecializationEffective,
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
        activeDebtorNoticeScope,
        unifiedSummonsTargetDebtorKey,
        modalPersonalTabLockedForEmployee,
        modalShowEmployeeAssignmentCoerciveBlock,
    } = followupDebtor;

    const {
        decisionsReloadEpoch: decisionsReloadEpochRaw,
        showStatuteWarning,
    } = workspacePipeline;
    const decisionsReloadEpoch = Number(decisionsReloadEpochRaw) || 0;
    const executionFileKeyResolved = String(executionFileKey ?? '');

    const restrictedFollowupTabIdsPreEarner = useMemo(
        () =>
            buildRestrictedFollowupTabIds({
                specialization: followupSpecialization,
                showPersonalCoerciveFollowupTab,
            }),
        [
            followupSpecialization.hideFollowupCoerciveTab,
            followupSpecialization.hideFollowupSeizureRequestsTab,
            followupSpecialization.hidePersonalCoerciveFollowupTab,
            showPersonalCoerciveFollowupTab,
        ],
    );

    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };
    
    // ⚖️ COURT-ORDERED LAWYER FEES (يتحملها المدين)
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
                followupSpecialization as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['followupSpecialization'],
            followupSectionTabOrder:
                followupSectionTabOrder as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['followupSectionTabOrder'],
            followupModalTabs:
                followupModalTabs as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['followupModalTabs'],
            followupTabsRestricted,
            restrictedFollowupTabIds:
                restrictedFollowupTabIdsPreEarner as ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['restrictedFollowupTabIds'],
            hideFollowupCoerciveTab: followupSpecialization.hideFollowupCoerciveTab,
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
        parsedDebtAmount,
        parsedLawyerFees,
        parsedExecutionFee,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        total_execution_expenses,
        claimFinancials,
        isNonFinancialClaim,
        isVisitationClaim,
        isMaritalFurnitureClaim,
        maritalFurnitureItemsForFollowup,
        isAlimonyClaimType,
        principalDebtAmount,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimTypeForExecutionModule,
        executionModuleStrategy,
        hasEvictionSignals,
        hasEvictionTimelineSignals,
        isEvictionExecutionModule,
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
        seizureMatrixLedgerParams,
        seizureMatrixLedgerParamsRef,
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
        ledgerSync,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        isPersonalStatusExecutionClaim,
    } = claimFinancialLedger;

    const {
        followupOrchestrator,
        showUnifiedExecutionModal,
    } = workspacePipeline;

    const showGuarantorInSeizureFollowupTabPreEarner = useMemo(
        () =>
            computeShowGuarantorInSeizureFollowupTab({
                activeDebtorIsDeceased,
                activeDebtorIsEmployee,
                viewExecutionData,
                followupSpecialization,
                remainingBalanceForSeizure,
                settlementGuarantorGate,
            }),
        [
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            viewExecutionData,
            followupSpecialization,
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
                followupSpecializationEffective as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupSpecializationEffective'],
            followupModalSpecialization:
                followupModalSpecialization as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecialization'],
            followupModalSpecializationEffective:
                followupModalSpecializationEffective as unknown as ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecializationEffective'],
            followupModalDebtorIsEmployee,
            followupModalDebtorIsDeceased,
            decisionsReloadEpoch,
            isRepresentingDebtor,
            decisionsStorageExecutionId,
            followupSpecialization,
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

    const {
        graceAndSummoning,
        generalMemoGraceAnchor,
        daysSinceNoticeCalculated: daysSinceNoticeCalculatedRaw,
        daysRemainingInGracePeriod,
        isGracePeriodExpiredNow,
        evictionGraceAnchorDate,
        isEvictionGraceExpiredCalendar,
        isEvictionGraceEffectivelyExpired,
        daysRemainingInEvictionGrace,
        isEvictionGraceExpiredNow,
        forcedSummoningAnalysis,
        shouldCalculateExecutionFee,
        calculatedExecutionFee,
        totalWithExecutionFee,
        remaining,
        isInBreach,
        earnerFinancialPersonalCoerciveActive,
        hideExecutiveDetentionJudgeCard,
        followupSpecializationWithEarnerGate,
        followupModalSpecializationEffectiveWithEarnerGate,
        unifiedCollectionApproved,
        otherPartyCreditorMirrorProps,
        statuteStatus,
        masterState,
        executionStatusRaw,
        executionStatus,
        statusMetadata,
        stayOfExecutionActive,
        coerciveUiState,
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
        executionActionsGridLocked,
        executionToolsTimelineLockedUi,
        evictionProcedureLocked,
        isDebtorDeceasedForEvictionHeirs,
        creditorDeathMarked,
        debtorDeathMarked,
        creditorDeathMenuLabel,
        debtorDeathMenuLabel,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
        lawyerFeePayoutApproved,
        notifDateForEvictionVacate,
        residentialVacateDeadlineMaxIso,
        notificationLayerOkEviction,
        isResidentialVacateGraceFinished,
        evictionVacateLayerOk,
        evictionProcedureLockHint,
        evictionGraceBadgeInfo,
        policeAssistanceBadgeInfo,
    } = graceMasterPipeline;
    const daysSinceNoticeCalculated = Number(daysSinceNoticeCalculatedRaw) || 0;

    const modalShowPersonalCoerciveFollowupTabEarner = useMemo(
        () =>
            !followupModalSpecializationEffectiveWithEarnerGate.hidePersonalCoerciveFollowupTab ||
            modalShowEmployeeAssignmentCoerciveBlock,
        [
            followupModalSpecializationEffectiveWithEarnerGate.hidePersonalCoerciveFollowupTab,
            modalShowEmployeeAssignmentCoerciveBlock,
        ],
    );

    const showPersonalCoerciveFollowupTabEarner = useMemo(
        () => !followupSpecializationWithEarnerGate.hidePersonalCoerciveFollowupTab,
        [followupSpecializationWithEarnerGate.hidePersonalCoerciveFollowupTab],
    );

    const restrictedFollowupTabIdsEarner = useMemo(
        () =>
            buildRestrictedFollowupTabIds({
                specialization: followupSpecializationWithEarnerGate,
                showPersonalCoerciveFollowupTab: modalShowPersonalCoerciveFollowupTabEarner,
            }),
        [
            followupSpecializationWithEarnerGate.hideFollowupCoerciveTab,
            followupSpecializationWithEarnerGate.hideFollowupSeizureRequestsTab,
            followupSpecializationWithEarnerGate.hidePersonalCoerciveFollowupTab,
            modalShowPersonalCoerciveFollowupTabEarner,
        ],
    );

    const earnerGatedFollowupModalTabs = useMemo(
        () =>
            buildFollowupModalTabsFromFlags({
                specialization: followupModalSpecializationEffectiveWithEarnerGate,
                showPersonalCoerciveFollowupTab: modalShowPersonalCoerciveFollowupTabEarner,
                personalTabLockedForEmployee: modalPersonalTabLockedForEmployee,
                followupTabsRestricted,
            }),
        [
            followupModalSpecializationEffectiveWithEarnerGate,
            modalShowPersonalCoerciveFollowupTabEarner,
            modalPersonalTabLockedForEmployee,
            followupTabsRestricted,
        ],
    );

    const earnerGatedFollowupSectionTabOrder = useMemo(
        () =>
            buildFollowupSectionTabOrderFromFlags({
                showPersonalCoerciveFollowupTab: showPersonalCoerciveFollowupTabEarner,
                specialization: followupSpecializationWithEarnerGate,
                followupTabsRestricted,
            }),
        [
            showPersonalCoerciveFollowupTabEarner,
            followupSpecializationWithEarnerGate,
            followupTabsRestricted,
        ],
    );

    const earnerFollowupSeizureTabs = useExecutionDashboardFollowupSeizureTabs({
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        viewExecutionData,
        followupSpecialization: followupSpecializationWithEarnerGate,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        followupSectionTabOrder: earnerGatedFollowupSectionTabOrder,
        followupModalTabs: earnerGatedFollowupModalTabs,
        seizureMatrix,
        followupTabsRestricted,
        restrictedFollowupTabIds: restrictedFollowupTabIdsEarner,
        openSeizureRequestsTabRef: followupOrchestrator.openSeizureRequestsTabRef,
        setUnifiedModalTab: followupOrchestrator.setUnifiedModalTab,
        showToast: showToast as (message: string, type: 'info' | 'success' | 'error' | 'warning') => void,
        showUnifiedExecutionModal,
        unifiedModalTab: followupOrchestrator.unifiedModalTab,
        hideFollowupCoerciveTab: followupSpecializationWithEarnerGate.hideFollowupCoerciveTab,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab: showPersonalCoerciveFollowupTabEarner,
        setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending: followupOrchestrator.setSolidaryCoerciveActionPending,
        followupModalChipTablistRef: followupOrchestrator.followupModalChipTablistRef,
        followupModalDebtorTabsRef: followupOrchestrator.followupModalDebtorTabsRef,
        isSolidaryLiability,
        solidaryDebtorCount: allDebtorsUnified.length,
    });

    const claimFinancialLedgerMerged = useMemo(
        () => ({
            ...claimFinancialLedger,
            showGuarantorInSeizureFollowupTab: earnerFollowupSeizureTabs.showGuarantorInSeizureFollowupTab,
            effectiveFollowupSectionTabOrder: earnerFollowupSeizureTabs.effectiveFollowupSectionTabOrder,
            effectiveFollowupModalTabs: earnerFollowupSeizureTabs.effectiveFollowupModalTabs,
            openSeizureRequestsTab: earnerFollowupSeizureTabs.openSeizureRequestsTab,
            followupSeizureTabs: earnerFollowupSeizureTabs,
            showPersonalCoerciveFollowupTab: showPersonalCoerciveFollowupTabEarner,
        }),
        [claimFinancialLedger, earnerFollowupSeizureTabs, showPersonalCoerciveFollowupTabEarner],
    );

    // ===========================
    // FINANCIAL CENTER ACCORDION & TABS STATE
    // ===========================
    // ✅ V10.8: Moved to top with other useState (lines 190-192)
    
    // ===========================
    // DOCUMENT DETAILS ACCORDION STATE
    // ===========================
    // ✅ V10.8: Moved to top with other useState (line 192)
    
    const financialStatus = useMemo(() => {
        if (remaining <= 0) {
            return { label: 'منتظم', color: 'emerald', pulse: false };
        }
        if (!gracePeriodEnded && daysSinceNoticeCalculated <= 7) {
            return { label: 'فترة الإمهال القانوني', color: 'amber', pulse: false };
        }
        if (gracePeriodEnded || daysSinceNoticeCalculated > 7) {
            return { label: 'جاهز للتنفيذ الجبري', color: 'rose', pulse: true };
        }
        return { label: 'إخلال - جاهز للتنفيذ', color: 'rose', pulse: true };
    }, [remaining, gracePeriodEnded, daysSinceNoticeCalculated]);
    
    const persistHandlerPipeline = useExecutionDashboardCorePersistHandlerPipeline(
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

    const {
        debtorSummonsProfileBundle,
        debtorOccupation,
        isDebtorGovernmentEmployee,
        isDebtorFreelancer,
        isDebtorRetired,
        debtorSummonsProfile,
        followupDebtorSummonsProfile,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        showSalaryCaptureForEmployee,
        subsequentNoticeFlow,
        earnerForcedActionUnlocked,
        followupEarnerForcedActionUnlocked,
        baseSubsequentNoticeUnlocked,
        evictionSubsequentNoticeUnlocked,
        subsequentNoticeUnlocked,
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
        primaryMemoNoticeBadge,
        primaryDebtorNoticeYmdResolved,
        showDebtorUnservedMemoBadge,
        primaryDebtorAbsenceBadge,
        showDebtorSummonsAttendanceBadge,
        noticeKindGoalStrictBinding,
        employeeAssignmentTabEnabled,
        resolvedEmployeeSummonsAssignment,
        showEmployeeAssignmentCoerciveBlock,
        employeeFinancialSalaryOnlyCoercive,
        monetaryCoerciveLimitedOnly,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupMonetaryCoerciveLimitedOnly,
        followupGarnishmentAmountPreview,
        saveExecutionData,
        executorApprovalActions,
        pushSeizureAuctionCalendarAppointment,
        pendingExecutorOpeners,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        saveJudicialCustodianEntry,
        persistExecutionMergeBinding,
        persistExecutionMerge,
        trashAndPinsHandlers,
        timelineEditDraft,
        setTimelineEditDraft,
        moveTimelineEventToTrash,
        toggleTimelineEventPin,
        requestEditTimelineEvent,
        restoreTimelineEventFromTrash,
        permanentlyDeleteTimelineEvent,
        moveCaseNoteToTrash,
        moveCaseTaskToTrash,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        saveTimelineEditDraft,
        restoreCaseNoteFromTrash,
        permanentlyDeleteCaseNote,
        restoreCaseTaskFromTrash,
        permanentlyDeleteCaseTask,
        partyEditWorkflow,
        editPartyTarget,
        setEditPartyTarget,
        partyEditDraft,
        setPartyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        setPartyEditHeirDeleteConfirmIdx,
        heirsQuickView,
        setHeirsQuickView,
        openEditParty,
        buildPartyHeirsRows,
        openHeirsQuickView,
        savePartyEditDraft,
        removeHeirFromPartyEditDraftAtIndex,
        togglePartyEditHeirClient,
    } = persistHandlerPipeline;


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
