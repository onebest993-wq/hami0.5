import type { TimelineEvent } from '@/app/types/execution';
import {
    closePersonalCoerciveSubtypeDecisionCycle,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { syncPersonalCoerciveWithdrawn } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';

export interface UsePersonalCoerciveForcedBringActionsOptions {
    forcedSync: PersonalCoerciveAppealSyncView;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { action?: { label: string; onClick: () => void } }
    ) => void;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
    findLatestDecisionIdForSubtype: (subtype: PersonalCoerciveSubtype) => string | null;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: TimelineEvent['metadata'];
    exId: string;
    exKey: string | undefined;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    forcedBringWithdrawBusy: boolean;
    setForcedBringWithdrawBusy: (busy: boolean) => void;
    setForcedBringWithdrawConfirmOpen: (open: boolean) => void;
}

/**
 * أفعال دورة الإحضار الجبري والمفاتحة إلى محكمة التحقيق — تسجيل النتيجة الميدانية،
 * صدور مذكرة القبض، تأمين الإحضار، والتنازل عن مسار المفاتحة.
 */
export function usePersonalCoerciveForcedBringActions({
    forcedSync,
    showToast,
    onOpenDecisions,
    findLatestDecisionIdForSubtype,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    debtorTimelineMeta,
    exId,
    exKey,
    activeDebtorKey,
    primaryDebtorKey,
    setLocalDecisionsTick,
    forcedBringWithdrawBusy,
    setForcedBringWithdrawBusy,
    setForcedBringWithdrawConfirmOpen,
}: UsePersonalCoerciveForcedBringActionsOptions) {
    const recordForcedOutcome = (v: 'brought' | 'absconded') => {
        if (forcedSync.blocksFieldwork) {
            showToast(
                forcedSync.followupBlock?.message ??
                    'لا يمكن تسجيل النتيجة — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: forcedSync.decisionsNav.decisionsTab,
                                decisionId:
                                    forcedSync.decisionId ??
                                    findLatestDecisionIdForSubtype('forced_bring_in') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const now = new Date().toISOString();
        const label = v === 'brought' ? '✅ تم إحضار المدين أمام المنفذ' : '⚠️ المدين متخفي عن الأنظار';
        const basePatch =
            v === 'brought'
                ? {
                      forcedAttendanceIssued: false,
                      activeNoticeState: null,
                      forced_bring_in_personal_outcome: 'brought',
                      forced_bring_in_personal_followup_logged: true,
                      debtorForcedToAttend: true,
                      debtorAttendedVoluntarily: true,
                      debtorEvaded: false,
                      investigationCourtRequested: false,
                      investigationMemoIssued: false,
                      investigationPathDebtorPresent: false,
                      personal_arrest_investigation_session_open: false,
                      personal_arrest_warrant_stage: 'none',
                      debtor_wanted_arrest_warrant: false,
                  }
                : {
                      forced_bring_in_personal_outcome: 'absconded',
                      forced_bring_in_personal_followup_logged: true,
                      forcedAttendanceIssued: false,
                      activeNoticeState: null,
                      debtorEvaded: true,
                      debtorAttendedVoluntarily: false,
                      investigationPathDebtorPresent: false,
                      debtor_arrest_warrant_cleared_after_custody: false,
                      personal_arrest_warrant_stage: 'pending_court',
                      personal_arrest_investigation_session_open: true,
                      investigationCourtRequested: true,
                      investigation_court_withdrawn_at: null,
                  };
        persistExecutionMerge(basePatch);
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: label,
            description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        if (v === 'brought') {
            showToast('تم التسجيل وتصفير دورة الإحضار الجبري لإتاحة طلب جديد عند الحاجة.', 'success');
        } else {
            showToast('تم التسجيل — يمكنك الآن إرسال طلب مفاتحة محكمة التحقيق من القسم أدناه.', 'success');
        }
    };

    const closeInvestigationAndForcedBringDecisionCycles = () => {
        if (!exId) return;
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'arrest_warrant_investigation',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setLocalDecisionsTick((n) => n + 1);
    };

    const recordInvestigationDebtorAttended = () => {
        persistExecutionMerge({
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: 'brought',
            forced_bring_in_personal_followup_logged: true,
            debtorForcedToAttend: true,
            debtorAttendedVoluntarily: true,
            debtorEvaded: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: true,
            personal_arrest_investigation_session_open: false,
            personal_arrest_warrant_stage: 'none',
            debtor_wanted_arrest_warrant: false,
        });
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم حضور المدين (مفاتحة محكمة التحقيق)',
            description: 'تسجيل مثول المدين دون صدور أمر قبض — أُغلقت دورة المفاتحة والإحضار الجبري.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم التسجيل وإغلاق دورة المفاتحة.', 'success');
    };

    const markWarrantIssued = () => {
        persistExecutionMerge({
            personal_arrest_warrant_stage: 'issued',
            debtor_wanted_arrest_warrant: true,
            debtor_arrest_warrant_cleared_after_custody: false,
            personal_arrest_investigation_session_open: false,
        });
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '🔴 تم صدور أمر القبض',
            description: 'تأشير على صدور مذكرة القبض. (المدين)',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تسجيل صدور أمر القبض — أكمل بتأمين الإحضار.', 'success');
    };

    const recordSecuredBringAfterWarrant = () => {
        persistExecutionMerge({
            debtor_arrest_warrant_cleared_after_custody: true,
            debtorArrested: true,
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: 'brought',
            forced_bring_in_personal_followup_logged: true,
            debtorForcedToAttend: true,
            debtorAttendedVoluntarily: true,
            debtorEvaded: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: true,
            personal_arrest_investigation_session_open: false,
            personal_arrest_warrant_stage: 'none',
            debtor_wanted_arrest_warrant: false,
        });
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين',
            description: 'تسجيل تنفيذ مذكرة القبض وتأمين الإحضار — أُغلقت دورة المفاتحة والإحضار الجبري.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تأمين الإحضار وإغلاق دورة المفاتحة.', 'success');
    };

    const withdrawInvestigationCourtPath = () => {
        if (forcedBringWithdrawBusy) return;
        setForcedBringWithdrawBusy(true);
        const now = new Date().toISOString();
        const arrestDecisionId = findLatestDecisionIdForSubtype('arrest_warrant_investigation');
        if (arrestDecisionId && exKey) {
            syncPersonalCoerciveWithdrawn({
                executionId: exKey,
                decisionId: arrestDecisionId,
                subtype: 'arrest_warrant_investigation',
                extraMerge: { investigation_court_withdrawn_at: now },
            });
        } else {
            persistExecutionMerge({
                investigation_court_withdrawn_at: now,
                investigationCourtRequested: false,
                investigationMemoIssued: false,
                investigationPathDebtorPresent: false,
                personal_arrest_investigation_session_open: false,
                personal_arrest_warrant_stage: 'none',
                debtor_wanted_arrest_warrant: false,
                debtor_arrest_warrant_cleared_after_custody: false,
                forced_bring_in_personal_outcome: null,
                debtorEvaded: false,
            });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: '↩️ التراجع عن مفاتحة محكمة التحقيق',
                description:
                    'تنازل عن مسار المفاتحة — أُعيد تفعيل الإحضار الجبري لتسجيل النتيجة. تظهر بطاقة المفاتحة مجدداً بعد تسجيل «متخفي» من جديد.',
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
        }
        setForcedBringWithdrawConfirmOpen(false);
        setForcedBringWithdrawBusy(false);
        showToast('تم التنازل عن مفاتحة التحقيق — سجّل نتيجة الإحضار الجبري من جديد عند الحاجة.', 'success');
    };

    return {
        recordForcedOutcome,
        closeInvestigationAndForcedBringDecisionCycles,
        recordInvestigationDebtorAttended,
        markWarrantIssued,
        recordSecuredBringAfterWarrant,
        withdrawInvestigationCourtPath,
    };
}
