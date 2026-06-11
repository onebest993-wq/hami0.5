import React, { Suspense } from 'react';

export interface PersonalTabProps {
    personalTabLockedForEmployee: boolean;
    onConfirmUnlock: () => void;
    activeNoticeState: string | null;
    debtorSummonsProfile: string;
    setDebtorForcedToAttend: React.Dispatch<React.SetStateAction<boolean>>;
    setActiveNoticeState: React.Dispatch<React.SetStateAction<string | null>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: 'current' | 'previous' | 'appeals' }) => void;
    setNonInterferenceIssued: React.Dispatch<React.SetStateAction<boolean>>;
    debtorArrested: boolean;
    setDebtorArrested: React.Dispatch<React.SetStateAction<boolean>>;
    showEmployeeAssignmentCoerciveBlock: boolean;
    resolvedEmployeeSummonsAssignment: any;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyEmployeeAssignmentCoerciveFollowupBlock: React.LazyExoticComponent<React.ComponentType<any>>;
    forcedBringDecisionState: { pending: boolean; approved: boolean; rejected: boolean };
    employeeForcedBringAwaitingPersonalOutcome: boolean;
    LazyPersonalCoerciveFollowupPanel: React.LazyExoticComponent<React.ComponentType<any>>;
    decisionsStorageExecutionId?: string;
    decisionsReloadEpoch: number;
    coerciveUiLocked: boolean;
    debtorAttendedVoluntarily: boolean;
    debtorForcedToAttend: boolean;
    voluntaryAttendanceCount: number;
    isEvictionExecutionModule: boolean;
    executionData: Record<string, any> | null | undefined;
    voluntaryEndOptimistic: boolean;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    forcedSummoningAnalysis: { canForceSummon: boolean; lockReasonAr: string };
    viewExecutionData: Record<string, any> | null | undefined;
    isHistoricalMode: boolean;
    remaining: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (event: any, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    assignmentWorkspaceCtx: { activeDebtorKey: string };
    primaryDebtorKeyResolved: string;
    onOpenDecisions: (opts?: { tab?: string; decisionId?: string }) => void;
    onOpenSummonsCenter: () => void;
    onOpenGuarantorDetails: () => void;
    kasabTerminationEmphasis: boolean;
    activeDebtorIsEmployee: boolean;
    hidePersonalJudgePresentation?: boolean;
    hidePersonalForcedBringActivation?: boolean;
    activeDebtorNoticeScope: Record<string, any>;
    handleEmployeeAssignmentRequestInvestigation: () => void;
    handleEmployeeRegisterArrestOrder: () => void;
    handleEmployeeAssignmentRequestForcedBring: () => void;
    handleEmployeeAssignmentResolveForcedBringOutcome: (which: 'brought' | 'absconded') => void;
    handleEmployeeWarrantOutcome: (which: 'brought' | 'terminate') => void;
    handleEmployeeAssignmentTerminate: () => void;
}

