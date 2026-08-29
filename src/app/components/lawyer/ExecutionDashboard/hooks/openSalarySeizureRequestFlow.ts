import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { dispatchOpenSeizureCompletion } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import type { SeizureDecisionRow } from './useSeizureRequestsTabDecisions.types';

export async function openSalarySeizureRequestFlow(input: {
    seizureActionsDisabled: boolean;
    hasActiveSalarySeizure: boolean;
    salaryRowForUi: SeizureDecisionRow | null;
    openDecisions: (id: string) => void;
    resolvedExecutionId: string;
    decisions: SeizureDecisionRow[];
    coerciveUiLocked: boolean;
    setInlineActionGateKey: (key: string) => void;
}): Promise<void> {
    if (input.seizureActionsDisabled) return;
    if (input.hasActiveSalarySeizure) {
        const open = await SmartDialog.confirm('تم حجز الراتب فعلاً. هل تريد فتح الطلب؟', {
            title: 'حجز الراتب',
            confirmText: 'فتح الطلب',
            cancelText: 'إلغاء',
        });
        if (!open) return;
        const did = String(input.salaryRowForUi?.id || '').trim();
        if (did) {
            input.openDecisions(did);
            return;
        }
        try {
            window.dispatchEvent(
                new CustomEvent('hami-open-unified-seizure-log', { detail: { tab: 'salary' } }),
            );
        } catch {
            /* ignore */
        }
        return;
    }
    const did = String(input.salaryRowForUi?.id || '').trim();
    if (did) {
        const outcome = String(input.salaryRowForUi?.executorOutcome ?? 'pending').trim();
        const alternative = outcome === 'alternative';
        const rejected = isExecutorRowRejectedAndFinal(input.salaryRowForUi);
        const approved =
            !rejected &&
            (alternative || isExecutorRowApprovedWorkflowActive(input.salaryRowForUi, input.decisions));
        const savedAt = String(input.salaryRowForUi?.seizureRequestSavedAt || '').trim();
        const needsCompletion = approved && !savedAt;
        if (needsCompletion) {
            const exId = String(input.resolvedExecutionId || '').trim();
            if (exId && did) dispatchOpenSeizureCompletion(exId, did);
            return;
        }
        if (approved && savedAt) {
            input.openDecisions(did);
            return;
        }
        input.openDecisions(did);
        return;
    }
    if (input.coerciveUiLocked) return;
    input.setInlineActionGateKey('seizure_salary');
}
