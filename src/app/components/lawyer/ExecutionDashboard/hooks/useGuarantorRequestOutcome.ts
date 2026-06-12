import { useEffect } from 'react';
import {
    matchesExecutionOutcomeEvent,
    type ExecutionDecisionOutcomeDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionDecisionOutcomeHelpers';

export function useGuarantorRequestOutcome(input: {
    executionDataId?: string;
    executionId?: string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: string }
    ) => void;
}) {
    const { executionDataId, executionId, showToast } = input;

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<ExecutionDecisionOutcomeDetail>).detail;
            const myId = String(executionDataId ?? executionId ?? '');
            if (!matchesExecutionOutcomeEvent(detail, myId)) return;
            if (detail?.requestKind !== 'guarantor_request') return;
            const decisionId = String(detail?.decisionId || '').trim();
            const outcome = String(detail?.outcome ?? '');
            if (outcome === 'approved') {
                showToast('وافق المنفذ على طلب إدخال الكفيل الضامن.', 'success');
            } else if (outcome === 'rejected') {
                showToast('رُفض طلب إدخال الكفيل الضامن.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            } else if (outcome === 'alternative') {
                showToast('سُجِّل قرار بديل بشأن طلب الكفيل الضامن.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            }
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [executionDataId, executionId, showToast]);
}
