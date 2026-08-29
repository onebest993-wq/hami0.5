import React from 'react';
import { applyUnifiedSummonsDebtorNotification } from './applyUnifiedSummonsDebtorNotification';
import { getActivePublicationNoticeForDebtorKey } from '@/app/utils/publicationNoticeDebtor';
import { executionHandlerNotReadyFallback } from '../hooks/executionHandlerClusterStubs';
import type { UnifiedSummonsModalContainerProps } from './UnifiedSummonsModalContainer.types';

type SafeHandlers = {
    notifyDebtorSafe: (
        date: string,
        evictionMeta: unknown,
        initialNoticeLawyerFeesIncluded: boolean | undefined,
        purpose: string | undefined,
        notifyOpts: unknown
    ) => void;
    closeUnifiedSummonsModal: () => void;
    employeeTaklifHubEnabled: boolean;
    registerPublicationNoticeSafe: UnifiedSummonsModalContainerProps['handlePublicationNoticeRegister'];
    terminatePublicationNoticeSafe: () => void;
    attendPublicationNoticeSafe: () => void;
    registerDebtorVoluntaryAttendanceSafe: () => void;
};

type HubPanelProps = UnifiedSummonsModalContainerProps & {
    safe: SafeHandlers;
    guarantorNotificationFeature: unknown;
};

