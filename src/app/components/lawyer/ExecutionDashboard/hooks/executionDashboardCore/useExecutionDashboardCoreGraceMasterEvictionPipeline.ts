// @ts-nocheck
/** Phase C Slice 27 — grace / master state / coercive UI / eviction badges */
import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { getResidentialVacateDeadlineMaxIso, isVacateDeadlinePassed } from '@/app/utils/executionModuleStrategies';
import { hasApprovedLawyerFeePayout, hasApprovedUnifiedCollection } from '@/app/utils/executorSeizureDecisionQueue';
import { applyEarnerFinancialPersonalCoerciveOverlay } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import { useExecutionDashboardGraceAndSummoning } from './useExecutionDashboardGraceAndSummoning';
import { useEarnerFinancialPersonalCoerciveFlags } from '../executionDashboardEarnerFinancialCoerciveGate';
import { useExecutionDashboardOtherPartyMirror } from './useExecutionDashboardOtherPartyMirror';
import { useStatuteOfLimitations } from '../useStatuteOfLimitations';
import { useMasterState } from '../useMasterState';
import { useExecutionDashboardCoerciveUiState } from './useExecutionDashboardCoerciveUiState';
import { useDossierDeathStatus } from '../useDossierDeathStatus';
import { useEvictionProcedureLockHint } from '../useEvictionProcedureLockHint';
import { useEvictionBadges } from '../useEvictionBadges';
import { useExecutionDashboardGraceLifecycleEffects } from './useExecutionDashboardTimelineAndGraceSync';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from './executionDashboardCoreGraceMasterEvictionPipelineInput';


export function useExecutionDashboardCoreGraceMasterEvictionPipeline(
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
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
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
    } = useEarnerFinancialPersonalCoerciveFlags(Boolean(activeDebtorIsEmployee), graceRemaining);

    const followupSpecializationWithEarnerGate = useMemo(
        () =>
            applyEarnerFinancialPersonalCoerciveOverlay(followupSpecializationEffective, {
                isEmployee: Boolean(activeDebtorIsEmployee),
                financialCenterTotalIqd: graceRemaining,
            }),
        [followupSpecializationEffective, activeDebtorIsEmployee, graceRemaining],
    );

    const followupModalSpecializationEffectiveWithEarnerGate = useMemo(
        () =>
            applyEarnerFinancialPersonalCoerciveOverlay(followupModalSpecializationEffective, {
                isEmployee: Boolean(followupModalDebtorIsEmployee),
                financialCenterTotalIqd: graceRemaining,
            }),
        [followupModalSpecializationEffective, followupModalDebtorIsEmployee, graceRemaining],
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
        followupSpecializationEffective,
        followupSpecialization,
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


    const notifDateForEvictionVacate =
        executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate;

    const residentialVacateDeadlineMaxIso = useMemo(() => {
        if (!notifDateForEvictionVacate) return '';
        return getResidentialVacateDeadlineMaxIso(
            String(notifDateForEvictionVacate),
            manualGraceCalendarExtra ? 1 : 0
        );
    }, [notifDateForEvictionVacate, manualGraceCalendarExtra]);

    const notificationLayerOkEviction = debtorNotifiedForEvictionGrace && isEvictionGraceExpiredNow;

    /** مهلة التخلية السكنية: انتهت بتقويم تاريخ الانتهاء المسجّل */
    const isResidentialVacateGraceFinished = useMemo(() => {
        if (evictionPremisesUseResolved !== 'residential') return false;
        if (followupOrchestrator.evictionVacateDeadlineLocal && isVacateDeadlinePassed(followupOrchestrator.evictionVacateDeadlineLocal)) return true;
        return false;
    }, [evictionPremisesUseResolved, followupOrchestrator.evictionVacateDeadlineLocal]);

    const evictionVacateLayerOk = useMemo(() => {
        if (evictionPremisesUseResolved === 'commercial') return true;
        return Boolean(
            followupOrchestrator.evictionExecutorVacateGrantApproved &&
                followupOrchestrator.evictionVacateDeadlineLocal &&
                isResidentialVacateGraceFinished
        );
    }, [
        evictionPremisesUseResolved,
        followupOrchestrator.evictionVacateDeadlineLocal,
        followupOrchestrator.evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    ]);

    const evictionProcedureLockHint = useEvictionProcedureLockHint(
        coerciveUiLocked,
        coerciveDossierLocked,
        debtorNotifiedForEvictionGrace,
        notificationCount,
        isEvictionGraceEffectivelyExpired,
        isEvictionGraceExpiredCalendar,
        daysRemainingInEvictionGrace,
        evictionPremisesUseResolved,
        followupOrchestrator.evictionVacateDeadlineLocal,
        residentialVacateDeadlineMaxIso,
        followupOrchestrator.evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    );

    const {
        evictionGraceBadgeInfo,
        policeAssistanceBadgeInfo,
    } = useEvictionBadges(
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        followupOrchestrator.evictionResidentialGracePeriodStart,
        followupOrchestrator.evictionVacateDeadlineLocal,
        followupOrchestrator.evictionResidentialGraceManuallyEndedAt,
        executionData,
    );

    useExecutionDashboardGraceLifecycleEffects({
        executionStatus,
        gracePeriodEnded,
        setGracePeriodEnded,
        setGracePeriodActive,
        timelineEventsRef,
        todayYmd,
        executionData,
        executionId,
        showToastRef,
        evictionGraceBadgeInfo,
        showToast,
    });

    return { graceAndSummoning, generalMemoGraceAnchor, daysSinceNoticeCalculated, daysRemainingInGracePeriod, isGracePeriodExpiredNow, evictionGraceAnchorDate, isEvictionGraceExpiredCalendar, isEvictionGraceEffectivelyExpired, daysRemainingInEvictionGrace, isEvictionGraceExpiredNow, forcedSummoningAnalysis, shouldCalculateExecutionFee, calculatedExecutionFee, totalWithExecutionFee, remaining, isInBreach, earnerFinancialPersonalCoerciveActive, hideExecutiveDetentionJudgeCard, followupSpecializationWithEarnerGate, followupModalSpecializationEffectiveWithEarnerGate, unifiedCollectionApproved, otherPartyCreditorMirrorProps, statuteStatus, masterState, executionStatusRaw, executionStatus, statusMetadata, stayOfExecutionActive, coerciveUiState, coerciveUiLocked, dividedActiveDebtorCleared, executionCoerciveButtonDisabled, dossierStatusUi, coerciveDossierLocked, executionActionsGridLocked, executionToolsTimelineLockedUi, evictionProcedureLocked, isDebtorDeceasedForEvictionHeirs, creditorDeathMarked, debtorDeathMarked, creditorDeathMenuLabel, debtorDeathMenuLabel, heirSubstitutionAllowed, ongoingAlimonyClaim, alimonyBeneficiaryProfile, lawyerFeePayoutApproved, notifDateForEvictionVacate, residentialVacateDeadlineMaxIso, notificationLayerOkEviction, isResidentialVacateGraceFinished, evictionVacateLayerOk, evictionProcedureLockHint, evictionGraceBadgeInfo, policeAssistanceBadgeInfo };
}
