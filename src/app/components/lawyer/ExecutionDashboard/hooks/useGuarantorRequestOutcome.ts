import { useEffect } from 'react';
import {
    matchesExecutionOutcomeEvent,
    type ExecutionDecisionOutcomeDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionDecisionOutcomeHelpers';
import { dispatchOpenGuarantorRequestCompletion } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';

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
            if (outcome === 'approved' || outcome === 'alternative') {
                showToast('وافق المنفذ على طلب إدخال الكفيل الضامن — أكمل البيانات.', 'success', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'current',
                });
                dispatchOpenGuarantorRequestCompletion(myId, decisionId);
            } else if (outcome === 'rejected') {
                showToast('رُفض طلب إدخال الكفيل الضامن.', 'info', {
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