export function UnifiedSummonsHubMountedPanelInner({
    LazyUnifiedSummonsHub,
    executionId,
    unifiedSummonsTargetDebtorKey,
    summonsHubInitialMainTab,
    primaryDebtorKeyResolved,
    isEvictionExecutionModule,
    setManualGraceCalendarExtra,
    executionData,
    notificationCount,
    onUpdate,
    buildDebtorNoticePatchForKey,
    executionStorageKey,
    storageCache,
    subsequentNoticeUnlocked,
    noticeKindGoalStrictBinding,
    forcedSummoningAnalysis,
    followupIsDebtorGovernmentEmployee,
    followupIsDebtorRetired,
    activeCoerciveActions,
    activeDebtorIsEmployee,
    openExecutionSeizuresTab,
    followupDebtorSummonsProfile,
    summoningRound,
    debtorBrowserTabsMode,
    followupEarnerForcedActionUnlocked,
    earnerForcedActionUnlocked,
    forcedAttendanceIssued,
    handleForcedAttendance,
    debtorNotifiedForEvictionGrace,
    voluntaryEndOptimistic,
    isEvictionGraceExpiredCalendar,
    handleDeclareEvictionVoluntaryPeriodEnd,
    isEvictionGraceEffectivelyExpired,
    unifiedCollectionApproved,
    parsedLawyerFees,
    debtorEvaded,
    handleDebtorEvasion,
    noticeVoluntaryPeriodEndOptimistic,
    isGracePeriodExpiredNow,
    debtorAttendedVoluntarily,
    handleDeclareNoticeVoluntaryPeriodEnd,
    lawyerStartedPostNoticeExecution,
    coerciveUiLocked,
    executionStatus,
    resolvedEmployeeSummonsAssignment,
    handleEmployeeAssignmentConfirm,
    handleEmployeeAssignmentAttend,
    handleEmployeeAssignmentDeclareAbsent,
    handleEmployeeAssignmentTerminate,
    handleEmployeeAssignmentRequestInvestigation,
    handleEmployeeRegisterArrestOrder,
    handleEmployeeAssignmentRequestForcedBring,
    forcedBringDecisionState,
    employeeForcedBringAwaitingPersonalOutcome,
    handleEmployeeAssignmentResolveForcedBringOutcome,
    handleEmployeeWarrantOutcome,
    activeDebtorNoticeScope,
    scopedSummonsMarker,
    terminateDebtorSummonsMarker,
    safe,
    guarantorNotificationFeature,
}: HubPanelProps) {
    const {
        notifyDebtorSafe,
        closeUnifiedSummonsModal,
        employeeTaklifHubEnabled,
        registerPublicationNoticeSafe,
        terminatePublicationNoticeSafe,
        attendPublicationNoticeSafe,
        registerDebtorVoluntaryAttendanceSafe,
    } = safe;

    return (
        <LazyUnifiedSummonsHub
            key={`${String(executionId || '')}:${String(unifiedSummonsTargetDebtorKey || '')}:${summonsHubInitialMainTab ?? 'default'}`}
            isOpen
            initialMainTab={summonsHubInitialMainTab}
            onClose={closeUnifiedSummonsModal}
            onDebtorNotification={(
                date,
                purpose,
                isHolidayExtension,
                evictionMeta,
                initialNoticeLawyerFeesIncluded,
                notifyOpts
            ) => {
                applyUnifiedSummonsDebtorNotification({
                    date,
                    purpose,
                    isHolidayExtension,
                    evictionMeta,
                    initialNoticeLawyerFeesIncluded,
                    notifyOpts,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved,
                    isEvictionExecutionModule,
                    setManualGraceCalendarExtra,
                    executionData,
                    notificationCount,
                    onUpdate,
                    buildDebtorNoticePatchForKey,
                    executionStorageKey,
                    storageCache,
                    notifyDebtorSafe,
                });
            }}
            notificationCount={notificationCount}
            subsequentNoticeUnlocked={subsequentNoticeUnlocked}
            noticeKindGoalStrictBinding={noticeKindGoalStrictBinding}
            canForceSummon={forcedSummoningAnalysis.canForceSummon}
            forceSummonLockReason={forcedSummoningAnalysis.lockReasonAr}
            isGovernmentEmployee={
                followupIsDebtorGovernmentEmployee || followupIsDebtorRetired
            }
            hasSalaryCoerciveStep={
                activeCoerciveActions.includes('salary') && activeDebtorIsEmployee
            }
            onRegisterDebtorVoluntaryAttendance={registerDebtorVoluntaryAttendanceSafe}
            onOpenCoerciveModal={() => {
                closeUnifiedSummonsModal();
                openExecutionSeizuresTab();
            }}
            summonsProfile={followupDebtorSummonsProfile}
            summoningRound={summoningRound}
            earnerForcedActionUnlocked={
                debtorBrowserTabsMode
                    ? followupEarnerForcedActionUnlocked
                    : earnerForcedActionUnlocked
            }
            forcedAttendanceIssued={forcedAttendanceIssued}
            onEarnerIssueForcedMemo={() => {
                handleForcedAttendance();
            }}
            summonsEvictionSimplifiedUi={isEvictionExecutionModule}
            showEvictionVoluntaryPeriodEndButton={
                isEvictionExecutionModule &&
                debtorNotifiedForEvictionGrace &&
                notificationCount === 1 &&
                !(executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) &&
                isEvictionGraceExpiredCalendar
            }
            onEvictionVoluntaryPeriodEnd={handleDeclareEvictionVoluntaryPeriodEnd}
            debtorIsGovernmentEmployee={followupIsDebtorGovernmentEmployee}
            evictionSummonsPipelineCoerciveLocked={
                isEvictionExecutionModule &&
                debtorNotifiedForEvictionGrace &&
                notificationCount === 1 &&
                !isEvictionGraceEffectivelyExpired
            }
            evictionEarnerCollectionBranchEligible={
                isEvictionExecutionModule &&
                !followupIsDebtorGovernmentEmployee &&
                !followupIsDebtorRetired &&
                unifiedCollectionApproved &&
                subsequentNoticeUnlocked
            }
            showInitialNoticeLawyerFeesMemoOption={
                isEvictionExecutionModule &&
                !followupIsDebtorGovernmentEmployee &&
                !followupIsDebtorRetired &&
                notificationCount === 0 &&
                !executionData?.eviction_first_notice_date &&
                (parsedLawyerFees > 0 ||
                    Boolean((executionData as { includeLawyerFees?: boolean }).includeLawyerFees))
            }
            debtorEvaded={debtorEvaded}
            onEarnerMarkDebtorEvading={handleDebtorEvasion}
            showNoticeVoluntaryPeriodEndButton={
                !isEvictionExecutionModule &&
                notificationCount === 1 &&
                !(
                    executionData?.notice_voluntary_period_end_declared ||
                    noticeVoluntaryPeriodEndOptimistic
                ) &&
                isGracePeriodExpiredNow &&
                !debtorAttendedVoluntarily
            }
            onNoticeVoluntaryPeriodEnd={handleDeclareNoticeVoluntaryPeriodEnd}
            evictionDebtorExecutionStrip={
                isEvictionExecutionModule && notificationCount === 1
                    ? {
                          visible: true,
                          showAttendanceButton:
                              !debtorAttendedVoluntarily &&
                              !lawyerStartedPostNoticeExecution &&
                              !coerciveUiLocked &&
                              !(
                                  executionData?.eviction_voluntary_period_end_declared ||
                                  voluntaryEndOptimistic
                              ),
                          showCoerciveButton:
                              !followupIsDebtorGovernmentEmployee &&
                              !followupIsDebtorRetired &&
                              executionStatus === 'READY_FOR_COERCIVE' &&
                              !debtorAttendedVoluntarily &&
                              !lawyerStartedPostNoticeExecution &&
                              !coerciveUiLocked,
                          onRegisterAttendance: registerDebtorVoluntaryAttendanceSafe,
                          onOpenCoercive: () => {
                              closeUnifiedSummonsModal();
                              openExecutionSeizuresTab();
                          },
                      }
                    : undefined
            }
            employeeAssignmentFeature={{
                enabled: employeeTaklifHubEnabled,
                state: resolvedEmployeeSummonsAssignment ?? null,
                onConfirm:
                    handleEmployeeAssignmentConfirm ??
                    executionHandlerNotReadyFallback(
                        'employeeAssignmentHandlers.handleEmployeeAssignmentConfirm',
                    ),
                onAttend: handleEmployeeAssignmentAttend,
                onDeclareAbsent: handleEmployeeAssignmentDeclareAbsent,
                onTerminate: handleEmployeeAssignmentTerminate,
                onRequestInvestigation: handleEmployeeAssignmentRequestInvestigation,
                onRegisterArrestOrder: handleEmployeeRegisterArrestOrder,
                onRequestForcedBring: handleEmployeeAssignmentRequestForcedBring,
                forcedBringPending: forcedBringDecisionState.pending,
                forcedBringApprovedAwaitingOutcome: employeeForcedBringAwaitingPersonalOutcome,
                forcedBringRejected: forcedBringDecisionState.rejected,
                onWarrantDebtorBrought: () =>
                    employeeForcedBringAwaitingPersonalOutcome
                        ? handleEmployeeAssignmentResolveForcedBringOutcome('brought')
                        : handleEmployeeWarrantOutcome('brought'),
                onWarrantTerminate: () =>
                    employeeForcedBringAwaitingPersonalOutcome
                        ? handleEmployeeAssignmentResolveForcedBringOutcome('absconded')
                        : handleEmployeeWarrantOutcome('terminate'),
            }}
            publicationNoticeFeature={
                activeDebtorIsEmployee
                    ? undefined
                    : {
                          state: getActivePublicationNoticeForDebtorKey(
                              executionData,
                              unifiedSummonsTargetDebtorKey
                          ),
                          onRegister: registerPublicationNoticeSafe,
                          onTerminate: terminatePublicationNoticeSafe,
                          onDebtorAttended: attendPublicationNoticeSafe,
                      }
            }
            suppressPublicationNotice={activeDebtorIsEmployee}
            executionSummonsNoticeDateYmd={activeDebtorNoticeScope.notificationDate}
            executionSummonsArchived={Boolean(
                debtorAttendedVoluntarily ||
                    (isEvictionExecutionModule
                        ? executionData?.eviction_voluntary_period_end_declared ||
                          voluntaryEndOptimistic
                        : activeDebtorNoticeScope.voluntaryPeriodEndDeclared ||
                          (unifiedSummonsTargetDebtorKey === primaryDebtorKeyResolved &&
                              noticeVoluntaryPeriodEndOptimistic))
            )}
            showEmployeeTaklifHubTab={employeeTaklifHubEnabled}
            tablighTask={
                scopedSummonsMarker?.date
                    ? {
                          noticeDateYmd: String(scopedSummonsMarker.date),
                          purpose: String(scopedSummonsMarker.purpose || 'تبليغ'),
                      }
                    : null
            }
            onTerminateTablighTask={terminateDebtorSummonsMarker}
            guarantorNotificationFeature={guarantorNotificationFeature as never}
        />
    );
}
