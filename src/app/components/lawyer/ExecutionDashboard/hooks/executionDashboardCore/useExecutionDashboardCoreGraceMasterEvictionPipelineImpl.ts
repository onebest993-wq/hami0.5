/** Phase C Slice 27 — grace / master state / coercive UI / eviction badges */
import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { useGraceMasterEvictionVacateTail } from './useGraceMasterEvictionVacateTail';
import {
    hasApprovedLawyerFeePayout,
    hasApprovedUnifiedCollection,
} from '@/app/utils/executorDecisionReadQueries';
import { applyFollowupSpecializationOverlays } from '@/app/utils/applyFollowupSpecializationOverlays';
import { createDefaultFollowupSpecializationFlags } from '@/app/utils/followupSpecializationVisibility';
import { useExecutionDashboardGraceAndSummoning } from './useExecutionDashboardGraceAndSummoning';
import { useEarnerFinancialPersonalCoerciveFlags } from '../executionDashboardEarnerFinancialCoerciveGate';
import { useExecutionDashboardOtherPartyMirror } from './useExecutionDashboardOtherPartyMirror';
import { useStatuteOfLimitations } from '../useStatuteOfLimitations';
import { useMasterState } from '../useMasterState';
import { useExecutionDashboardCoerciveUiState } from './useExecutionDashboardCoerciveUiState';
import { useDossierDeathStatus } from '../useDossierDeathStatus';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from './executionDashboardCoreGraceMasterEvictionPipelineInput';


