import {
    appendExecutiveDetentionJudgeDecision,
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
    resolveExecutorDecisionRowContext,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildExecutiveDetentionJudgeRejectedClosurePatch } from '@/app/components/lawyer/execution/coerciveStackUtils';

export function recordExecutiveDetentionJudgeOutcome(args: {
    outcome: 'approved' | 'rejected';
    now: string;
    rejectionReason?: string;
    opts?: { suppressToast?: boolean };
    detentionJudgeEligibleDecisionId: string | null | undefined;
    findGoverningDossierDecisionId: () => string | null | undefined;
    exId: string;
    showToast: (
        message: string,
        type?: string,
        opts?: { action?: { label: string; onClick: () => void } },
    ) => void;
    activeDebtorKey: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    applyOptimisticPersistPatch: (patch: Record<string, unknown>) => void;
    primaryDebtorKey: string;
    setDossierInlineResolved: (value: null) => void;
    pushTimelineEvent: (event: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: Record<string, unknown>;
    setLocalDecisionsTick: (fn: (n: number) => number) => void;
    setJudgeDetailsOpen: (open: boolean) => void;
    setDetentionRejectionOpen: (open: boolean) => void;
    setDetentionRejectionReason: (reason: string) => void;
    goBackToPersonalCoerciveHub: () => void;
    onOpenDecisions: (opts: { tab: string; decisionId?: string }) => void;
}): boolean {
    const parentId = args.detentionJudgeEligibleDecisionId || args.findGoverningDossierDecisionId();
    if (!parentId || !args.exId) {
        args.showToast('تعذّر تسجيل قرار القاضي — لا يوجد طلب عرض إضبارة مرتبط.', 'error');
        return false;
    }
    const storageId =
        String(
            resolveExecutorDecisionRowContext(args.exId, parentId)?.storageExecutionId || args.exId,
        ).trim() || args.exId;
    const submitted = appendExecutiveDetentionJudgeDecision({
        executionId: storageId,
        parentExecutorDecisionId: parentId,
        outcome: args.outcome,
        rejectionReason: args.rejectionReason,
        debtorKey: args.activeDebtorKey,
    });
    const judgeDecisionId = submitted.decisionId;
    if (!judgeDecisionId || !submitted.ok) {
        args.showToast('تعذّر حفظ قرار القاضي — أعد المحاولة من مركز القرارات.', 'error');
        return false;
    }
    const reason = String(args.rejectionReason ?? '').trim();
    const judgePatch: Record<string, unknown> =
        args.outcome === 'rejected'
            ? buildExecutiveDetentionJudgeRejectedClosurePatch(args.now, reason, judgeDecisionId)
            : {
                  executive_detention_judge_decision_id: judgeDecisionId,
                  executive_dossier_phase: 'judge_decided',
                  executive_detention_judge_outcome: args.outcome,
                  executive_detention_judge_rejection_reason: null,
              };
    const persisted = args.persistExecutionMerge(judgePatch);
    if (persisted === false) {
        args.showToast('تعذّر حفظ قرار القاضي على ملف التنفيذ — أعِد المحاولة.', 'error');
        return false;
    }
    args.applyOptimisticPersistPatch(judgePatch);
    if (args.outcome === 'rejected' && args.exId) {
        archiveExecutiveDetentionCycleDecisions({
            executionId: args.exId,
            debtorKey: args.activeDebtorKey,
            primaryDebtorKey: args.primaryDebtorKey,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: args.exId,
            subtype: 'forced_bring_in',
            debtorKey: args.activeDebtorKey,
            primaryDebtorKey: args.primaryDebtorKey,
        });
        args.setDossierInlineResolved(null);
        dispatchDecisionsReload();
    }
    args.pushTimelineEvent({
        id: args.nextTimelineId(),
        date: getLocalTodayYmd(),
        timestamp: args.now,
        title:
            args.outcome === 'approved'
                ? '⚖️ وافق قاضي البداءة على حبس المدين'
                : '⚖️ رفض قاضي البداءة حبس المدين',
        description:
            args.outcome === 'rejected' && reason
                ? `سبب الرفض: ${reason}`
                : args.outcome === 'approved'
                  ? 'قرار مستقل عن موافقة المنفذ على عرض الإضبارة.'
                  : undefined,
        type: 'decision',
        source: 'محضر المتابعة',
        metadata: {
            ...args.debtorTimelineMeta,
            timelineThreadKey: `executor_decision:${judgeDecisionId}`,
            decisionRowId: judgeDecisionId,
        },
    });
    args.setLocalDecisionsTick((n) => n + 1);
    if (args.outcome === 'approved') {
        args.setJudgeDetailsOpen(true);
    }
    if (args.outcome === 'rejected') {
        args.setDetentionRejectionOpen(false);
        args.setDetentionRejectionReason('');
        args.goBackToPersonalCoerciveHub();
    }
    if (args.opts?.suppressToast) return true;
    args.showToast(
        args.outcome === 'approved'
            ? 'وافق القاضي — يحق للمدين التمييز دون تظلم. يمكنك بدء مدة الحبس أدناه.'
            : 'رُفض الحبس — يحق للدائن التمييز دون تظلم.',
        args.outcome === 'approved' ? 'success' : 'info',
        {
            action: {
                label: 'فتح قرار التمييز في القرارات',
                onClick: () =>
                    args.onOpenDecisions({
                        tab: 'previous',
                        decisionId: judgeDecisionId,
                    }),
            },
        },
    );
    return true;
}
