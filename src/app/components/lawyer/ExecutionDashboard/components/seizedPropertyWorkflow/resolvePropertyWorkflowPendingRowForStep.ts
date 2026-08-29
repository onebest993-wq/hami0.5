import {
    executorSubtypesForPropertyWorkflowStep,
    findSeizureDecisionForProperty,
} from '../../utils/propertySeizureWorkflowUtils';

export function resolvePropertyWorkflowPendingRowForStep(
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    stepIndex: number,
    optimisticObjectionDecisionId: string | null,
    preferredSubtype?: string,
    optimisticPendingBySubtype?: Record<string, string>,
): Record<string, unknown> | null {
    if (preferredSubtype) {
        const row = findSeizureDecisionForProperty(decisions, preferredSubtype, propertyId, {
            pendingOnly: true,
        });
        if (row) return row;
        const optimisticId = String(optimisticPendingBySubtype?.[preferredSubtype] || '').trim();
        if (optimisticId) {
            return {
                id: optimisticId,
                title: preferredSubtype === 'property_expert'
                    ? 'طلب انتداب خبراء — عقار (قيد البت لدى المنفذ)'
                    : 'طلب حجز — عقار (قيد البت لدى المنفذ)',
                executorOutcome: 'pending',
                requestKind: 'seizure',
                seizureSubtype: preferredSubtype,
            } as Record<string, unknown>;
        }
        if (
            preferredSubtype === 'property_expert_objection' &&
            String(optimisticObjectionDecisionId || '').trim()
        ) {
            const oid = String(optimisticObjectionDecisionId || '').trim();
            return (
                decisions.find((r) => String(r?.id || '').trim() === oid) ||
                ({
                    id: oid,
                    title: 'طلب الاعتراض على التقدير — عقار (قيد البت لدى المنفذ)',
                    executorOutcome: 'pending',
                    requestKind: 'seizure',
                    seizureSubtype: preferredSubtype,
                } as Record<string, unknown>)
            );
        }
        return null;
    }
    for (const st of executorSubtypesForPropertyWorkflowStep(stepIndex)) {
        const row = findSeizureDecisionForProperty(decisions, st, propertyId, {
            pendingOnly: true,
        });
        if (row) return row;
    }
    return null;
}
