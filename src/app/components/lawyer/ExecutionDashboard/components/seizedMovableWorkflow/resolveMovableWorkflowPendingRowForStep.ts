import {
    executorSubtypesForMovableWorkflowStep,
    findSeizureDecisionForMovable,
} from '../../utils/movableSeizureWorkflowUtils';

export function resolveMovableWorkflowPendingRowForStep(
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    stepIndex: number,
    optimisticObjectionDecisionId: string | null,
    preferredSubtype?: string,
    optimisticPendingBySubtype?: Record<string, string>,
): Record<string, unknown> | null {
    if (preferredSubtype) {
        const row = findSeizureDecisionForMovable(decisions, preferredSubtype, movableId, {
            pendingOnly: true,
        });
        if (row) return row;
        const optimisticId = String(optimisticPendingBySubtype?.[preferredSubtype] || '').trim();
        if (optimisticId) {
            const titleBySubtype: Record<string, string> = {
                movable_expert: 'طلب انتداب خبراء — مال منقول (قيد البت لدى المنفذ)',
                movable_expert_objection: 'طلب الاعتراض على التقدير — مال منقول (قيد البت لدى المنفذ)',
                movable_auction_date: 'طلب تحديد موعد مزايدة — مال منقول (قيد البت لدى المنفذ)',
            };
            return {
                id: optimisticId,
                title: titleBySubtype[preferredSubtype] || 'طلب حجز — مال منقول (قيد البت لدى المنفذ)',
                executorOutcome: 'pending',
                requestKind: 'seizure',
                seizureSubtype: preferredSubtype,
            } as Record<string, unknown>;
        }
        if (
            preferredSubtype === 'movable_expert_objection' &&
            String(optimisticObjectionDecisionId || '').trim()
        ) {
            const oid = String(optimisticObjectionDecisionId || '').trim();
            return (
                decisions.find((r) => String(r?.id || '').trim() === oid) ||
                ({
                    id: oid,
                    title: 'طلب الاعتراض على التقدير — مال منقول (قيد البت لدى المنفذ)',
                    executorOutcome: 'pending',
                    requestKind: 'seizure',
                    seizureSubtype: preferredSubtype,
                } as Record<string, unknown>)
            );
        }
        return null;
    }
    for (const st of executorSubtypesForMovableWorkflowStep(stepIndex)) {
        const row = findSeizureDecisionForMovable(decisions, st, movableId, {
            pendingOnly: true,
        });
        if (row) return row;
    }
    return null;
}
