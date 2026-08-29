import {
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { ExecutionFile } from '@/app/types/execution';

export function applyPersonalCoerciveInlineResolvedResult(params: {
    result: {
        ok: boolean;
        outcome?: 'approved' | 'rejected';
        personalCoerciveSubtype?: string;
        storageExecutionId?: string;
        decisionId?: string;
    };
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    showToast: (message: string, type?: string) => void;
    setForcedInlineResolved: (v: 'approved' | 'rejected' | null) => void;
    setDossierInlineResolved: (v: 'approved' | 'rejected' | null) => void;
    setForcedOutcomePick: (v: string) => void;
    setJudgeDetailsOpen: (open: boolean) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    executionData: ExecutionFile | null | undefined;
    activeDebtorKey: string | undefined;
    primaryDebtorKey: string | undefined;
    exId: string;
}) {
    const {
        result,
        setLocalDecisionsTick,
        showToast,
        setForcedInlineResolved,
        setDossierInlineResolved,
        setForcedOutcomePick,
        setJudgeDetailsOpen,
        persistExecutionMerge,
        executionData,
        activeDebtorKey,
        primaryDebtorKey,
        exId,
    } = params;

    setLocalDecisionsTick((n) => n + 1);
    if (!result.ok) {
        showToast(
            'تعذّر تسجيل قرار المنفذ — تحقق من مركز القرارات أو أعد المحاولة.',
            'error',
        );
        return;
    }
    const subtype = String(result.personalCoerciveSubtype || '').trim() as PersonalCoerciveSubtype;
    const outcome = result.outcome;
    if (subtype === 'forced_bring_in' && (outcome === 'approved' || outcome === 'rejected')) {
        setForcedInlineResolved(outcome);
    }
    if (
        subtype === 'executive_dossier_presentation' &&
        (outcome === 'approved' || outcome === 'rejected')
    ) {
        setDossierInlineResolved(outcome);
    }
    if (
        subtype &&
        outcome &&
        (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
    ) {
        const mergeDecisionId = String(result.decisionId ?? '').trim();
        const merge = buildPersonalCoerciveExecutionMerge({
            subtype,
            resolution: outcome,
            decisionId: mergeDecisionId || undefined,
        });
        const forcedApproveReset =
            subtype === 'forced_bring_in' && outcome === 'approved'
                ? {
                      forced_bring_in_personal_outcome: null,
                      debtorEvaded: false,
                  }
                : {};
        const payload = { ...forcedApproveReset, ...merge };
        if (
            subtype === 'travel_ban' &&
            executionData &&
            (outcome === 'approved' || outcome === 'rejected')
        ) {
            Object.assign(
                payload,
                buildDebtorTravelBanActivePatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    outcome === 'approved',
                ),
            );
            if (outcome === 'approved') {
                Object.assign(
                    payload,
                    buildDebtorTravelBanWithdrawnPatch(
                        executionData,
                        activeDebtorKey,
                        primaryDebtorKey,
                        null,
                    ),
                    buildDebtorTravelBanCycleWithdrawnPatch(
                        executionData,
                        activeDebtorKey,
                        primaryDebtorKey,
                        null,
                    ),
                );
            }
        }
        if (Object.keys(payload).length > 0) persistExecutionMerge(payload);
    }
    if (subtype === 'forced_bring_in' && outcome === 'approved') {
        setForcedOutcomePick('');
        showToast('تمت موافقة المنفذ — سجّل نتيجة الإحضار الجبري أدناه.', 'success');
    }
    if (subtype === 'executive_dossier_presentation' && outcome === 'approved') {
        setJudgeDetailsOpen(true);
        if (exId) {
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'executive_dossier_presentation',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
        }
        showToast('انتهى طلب عرض الإضبارة — سجّل قرار قاضي البداءة في البطاقة أدناه.', 'success');
    }
    if (subtype === 'travel_ban' && outcome === 'approved' && exId) {
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'travel_ban',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
    }
    dispatchDecisionsReload();
}
