import React from 'react';
import type { EmployeeSummonsAssignmentState, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { EmployeeAssignmentCoerciveFollowupBlockProps } from '@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock';
import type { PersonalCoerciveFollowupPanelProps } from '@/app/components/lawyer/execution/personalCoercive/types';
import type { ActiveDebtorNoticeScope } from '../hooks/executionDashboardCore/useExecutionDashboardVoluntaryPeriodHandlers';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';

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
    resolvedEmployeeSummonsAssignment: EmployeeSummonsAssignmentState | null;
    EXEC_SECTION_LAZY_FALLBACK: React.ReactNode;
    LazyEmployeeAssignmentCoerciveFollowupBlock: React.LazyExoticComponent<
        React.ComponentType<EmployeeAssignmentCoerciveFollowupBlockProps>
    >;
    forcedBringDecisionState: { pending: boolean; approved: boolean; rejected: boolean };
    employeeForcedBringAwaitingPersonalOutcome: boolean;
    LazyPersonalCoerciveFollowupPanel: React.LazyExoticComponent<
        React.ComponentType<PersonalCoerciveFollowupPanelProps>
    >;
    decisionsStorageExecutionId?: string;
    decisionsReloadEpoch: number;
    coerciveUiLocked: boolean;
    debtorAttendedVoluntarily: boolean;
    debtorForcedToAttend: boolean;
    voluntaryAttendanceCount: number;
    isEvictionExecutionModule: boolean;
    executionData: ExecutionFile | null | undefined;
    voluntaryEndOptimistic: boolean;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    forcedSummoningAnalysis: { canForceSummon: boolean; lockReasonAr: string };
    viewExecutionData: ExecutionFile | null | undefined;
    isHistoricalMode: boolean;
    remaining: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    assignmentWorkspaceCtx: { activeDebtorKey: string };
    primaryDebtorKeyResolved: string;
    onOpenDecisions: (opts?: { tab?: string; decisionId?: string }) => void;
    onOpenSummonsCenter: () => void;
    onOpenGuarantorDetails: () => void;
    kasabTerminationEmphasis: boolean;
    activeDebtorIsEmployee: boolean;
    custodyRemovalClaimActive?: boolean;
    hidePersonalJudgePresentation?: boolean;
    hidePersonalForcedBringActivation?: boolean;
    hideExecutiveDetentionJudgeCard?: boolean;
    earnerFinancialPersonalCoerciveActive?: boolean;
    activeDebtorNoticeScope: ActiveDebtorNoticeScope;
    handleEmployeeAssignmentRequestInvestigation: () => void;
    handleEmployeeRegisterArrestOrder: () => void;
    handleEmployeeAssignmentRequestForcedBring: () => void;
    handleEmployeeAssignmentResolveForcedBringOutcome: (
        which: 'brought' | 'absconded' | 'dismissed',
    ) => void;
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
    EXEC_SECTION_LAZY_FALLBACK: _EXEC_SECTION_LAZY_FALLBACK,
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
    custodyRemovalClaimActive = false,
    hidePersonalJudgePresentation = false,
    hidePersonalForcedBringActivation = false,
    hideExecutiveDetentionJudgeCard = false,
    earnerFinancialPersonalCoerciveActive = false,
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
                    className={`mt-3 w-full rounded-xl border border-amber-400/55 bg-gradient-to-r from-amber-900/40 to-amber-800/30 py-2.5 text-[11px] font-extrabold text-amber-100 hover:from-amber-800/50 hover:to-amber-700/35 ${EXEC_MODAL_TOUCH_TARGET}`}
                >
                    أتفهم الأمر — افتح
                </button>
            </div>
        </div>
    ) : (
        <div className="space-y-5 p-3 text-right" dir="rtl" onClick={(e) => e.stopPropagation()}>
            {showEmployeeAssignmentCoerciveBlock &&
            resolvedEmployeeSummonsAssignment ? (
                <PreloadableOverlayGate
                    lazy={LazyEmployeeAssignmentCoerciveFollowupBlock}
                    lazyProps={{
                        assignment: resolvedEmployeeSummonsAssignment,
                        onRequestInvestigation: handleEmployeeAssignmentRequestInvestigation,
                        onRegisterArrestOrder: handleEmployeeRegisterArrestOrder,
                        onRequestForcedBring: handleEmployeeAssignmentRequestForcedBring,
                        forcedBringPending: forcedBringDecisionState.pending,
                        forcedBringApprovedAwaitingOutcome:
                            employeeForcedBringAwaitingPersonalOutcome,
                        forcedBringRejected: forcedBringDecisionState.rejected,
                        onWarrantDebtorBrought: () => handleEmployeeWarrantOutcome('brought'),
                        onWarrantTerminate: () => handleEmployeeWarrantOutcome('terminate'),
                        onForcedBringOutcome: handleEmployeeAssignmentResolveForcedBringOutcome,
                        onTerminateAssignment: handleEmployeeAssignmentTerminate,
                    }}
                    fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                />
            ) : activeDebtorIsEmployee && !custodyRemovalClaimActive ? (
                <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4 text-right">
                    <p className="text-sky-200 text-sm font-bold mb-2">المدين موظف</p>
                    <p className="text-sky-100/85 text-xs leading-relaxed">
                        مسارات التنفيذ الجبري الشخصي للكاسب (منع السفر، الإحضار الجبري، الحبس، وعرض
                        الإضبارة) لا تنطبق على المدين الموظف في مطالبات الاستحصال المالي. استخدم تبويب
                        «طلبات الحجز المالية» لحجز الراتب والإجراءات المرتبطة بالتكليف.
                    </p>
                </div>
            ) : (
                <PreloadableOverlayGate
                    lazy={LazyPersonalCoerciveFollowupPanel}
                    lazyProps={{
                        executionId: resolvedExecutionId || undefined,
                        decisionsReloadEpoch,
                        coerciveUiLocked,
                        gracePeriodEndedFlag: Boolean(
                            activeDebtorNoticeScope.memoAnchorDate ||
                                debtorAttendedVoluntarily ||
                                debtorForcedToAttend ||
                                voluntaryAttendanceCount > 0 ||
                                activeDebtorNoticeScope.voluntaryPeriodEndDeclared ||
                                (isEvictionExecutionModule
                                    ? executionData?.eviction_voluntary_period_end_declared ||
                                      voluntaryEndOptimistic
                                    : executionData?.notice_voluntary_period_end_declared ||
                                      noticeVoluntaryPeriodEndOptimistic),
                        ),
                        forcedSummonAllowed: forcedSummoningAnalysis.canForceSummon,
                        forcedSummonLockReason: forcedSummoningAnalysis.lockReasonAr,
                        executionData: viewExecutionData ?? null,
                        isHistoricalMode,
                        debtorPresentEffective: Boolean(
                            debtorAttendedVoluntarily || debtorForcedToAttend,
                        ),
                        debtRemainingIqd: remaining,
                        persistExecutionMerge,
                        pushTimelineEvent,
                        nextTimelineId,
                        showToast,
                        activeDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
                        primaryDebtorKey: primaryDebtorKeyResolved,
                        onOpenDecisions,
                        onOpenSummonsCenter,
                        onOpenGuarantorDetails,
                        kasabCoerciveEmphasis: kasabTerminationEmphasis,
                        kasabRelaxedGates: !activeDebtorIsEmployee || custodyRemovalClaimActive,
                        hideDossierJudgePresentation: hidePersonalJudgePresentation,
                        hideExecutiveDetentionJudgeCard,
                        earnerFinancialPersonalCoerciveActive,
                        hideExecutorForcedBringActivation: hidePersonalForcedBringActivation,
                        activeDebtorIsEmployee,
                    }}
                    fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                />
            )}
        </div>
    );
};
