import React, { Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
    EmployeeSummonsAssignmentState,
    EvictionSubsequentSummonsMeta,
    ExecutionFile,
    PublicationNoticeDebtorState,
    TimelineEvent,
} from '@/app/types/execution';
import type { UnifiedSummonsHubProps } from '@/app/components/lawyer/Modal_Unified_Summons_Hub';
import { isGuarantorSummonsEligible } from './guarantorExternalUtils';

type SummonsMainTab = 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;

type NotifyOptions = {
    forceExecutionMemo?: boolean;
};

type SummonsMarkerLike = {
    date?: string;
    purpose?: string;
} | null;

type ActiveDebtorNoticeScopeLike = {
    notificationDate?: string | null;
    voluntaryPeriodEndDeclared?: boolean;
};

interface UnifiedSummonsModalContainerProps {
    showUnifiedSummonsModal: boolean;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyUnifiedSummonsHub: React.ComponentType<UnifiedSummonsHubProps>;

    executionId: string;
    unifiedSummonsTargetDebtorKey: string;
    summonsHubInitialMainTab: SummonsMainTab;
    setSummonsHubInitialMainTab: Dispatch<SetStateAction<SummonsMainTab>>;
    setSummonsContextDebtorKey: (debtorKey: string | null) => void;
    setShowUnifiedSummonsModal: (show: boolean) => void;

    primaryDebtorKeyResolved: string;
    isEvictionExecutionModule: boolean;
    setManualGraceCalendarExtra: Dispatch<SetStateAction<boolean>>;
    executionData: ExecutionFile;
    notificationCount: number;
    onUpdate?: (data: ExecutionFile) => void;
    buildDebtorNoticePatchForKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        primaryDebtorKey: string,
        patch: { notificationDate: string }
    ) => Record<string, unknown>;
    executionStorageKey: (id: string) => string;
    storageCache: { set: (key: string, value: unknown) => void };
    handleNotifyDebtor: (
        date: string,
        evictionMeta?: EvictionSubsequentSummonsMeta,
        initialNoticeLawyerFeesIncluded?: boolean,
        purpose?: string,
        notifyOpts?: NotifyOptions
    ) => void;

    subsequentNoticeUnlocked: boolean;
    noticeKindGoalStrictBinding: boolean;
    forcedSummoningAnalysis: { canForceSummon: boolean; lockReasonAr: string };
    followupIsDebtorGovernmentEmployee: boolean;
    followupIsDebtorRetired: boolean;
    activeCoerciveActions: string[];
    activeDebtorIsEmployee: boolean;
    registerDebtorVoluntaryAttendance: () => void;
    openExecutionSeizuresTab: () => void;
    followupDebtorSummonsProfile?: UnifiedSummonsHubProps['summonsProfile'];
    summoningRound: number;
    debtorBrowserTabsMode: boolean;
    followupEarnerForcedActionUnlocked: boolean;
    earnerForcedActionUnlocked: boolean;
    forcedAttendanceIssued: boolean;
    handleForcedAttendance: () => void;
    debtorNotifiedForEvictionGrace: boolean;
    voluntaryEndOptimistic: boolean;
    isEvictionGraceExpiredCalendar: boolean;
    handleDeclareEvictionVoluntaryPeriodEnd: () => void;
    isEvictionGraceEffectivelyExpired: boolean;
    unifiedCollectionApproved: boolean;
    parsedLawyerFees: number;
    debtorEvaded: boolean;
    handleDebtorEvasion: () => void;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    isGracePeriodExpiredNow: boolean;
    debtorAttendedVoluntarily: boolean;
    handleDeclareNoticeVoluntaryPeriodEnd: () => void;
    lawyerStartedPostNoticeExecution: boolean;
    coerciveUiLocked: boolean;
    executionStatus: string;

    employeeAssignmentTabEnabled: boolean;
    resolvedEmployeeSummonsAssignment: EmployeeSummonsAssignmentState | null;
    handleEmployeeAssignmentConfirm: (p: {
        purpose: string;
        notifyDate: string;
        durationDays: number;
    }) => void;
    handleEmployeeAssignmentAttend: () => void;
    handleEmployeeAssignmentDeclareAbsent: () => void;
    handleEmployeeAssignmentTerminate: () => void;
    handleEmployeeAssignmentRequestInvestigation: () => void;
    handleEmployeeRegisterArrestOrder: () => void;
    handleEmployeeAssignmentRequestForcedBring: () => void;
    forcedBringDecisionState: { pending: boolean; rejected: boolean };
    employeeForcedBringAwaitingPersonalOutcome: boolean;
    handleEmployeeAssignmentResolveForcedBringOutcome: (outcome: 'brought' | 'absconded') => void;
    handleEmployeeWarrantOutcome: (outcome: 'brought' | 'terminate') => void;
    getPublicationNoticeForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string
    ) => PublicationNoticeDebtorState | null;
    handlePublicationNoticeRegister: (p: {
        publicationDateYmd: string;
        newspaper1: string;
        newspaper2: string;
    }) => void;
    handlePublicationNoticeTerminate: () => void;
    handlePublicationNoticeDebtorAttended: () => void;
    activeDebtorNoticeScope: ActiveDebtorNoticeScopeLike;
    scopedSummonsMarker: SummonsMarkerLike;
    terminateDebtorSummonsMarker: () => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> }
    ) => void;
    nextTimelineId: () => string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
}

