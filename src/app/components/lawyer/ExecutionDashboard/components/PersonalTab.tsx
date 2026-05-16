import React, { Suspense } from 'react';
import { Shield } from 'lucide-react';

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
            {activeNoticeState === 'forced_attendance' &&
                debtorSummonsProfile === 'employee_monetary' &&
                !debtorForcedToAttend ? (
                <div className="space-y-2">
                    <button
                        type="button"
                        disabled={!allowWrite}
                        onClick={() => {
                            if (!allowWrite) return;
                            setDebtorForcedToAttend(true);
                            setActiveNoticeState(null);
                            const nowIso = new Date().toISOString();
                            pushTimelineEvent({
                                id: nextTimelineId(),
                                date: nowIso.slice(0, 10),
                                timestamp: nowIso,
                                title: '⛓️ تم إجبار المدين على الحضور',
                                description:
                                    'تم تنفيذ مذكرة الإحضار الجبري وإجبار المدين على المثول أمام المحكمة',
                                type: 'coercive',
                                source: 'محضر المتابعة — التنفيذ الجبري الشخصي',
                                metadata: { executionId: resolvedExecutionId || undefined },
                            } as any);
                            showToast('⛓️ تم تسجيل الإحضار الجبري', 'success');
                        }}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                    >
                        ⛓️ تم إجبار المدين على الحضور
                    </button>
                    <button
                        type="button"
                        disabled={!allowWrite}
                        onClick={() => {
                            if (!allowWrite) return;
                            setNonInterferenceIssued(true);
                            const nowIso = new Date().toISOString();
                            pushTimelineEvent({
                                id: nextTimelineId(),
                                date: nowIso.slice(0, 10),
                                timestamp: nowIso,
                                title: '📜 تم تزويد المدين بكتاب عدم تعرض',
                                description: 'صدر كتاب عدم تعرض قانوني للمدين',
                                type: 'other',
                                source: 'محضر المتابعة — التنفيذ الجبري الشخصي',
                                metadata: { executionId: resolvedExecutionId || undefined },
                            } as any);
                            showToast('📜 تم إصدار كتاب عدم التعرض', 'info');
                        }}
                        className="w-full backdrop-blur-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Shield size={16} />
                        📜 تزويد بكتاب عدم تعرض
                    </button>
                </div>
            ) : null}

            {activeNoticeState === 'arrest_warrant' && !debtorArrested ? (
                <div className="space-y-2">
                    <button
                        type="button"
                        disabled={!allowWrite}
                        onClick={() => {
                            if (!allowWrite) return;
                            setDebtorArrested(true);
                            setActiveNoticeState(null);
                            const nowIso = new Date().toISOString();
                            pushTimelineEvent({
                                id: nextTimelineId(),
                                date: nowIso.slice(0, 10),
                                timestamp: nowIso,
                                title: '🚔 تم إلقاء القبض على المدين',
                                description: 'تم تنفيذ أمر القبض وإلقاء القبض على المدين',
                                type: 'coercive',
                                source: 'محضر المتابعة — التنفيذ الجبري الشخصي',
                                metadata: { executionId: resolvedExecutionId || undefined },
                            } as any);
                            showToast('🚔 تم تسجيل إلقاء القبض', 'success');
                        }}
                        className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                    >
                        🚔 تم إلقاء القبض
                    </button>
                    <button
                        type="button"
                        disabled={!allowWrite}
                        onClick={() => {
                            if (!allowWrite) return;
                            setNonInterferenceIssued(true);
                            const nowIso = new Date().toISOString();
                            pushTimelineEvent({
                                id: nextTimelineId(),
                                date: nowIso.slice(0, 10),
                                timestamp: nowIso,
                                title: '📜 تم تزويد المدين بكتاب عدم تعرض',
                                description: 'صدر كتاب عدم تعرض قانوني للمدين',
                                type: 'other',
                                source: 'محضر المتابعة — التنفيذ الجبري الشخصي',
                                metadata: { executionId: resolvedExecutionId || undefined },
                            } as any);
                            showToast('📜 تم إصدار كتاب عدم التعرض', 'info');
                        }}
                        className="w-full backdrop-blur-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Shield size={16} />
                        📜 تزويد بكتاب عدم تعرض
                    </button>
                </div>
            ) : null}

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
                    />
                </Suspense>
            )}
        </div>
    );
};