export function useExecutionDashboardCoreGraceMasterEvictionPipelineImpl(
    p: ExecutionDashboardCoreGraceMasterEvictionPipelineInput,
) {
    const {
        executionData,
        executionId,
        debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount,
        manualGraceCalendarExtra,
        voluntaryEndOptimistic,
        setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        activeTimelineEventsDebtorScoped,
        coercionOrchestrator,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        forcedAttendanceIssued,
        initiator,
        paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        activeDebtorIsEmployee,
        followupSpecializationEffective,
        followupModalSpecialization,
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        decisionsReloadEpoch,
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
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
        lastActionDate,
        dossierLifecycleRow,
        executionPaused,
        isPaused,
        pauseReason,
        executionFeeAdded,
        activeDebtorSolidary,
        allDebtorsUnified,
        followupOrchestrator,
        isHistoricalMode,
        debtorNotifiedForEvictionGrace,
        evictionPremisesUseResolved,
        todayYmd,
        timelineEventsRef,
        gracePeriodEnded,
        setGracePeriodEnded,
        setGracePeriodActive,
        showToastRef,
        showToast,
    } = p;

    const followupSpecializationSafe =
        followupSpecialization ?? createDefaultFollowupSpecializationFlags();
    const followupSpecializationEffectiveSafe =
        followupSpecializationEffective ?? followupSpecializationSafe;
    const followupModalSpecializationSafe =
        followupModalSpecialization ?? followupSpecializationSafe;
    const followupModalSpecializationEffectiveSafe =
        followupModalSpecializationEffective ?? followupSpecializationEffectiveSafe;

    const graceAndSummoning = useExecutionDashboardGraceAndSummoning({
        executionData,
        executionId,
        debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount,
        manualGraceCalendarExtra,
        voluntaryEndOptimistic,
        setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        activeTimelineEventsDebtorScoped,
        debtorAttendedVoluntarily: coercionOrchestrator.debtorAttendedVoluntarily,
        voluntaryAttendanceCount: coercionOrchestrator.voluntaryAttendanceCount,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        forcedAttendanceIssued,
        initiator,
        paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerGateIsEmployee: Boolean(activeDebtorIsEmployee),
    });

    const {
        generalMemoGraceAnchor,
        daysSinceNoticeCalculated,
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
        remaining: graceRemaining,
        isInBreach,
    } = graceAndSummoning;

    const remaining = graceRemaining;

    const {
        earnerFinancialPersonalCoerciveActive,
        hideExecutiveDetentionJudgeCard,
    } = useEarnerFinancialPersonalCoerciveFlags(
        Boolean(activeDebtorIsEmployee),
        graceRemaining,
        followupSpecializationSafe.isFinancialDebtCollection,
        Boolean(activeDebtorIsDeceased),
    );

    const followupSpecializationWithEarnerGate = useMemo(
        () =>
            applyFollowupSpecializationOverlays(followupSpecializationSafe, {
                isEmployee: Boolean(activeDebtorIsEmployee),
                financialCenterTotalIqd: graceRemaining,
                activeDebtorIsDeceased: Boolean(activeDebtorIsDeceased),
            }),
        [
            followupSpecializationSafe,
            activeDebtorIsEmployee,
            graceRemaining,
            activeDebtorIsDeceased,
        ],
    );

    const followupModalSpecializationEffectiveWithEarnerGate = useMemo(
        () =>
            applyFollowupSpecializationOverlays(followupModalSpecializationSafe, {
                isEmployee: Boolean(followupModalDebtorIsEmployee),
                financialCenterTotalIqd: graceRemaining,
                activeDebtorIsDeceased: Boolean(followupModalDebtorIsDeceased),
            }),
        [
            followupModalSpecializationSafe,
            followupModalDebtorIsEmployee,
            graceRemaining,
            followupModalDebtorIsDeceased,
        ],
    );

    const unifiedCollectionApproved = useMemo(
        () => hasApprovedUnifiedCollection(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const otherPartyCreditorMirrorProps = useExecutionDashboardOtherPartyMirror({
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        executionId,
        claimType,
        followupSpecializationEffective: followupSpecializationEffectiveSafe,
        followupSpecialization: followupSpecializationSafe,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        activeDebtorIsEmployee,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate,
        activeDebtorIsDeceased,
        activeDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
        forcedSummoningCanForce: forcedSummoningAnalysis.canForceSummon,
        personalTabLockedForEmployee,
        remaining: graceRemaining,
    });

    const statuteStatus = useStatuteOfLimitations(
        isAlimonyClaim,
        lastActionDate,
        dossierLifecycleRow?.lastActionDate,
        debtorNotificationDate
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    const {
        masterState,
        executionStatusRaw,
        executionStatus,
        statusMetadata,
    } = useMasterState(
        executionData,
        executionId,
        debtors,
        debtorNotificationDate,
        graceRemaining,
        isPaused,
        pauseReason,
        isAlimonyClaim,
        executionFeeAdded,
        manualGraceCalendarExtra,
        coercionOrchestrator.summoningRound,
        notificationCount,
        isEvictionExecutionModule,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
    );
    const stayOfExecutionActive = Boolean(executionData?.stay_of_execution?.active);
    const coerciveUiState = useExecutionDashboardCoerciveUiState({
        executionPaused,
        isPaused,
        stayOfExecutionActive,
        activeDebtorSolidary,
        allDebtorsUnifiedLength: allDebtorsUnified.length,
        activeDebtorCleared: Boolean(allDebtorsUnified[followupOrchestrator.executionDebtorTabIndex]?.cleared),
        dossierStatus: dossierLifecycleRow?.dossierStatus,
        isHistoricalMode,
    });

    const {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
        executionActionsGridLocked,
        executionToolsTimelineLockedUi,
        evictionProcedureLocked,
    } = coerciveUiState;

    /** تخلية: إظهار أدوات مذكرة إخبار الورثة عند وفاة المدين */
    const {
        isDebtorDeceasedForEvictionHeirs,
        creditorDeathMarked,
        debtorDeathMarked,
        creditorDeathMenuLabel,
        debtorDeathMenuLabel,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
    } = useDossierDeathStatus(executionData, debtors, claimType);

    const lawyerFeePayoutApproved = useMemo(
        () => hasApprovedLawyerFeePayout(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );


    const vacateTail = useGraceMasterEvictionVacateTail({
        executionData,
        executionId,
        debtorNotificationDate,
        debtors,
        manualGraceCalendarExtra,
        debtorNotifiedForEvictionGrace,
        isEvictionGraceExpiredNow,
        evictionPremisesUseResolved,
        followupOrchestrator,
        coerciveUiLocked,
        coerciveDossierLocked,
        notificationCount,
        isEvictionGraceEffectivelyExpired,
        isEvictionGraceExpiredCalendar,
        daysRemainingInEvictionGrace,
        isEvictionExecutionModule,
        executionStatus,
        gracePeriodEnded,
        setGracePeriodEnded,
        setGracePeriodActive,
        timelineEventsRef,
        todayYmd,
        showToastRef,
        showToast,
    });

    return { graceAndSummoning, generalMemoGraceAnchor, daysSinceNoticeCalculated, daysRemainingInGracePeriod, isGracePeriodExpiredNow, evictionGraceAnchorDate, isEvictionGraceExpiredCalendar, isEvictionGraceEffectivelyExpired, daysRemainingInEvictionGrace, isEvictionGraceExpiredNow, forcedSummoningAnalysis, shouldCalculateExecutionFee, calculatedExecutionFee, totalWithExecutionFee, remaining, isInBreach, earnerFinancialPersonalCoerciveActive, hideExecutiveDetentionJudgeCard, followupSpecializationWithEarnerGate, followupModalSpecializationEffectiveWithEarnerGate, unifiedCollectionApproved, otherPartyCreditorMirrorProps, statuteStatus, masterState, executionStatusRaw, executionStatus, statusMetadata, stayOfExecutionActive, coerciveUiState, coerciveUiLocked, dividedActiveDebtorCleared, executionCoerciveButtonDisabled, dossierStatusUi, coerciveDossierLocked, executionActionsGridLocked, executionToolsTimelineLockedUi, evictionProcedureLocked, isDebtorDeceasedForEvictionHeirs, creditorDeathMarked, debtorDeathMarked, creditorDeathMenuLabel, debtorDeathMenuLabel, heirSubstitutionAllowed, ongoingAlimonyClaim, alimonyBeneficiaryProfile, lawyerFeePayoutApproved, ...vacateTail };
}
