import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    appendExecutiveDetentionJudgeDecision,
    closePersonalCoerciveSubtypeDecisionCycle,
} from '@/app/utils/executorSeizureDecisionQueue';
import { resolveExecutorDecisionRowContext } from '@/app/utils/executorDecisionReadQueries';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { appendImplicitForcedBringBroughtPatch } from '@/app/components/lawyer/execution/coerciveStackUtils';

export interface UsePersonalCoerciveDetentionActionsOptions {
    executionData: ExecutionFile | null;
    forcedApproved: boolean;
    detentionJudgeEligibleDecisionId: string | null | undefined;
    exId: string;
    findGoverningDossierDecisionId: () => string | null;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { action?: { label: string; onClick: () => void } }
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: TimelineEvent['metadata'];
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
    inAbsentia: boolean;
    setJudgeDetailsOpen: (open: boolean) => void;
}

/**
 * أفعال قرار القاضي والحبس التنفيذي — إخلاء السبيل، تسجيل قرار القاضي، وبدء عدّاد الحبس.
 */
export function usePersonalCoerciveDetentionActions({
    executionData,
    forcedApproved,
    detentionJudgeEligibleDecisionId,
    exId,
    findGoverningDossierDecisionId,
    activeDebtorKey,
    primaryDebtorKey,
    showToast,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    debtorTimelineMeta,
    setLocalDecisionsTick,
    onOpenDecisions,
    inAbsentia,
    setJudgeDetailsOpen,
}: UsePersonalCoerciveDetentionActionsOptions) {
    /** إخلاء سبيل — يُنهي مسار الحبس التنفيذي فقط دون المساس بباقي الإجراءات الجبرية */
    const buildReleaseDetentionPatch = (): Record<string, unknown> => {
        const base: Record<string, unknown> = {
            executive_detention_released_or_closed_at: new Date().toISOString(),
            debtor_executive_detention_active: false,
            executive_detention_until: null,
            executive_detention_days_total: null,
            executive_detention_reminder_sent: false,
            executive_detention_judge_outcome: null,
            executive_detention_judge_eligible_decision_id: null,
            executive_detention_judge_decision_id: null,
            executive_detention_judge_rejection_reason: null,
            executive_dossier_phase: null,
            executive_detention_request_in_absentia: false,
            personal_coercive_cycle_closed_at: null,
        };
        return appendImplicitForcedBringBroughtPatch(base, executionData, forcedApproved);
    };

    const recordExecutiveDetentionJudgeOutcome = (
        outcome: 'approved' | 'rejected',
        now: string,
        rejectionReason?: string
    ) => {
        const parentId = detentionJudgeEligibleDecisionId || findGoverningDossierDecisionId();
        if (!parentId || !exId) {
            showToast('تعذّر تسجيل قرار القاضي — لا يوجد طلب عرض إضبارة مرتبط.', 'error');
            return;
        }
        const storageId =
            String(resolveExecutorDecisionRowContext(exId, parentId)?.storageExecutionId || exId).trim() || exId;
        const submitted = appendExecutiveDetentionJudgeDecision({
            executionId: storageId,
            parentExecutorDecisionId: parentId,
            outcome,
            rejectionReason,
            debtorKey: activeDebtorKey,
        });
        const judgeDecisionId = submitted.decisionId;
        if (!judgeDecisionId || !submitted.ok) {
            showToast('تعذّر حفظ قرار القاضي — أعد المحاولة من مركز القرارات.', 'error');
            return;
        }
        persistExecutionMerge({
            executive_detention_judge_decision_id: judgeDecisionId,
            executive_dossier_phase: 'judge_decided',
            executive_detention_judge_outcome: outcome,
            executive_detention_judge_rejection_reason:
                outcome === 'rejected' && rejectionReason ? rejectionReason : null,
        });
        const reason = String(rejectionReason ?? '').trim();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: outcome === 'approved' ? '⚖️ وافق قاضي البداءة على حبس المدين' : '⚖️ رفض قاضي البداءة حبس المدين',
            description:
                outcome === 'rejected' && reason
                    ? `سبب الرفض: ${reason}`
                    : outcome === 'approved'
                      ? 'قرار مستقل عن موافقة المنفذ على عرض الإضبارة.'
                      : undefined,
            type: 'decision',
            source: 'محضر المتابعة',
            metadata: {
                ...debtorTimelineMeta,
                timelineThreadKey: `executor_decision:${judgeDecisionId}`,
                decisionRowId: judgeDecisionId,
            },
        });
        setLocalDecisionsTick((n) => n + 1);
        showToast(
            outcome === 'approved'
                ? 'وافق القاضي — يحق للمدين التمييز دون تظلم. يمكنك بدء مدة الحبس أدناه.'
                : 'رُفض الحبس — يحق للدائن التمييز دون تظلم.',
            outcome === 'approved' ? 'success' : 'info',
            {
                action: {
                    label: 'فتح قرار التمييز في القرارات',
                    onClick: () =>
                        onOpenDecisions({
                            tab: 'previous',
                            decisionId: judgeDecisionId,
                        }),
                },
            }
        );
    };

    const startDetentionFourMonths = (opts?: { markCustody?: boolean; markArrested?: boolean }) => {
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 4);
        const until = formatDateToLocalYmd(end);
        let patch: Record<string, unknown> = {
            debtor_executive_detention_active: true,
            executive_detention_days_total: 120,
            executive_detention_until: until,
            executive_detention_reminder_sent: false,
            executive_dossier_phase: 'detention_active',
            executive_detention_released_or_closed_at: null,
            personal_coercive_cycle_closed_at: null,
        };
        patch = appendImplicitForcedBringBroughtPatch(patch, executionData, forcedApproved);
        if (opts?.markArrested) {
            patch.debtorArrested = true;
        }
        if (opts?.markCustody || !inAbsentia) {
            patch.debtor_arrest_warrant_cleared_after_custody = true;
        }
        const now = new Date().toISOString();
        persistExecutionMerge(patch);
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: inAbsentia ? '🔒 بدء مدة الحبس التنفيذي (4 أشهر) — غيابي' : '🔒 بدء مدة الحبس التنفيذي (4 أشهر)',
            description: `تُحتسب مدة الحبس التنفيذي تلقائياً 4 أشهر حتى ${until}.`,
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        if (exId) {
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'executive_detention_judge',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            setLocalDecisionsTick((n) => n + 1);
        }
        setJudgeDetailsOpen(false);
        showToast('تم تفعيل العداد لمدة 4 أشهر.', 'success');
    };

    return {
        buildReleaseDetentionPatch,
        recordExecutiveDetentionJudgeOutcome,
        startDetentionFourMonths,
    };
}