export const UnifiedSummonsModalContainer: React.FC<UnifiedSummonsModalContainerProps> = ({
    showUnifiedSummonsModal,
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyUnifiedSummonsHub,
    executionId,
    unifiedSummonsTargetDebtorKey,
    summonsHubInitialMainTab,
    setSummonsHubInitialMainTab,
    setSummonsContextDebtorKey,
    setShowUnifiedSummonsModal,
    primaryDebtorKeyResolved,
    isEvictionExecutionModule,
    setManualGraceCalendarExtra,
    executionData,
    notificationCount,
    onUpdate,
    buildDebtorNoticePatchForKey,
    executionStorageKey,
    storageCache,
    handleNotifyDebtor,
    subsequentNoticeUnlocked,
    noticeKindGoalStrictBinding,
    forcedSummoningAnalysis,
    followupIsDebtorGovernmentEmployee,
    followupIsDebtorRetired,
    activeCoerciveActions,
    activeDebtorIsEmployee,
    registerDebtorVoluntaryAttendance,
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
    employeeAssignmentTabEnabled,
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
    getPublicationNoticeForDebtorKey,
    handlePublicationNoticeRegister,
    handlePublicationNoticeTerminate,
    handlePublicationNoticeDebtorAttended,
    activeDebtorNoticeScope,
    scopedSummonsMarker,
    terminateDebtorSummonsMarker,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
}) => {
    return (
        <>
            {showUnifiedSummonsModal && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyUnifiedSummonsHub
                        key={`${String(executionId || '')}:${String(unifiedSummonsTargetDebtorKey || '')}:${summonsHubInitialMainTab ?? 'default'}`}
                        isOpen
                        initialMainTab={summonsHubInitialMainTab}
                        onClose={() => {
                            setSummonsHubInitialMainTab(null);
                            setSummonsContextDebtorKey(null);
                            setShowUnifiedSummonsModal(false);
                        }}
                        onDebtorNotification={(
                            date,
                            purpose,
                            isHolidayExtension,
                            evictionMeta,
                            initialNoticeLawyerFeesIncluded,
                            notifyOpts
                        ) => {
                            const targetDebtorKey = unifiedSummonsTargetDebtorKey;
                            const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
                            if (isHolidayExtension && !isEvictionExecutionModule) {
                                setManualGraceCalendarExtra(true);
                            }
                            const nextHoliday = isEvictionExecutionModule
                                ? false
                                : Boolean(isHolidayExtension || executionData?.isHolidayExtension);
                            const initialFeesPatch =
                                notificationCount === 0 &&
                                isEvictionExecutionModule &&
                                typeof initialNoticeLawyerFeesIncluded === 'boolean'
                                    ? {
                                          eviction_initial_notice_lawyer_fees_included:
                                              initialNoticeLawyerFeesIncluded,
                                      }
                                    : {};
                            if (onUpdate && executionData?.id) {
                                onUpdate({
                                    ...executionData,
                                    ...(targetIsPrimary ? { debtorNotificationDate: date } : {}),
                                    ...buildDebtorNoticePatchForKey(
                                        executionData,
                                        targetDebtorKey,
                                        primaryDebtorKeyResolved,
                                        { notificationDate: date }
                                    ),
                                    isHolidayExtension: nextHoliday,
                                    ...initialFeesPatch,
                                    ...(isEvictionExecutionModule &&
                                    notificationCount >= 1 &&
                                    evictionMeta !== undefined
                                        ? {
                                              eviction_last_summons_for_collection: Boolean(
                                                  evictionMeta.forCollection
                                              ),
                                              eviction_last_collection_summons_branch:
                                                  evictionMeta.forCollection
                                                      ? evictionMeta.branch
                                                      : null,
                                          }
                                        : {}),
                                    updatedAt: new Date().toISOString(),
                                } as ExecutionFile);
                            }
                            try {
                                const key = executionStorageKey(String(executionData.id));
                                const merged = {
                                    ...executionData,
                                    ...(targetIsPrimary ? { debtorNotificationDate: date } : {}),
                                    ...buildDebtorNoticePatchForKey(
                                        executionData,
                                        targetDebtorKey,
                                        primaryDebtorKeyResolved,
                                        { notificationDate: date }
                                    ),
                                    isHolidayExtension: nextHoliday,
                                    ...initialFeesPatch,
                                    ...(isEvictionExecutionModule &&
                                    notificationCount >= 1 &&
                                    evictionMeta !== undefined
                                        ? {
                                              eviction_last_summons_for_collection: Boolean(
                                                  evictionMeta.forCollection
                                              ),
                                              eviction_last_collection_summons_branch:
                                                  evictionMeta.forCollection
                                                      ? evictionMeta.branch
                                                      : null,
                                          }
                                        : {}),
                                    updatedAt: new Date().toISOString(),
                                };
                                storageCache.set(key, merged);
                            } catch {
                                /* ignore */
                            }
                            handleNotifyDebtor(
                                date,
                                evictionMeta,
                                initialNoticeLawyerFeesIncluded,
                                purpose,
                                notifyOpts
                            );
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
                            activeCoerciveActions.includes('salary') &&
                            activeDebtorIsEmployee
                        }
                        onRegisterDebtorVoluntaryAttendance={registerDebtorVoluntaryAttendance}
                        onOpenCoerciveModal={() => {
                            setShowUnifiedSummonsModal(false);
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
                                      onRegisterAttendance: registerDebtorVoluntaryAttendance,
                                      onOpenCoercive: () => {
                                          setShowUnifiedSummonsModal(false);
                                          openExecutionSeizuresTab();
                                      },
                                  }
                                : undefined
                        }
                        employeeAssignmentFeature={{
                            enabled: employeeAssignmentTabEnabled,
                            state: resolvedEmployeeSummonsAssignment ?? null,
                            onConfirm: handleEmployeeAssignmentConfirm,
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
                                      state: getPublicationNoticeForDebtorKey(
                                          executionData,
                                          unifiedSummonsTargetDebtorKey
                                      ),
                                      onRegister: handlePublicationNoticeRegister,
                                      onTerminate: handlePublicationNoticeTerminate,
                                      onDebtorAttended: handlePublicationNoticeDebtorAttended,
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
                        tablighTask={
                            scopedSummonsMarker?.date
                                ? {
                                      noticeDateYmd: String(scopedSummonsMarker.date),
                                      purpose: String(scopedSummonsMarker.purpose || 'تبليغ'),
                                  }
                                : null
                        }
                        onTerminateTablighTask={terminateDebtorSummonsMarker}
                        guarantorNotificationFeature={{
                            enabled: isGuarantorSummonsEligible(executionData),
                            contextOnly: summonsHubInitialMainTab === 'guarantor',
                            state: executionData?.guarantor_notification ?? null,
                            onRegister: (p) => {
                                const d = String(p.noticeDateYmd || '').trim();
                                const r = String(p.reason || '').trim();
                                if (!d || !r) {
                                    showToast('أكمل تاريخ التبليغ وسبب التكليف بالحضور.', 'warning');
                                    return;
                                }
                                persistExecutionMerge({
                                    guarantor_notification: {
                                        noticeDateYmd: d,
                                        reason: r,
                                        endedAt: null,
                                        attendedAt: null,
                                    },
                                });
                                const ts = new Date().toISOString();
                                pushTimelineEvent({
                                    id: nextTimelineId(),
                                    date: ts.slice(0, 10),
                                    timestamp: ts,
                                    title: 'تبليغ / تكليف الكفيل بالحضور',
                                    description: `تاريخ التبليغ: ${d}\nالسبب: ${r}`,
                                    type: 'procedure',
                                    source: 'مركز التبليغ',
                                });
                                showToast('تم تسجيل تبليغ / تكليف الكفيل بالحضور.', 'success');
                            },
                            onAttend: () => {
                                const now = new Date().toISOString();
                                const prev = executionData?.guarantor_notification;
                                persistExecutionMerge({
                                    guarantor_notification: {
                                        noticeDateYmd: String(prev?.noticeDateYmd || '').trim(),
                                        reason: String(prev?.reason || '').trim(),
                                        endedAt: now,
                                        attendedAt: now,
                                    },
                                });
                                pushTimelineEvent({
                                    id: nextTimelineId(),
                                    date: now.slice(0, 10),
                                    timestamp: now,
                                    title: 'حضور الكفيل / إنهاء التبليغ',
                                    description: 'تم إنهاء تبليغ الكفيل بعد تسجيل الحضور.',
                                    type: 'procedure',
                                    source: 'مركز التبليغ',
                                });
                                showToast('تم إنهاء تبليغ الكفيل.', 'success');
                            },
                            onTerminate: () => {
                                const now = new Date().toISOString();
                                const prev = executionData?.guarantor_notification;
                                persistExecutionMerge({
                                    guarantor_notification: {
                                        noticeDateYmd: String(prev?.noticeDateYmd || '').trim(),
                                        reason: String(prev?.reason || '').trim(),
                                        endedAt: now,
                                        attendedAt: null,
                                    },
                                });
                                pushTimelineEvent({
                                    id: nextTimelineId(),
                                    date: now.slice(0, 10),
                                    timestamp: now,
                                    title: 'إنهاء تبليغ الكفيل',
                                    description: 'تم إنهاء تبليغ الكفيل.',
                                    type: 'procedure',
                                    source: 'مركز التبليغ',
                                });
                                showToast('تم إنهاء تبليغ الكفيل.', 'success');
                            },
                        }}
                    />
                </Suspense>
            )}
        </>
    );
};
