import { useEffect } from 'react';
import { getExecutorDecisionRowById } from '@/app/utils/executorSeizureDecisionQueue';
import {
    matchesExecutionOutcomeEvent,
    type ExecutionDecisionOutcomeDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionDecisionOutcomeHelpers';

export function useSeizureApprovalToast(input: {
    executionDataId?: string;
    executionId?: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
    const { executionDataId, executionId, showToast } = input;

    useEffect(() => {
        const myId = String(executionDataId ?? executionId ?? '');
        if (!myId) return;

        const onOutcome = (e: Event) => {
            const detail = (e as CustomEvent<ExecutionDecisionOutcomeDetail>).detail;
            if (!matchesExecutionOutcomeEvent(detail, myId)) return;
            if (String(detail?.requestKind ?? '') !== 'seizure') return;
            const outcome = String(detail?.outcome ?? '');
            if (outcome !== 'approved' && outcome !== 'alternative') return;
            const decisionId = String(detail?.decisionId ?? '').trim();
            if (!decisionId) return;
            const row = getExecutorDecisionRowById(myId, decisionId) as { seizureSubtype?: string; seizureRequestSavedAt?: string } | null;
            const subtype = String(row?.seizureSubtype || '').trim();
            const savedAt = String(row?.seizureRequestSavedAt || '').trim();
            if (!subtype || savedAt) return;
            if (subtype.startsWith('property_')) return;
            if (
                subtype !== 'property' &&
                subtype !== 'movable' &&
                subtype !== 'movable_auction' &&
                subtype !== 'salary' &&
                subtype !== 'notice' &&
                subtype !== 'third_party'
            ) {
                return;
            }
            showToast('تمت موافقة المنفذ على طلب الحجز.', 'success');
        };

        window.addEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
    }, [executionDataId, executionId, showToast]);
}