export const PersonalTab: React.FC<PersonalTabProps> = ({
    personalTabLockedForEmployee,
    onConfirmUnlock,
    activeNoticeState,
    debtorSummonsProfile,
    setDebtorForcedToAttend,
    setActiveNoticeState,
    showToast,
    setNonInterferenceIssued,
    debtorArrested,
    setDebtorArrested,
    showEmployeeAssignmentCoerciveBlock,
    resolvedEmployeeSummonsAssignment,
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    forcedBringDecisionState,
    employeeForcedBringAwaitingPersonalOutcome,
    LazyPersonalCoerciveFollowupPanel,
    decisionsStorageExecutionId,
    decisionsReloadEpoch,
    coerciveUiLocked,
    debtorAttendedVoluntarily,
    debtorForcedToAttend,
    voluntaryAttendanceCount,
    isEvictionExecutionModule,
    executionData,
    voluntaryEndOptimistic,
    noticeVoluntaryPeriodEndOptimistic,
    forcedSummoningAnalysis,
    viewExecutionData,
    isHistoricalMode,
    remaining,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    assignmentWorkspaceCtx,
    primaryDebtorKeyResolved,
    onOpenDecisions,
    onOpenSummonsCenter,
    onOpenGuarantorDetails,
    kasabTerminationEmphasis,
    activeDebtorIsEmployee,
    hidePersonalJudgePresentation = false,
    hidePersonalForcedBringActivation = false,
    activeDebtorNoticeScope,
    handleEmployeeAssignmentRequestInvestigation,
    handleEmployeeRegisterArrestOrder,
    handleEmployeeAssignmentRequestForcedBring,
    handleEmployeeAssignmentResolveForcedBringOutcome,
    handleEmployeeWarrantOutcome,
    handleEmployeeAssignmentTerminate,
}) => {
    const resolvedExecutionId = String(decisionsStorageExecutionId || viewExecutionData?.id || executionData?.id || '')
        .trim();
    const allowWrite = !coerciveUiLocked && !isHistoricalMode;
    return personalTabLockedForEmployee ? (
        <div className="p-5">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-right">
                <p className="text-amber-300 text-sm font-bold mb-2">
                    🔒 التنفيذ الجبري الشخصي مقفل للمدين الموظف
                </p>
                <p className="text-amber-100/85 text-xs leading-relaxed">
                    المدين موظف. هل أنت متأكد من فتح هذا التبويب؟ لن تظهر الخيارات حتى تؤكد
                    أنك تفهم الإجراء.
                </p>
                <button
                    type="button"
                    onClick={onConfirmUnlock}
                    className="mt-3 w-full rounded-xl border border-amber-400/55 bg-gradient-to-r from-amber-900/40 to-amber-800/30 py-2.5 text-[11px] font-extrabold text-amber-100 hover:from-amber-800/50 hover:to-amber-700/35"
                >
                    أتفهم الأمر — افتح
                </button>
            </div>
        </div>
    ) : (
        <div className="p-4 sm:p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            {showEmployeeAssignmentCoerciveBlock &&
            resolvedEmployeeSummonsAssignment ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyEmployeeAssignmentCoerciveFollowupBlock
                        assignment={resolvedEmployeeSummonsAssignment}
                        onRequestInvestigation={
                            handleEmployeeAssignmentRequestInvestigation
                        }
                        onRegisterArrestOrder={
                            handleEmployeeRegisterArrestOrder
                        }
                        onRequestForcedBring={
                            handleEmployeeAssignmentRequestForcedBring
                        }
                        forcedBringPending={forcedBringDecisionState.pending}
                        forcedBringApprovedAwaitingOutcome={
                            employeeForcedBringAwaitingPersonalOutcome
                        }
                        forcedBringRejected={forcedBringDecisionState.rejected}
                        onWarrantDebtorBrought={() =>
                            employeeForcedBringAwaitingPersonalOutcome
                                ? handleEmployeeAssignmentResolveForcedBringOutcome(
                                      'brought'
                                  )
                                : handleEmployeeWarrantOutcome('brought')
                        }
                        onWarrantTerminate={() =>
                            employeeForcedBringAwaitingPersonalOutcome
                                ? handleEmployeeAssignmentResolveForcedBringOutcome(
                                      'absconded'
                                  )
                                : handleEmployeeWarrantOutcome('terminate')
                        }
                        onTerminateAssignment={
                            handleEmployeeAssignmentTerminate
                        }
                    />
                </Suspense>
            ) : (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyPersonalCoerciveFollowupPanel
                        executionId={resolvedExecutionId || undefined}
                        decisionsReloadEpoch={decisionsReloadEpoch}
                        coerciveUiLocked={coerciveUiLocked}
                        gracePeriodEndedFlag={Boolean(
                            activeDebtorNoticeScope.memoAnchorDate ||
                                debtorAttendedVoluntarily ||
                                debtorForcedToAttend ||
                                voluntaryAttendanceCount > 0 ||
                                activeDebtorNoticeScope.voluntaryPeriodEndDeclared ||
                                (isEvictionExecutionModule
                                    ? executionData?.eviction_voluntary_period_end_declared ||
                                      voluntaryEndOptimistic
                                    : executionData?.notice_voluntary_period_end_declared ||
                                      noticeVoluntaryPeriodEndOptimistic)
                        )}
                        forcedSummonAllowed={
                            forcedSummoningAnalysis.canForceSummon
                        }
                        forcedSummonLockReason={
                            forcedSummoningAnalysis.lockReasonAr
                        }
                        executionData={viewExecutionData}
                        isHistoricalMode={isHistoricalMode}
                        debtorPresentEffective={Boolean(
                            debtorAttendedVoluntarily ||
                                debtorForcedToAttend
                        )}
                        debtRemainingIqd={remaining}
                        persistExecutionMerge={persistExecutionMerge}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        showToast={showToast}
                        activeDebtorKey={assignmentWorkspaceCtx.activeDebtorKey}
                        primaryDebtorKey={primaryDebtorKeyResolved}
                        onOpenDecisions={onOpenDecisions}
                        onOpenSummonsCenter={onOpenSummonsCenter}
                        onOpenGuarantorDetails={onOpenGuarantorDetails}
                        kasabCoerciveEmphasis={kasabTerminationEmphasis}
                        kasabRelaxedGates={!activeDebtorIsEmployee}
                        hideDossierJudgePresentation={hidePersonalJudgePresentation}
                        hideExecutorForcedBringActivation={hidePersonalForcedBringActivation}
                        activeDebtorIsEmployee={activeDebtorIsEmployee}
                    />
                </Suspense>
            )}
        </div>
    );
};
