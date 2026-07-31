import { useCallback, useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    closePersonalCoerciveSubtypeDecisionCycle,
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionReadQueries';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';

export interface UsePersonalCoerciveExecutorEventsOptions {
    exId: string;
    executionData: ExecutionFile | null;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: {
            decisionsLink?: boolean;
            decisionsTab?: 'current' | 'previous' | 'appeals';
            decisionId?: string;
            action?: { label: string; onClick: () => void };
        }
    ) => void;
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    setForcedInlineResolved: (v: 'approved' | 'rejected' | null) => void;
    setForcedOutcomePick: (v: 'brought' | 'absconded' | '') => void;
    setJudgeDetailsOpen: (v: boolean) => void;
}

/**
 * تعذّر تسجيل قرار المنفذ — نقطة الوصل بين بوابة التأكيد الداخلية (المحضر) ومستمعي
 * أحداث نتيجة القرار على مستوى النافذة (تحديث فوري قبل إعادة قراءة التخزين).
 */
export function usePersonalCoerciveExecutorEvents({
    exId,
    executionData,
    activeDebtorKey,
    primaryDebtorKey,
    persistExecutionMerge,
    showToast,
    setLocalDecisionsTick,
    setForcedInlineResolved,
    setForcedOutcomePick,
    setJudgeDetailsOpen,
}: UsePersonalCoerciveExecutorEventsOptions) {
    const handleExecutorInlineResolved = useCallback(
        (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
        }) => {
            setLocalDecisionsTick((n) => n + 1);
            if (!result.ok) {
                showToast(
                    'تعذّر تسجيل قرار المنفذ — تحقق من مركز القرارات أو أعد المحاولة.',
                    'error'
                );
                return;
            }
            const subtype = String(result.personalCoerciveSubtype || '').trim() as PersonalCoerciveSubtype;
            const outcome = result.outcome;
            if (subtype === 'forced_bring_in' && (outcome === 'approved' || outcome === 'rejected')) {
                setForcedInlineResolved(outcome);
            }
            if (
                subtype &&
                outcome &&
                (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
            ) {
                const merge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: outcome,
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
                showToast('انتهى دور المنفذ — سجّل قرار القاضي في البطاقة أدناه.', 'success');
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
        },
        [activeDebtorKey, exId, executionData, persistExecutionMerge, primaryDebtorKey, showToast, setForcedInlineResolved, setForcedOutcomePick, setJudgeDetailsOpen, setLocalDecisionsTick]
    );

    useEffect(() => {
        const bumpDecisions = () => setLocalDecisionsTick((n) => n + 1);
        const onOutcome = (e: Event) => {
            const d = (e as CustomEvent).detail ?? {};
            const evId = String(d.executionId ?? '').trim();
            const decisionId = String(d.decisionId ?? '').trim();
            const matchesPanel =
                !evId ||
                !exId ||
                evId === exId ||
                (decisionId &&
                    readExecutorDecisionsArray(exId).some(
                        (r) => String((r as { id?: string }).id ?? '') === decisionId
                    ));
            if (!matchesPanel) return;
            const subtype = String(d.personalCoerciveSubtype ?? '').trim() as PersonalCoerciveSubtype;
            const outcome = String(d.outcome ?? '').trim();
            const skipPanelMerge =
                subtype === 'executive_dossier_presentation' ||
                subtype === 'executive_detention' ||
                subtype === 'executive_detention_judge';
            if (
                !skipPanelMerge &&
                subtype &&
                (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
            ) {
                const merge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: outcome as 'approved' | 'rejected' | 'alternative',
                    decisionId: String(d.decisionId ?? '').trim() || undefined,
                });
                if (Object.keys(merge).length > 0) persistExecutionMerge(merge);
            }
            if (subtype === 'forced_bring_in' && (outcome === 'approved' || outcome === 'rejected')) {
                setForcedInlineResolved(outcome);
            }
            bumpDecisions();
        };
        window.addEventListener(DECISIONS_RELOAD_EVENT, bumpDecisions);
        window.addEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, bumpDecisions);
            window.removeEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        };
    }, [exId, persistExecutionMerge, setLocalDecisionsTick, setForcedInlineResolved]);

    return { handleExecutorInlineResolved };
}
