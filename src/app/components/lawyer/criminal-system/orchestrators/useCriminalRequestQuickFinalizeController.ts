import { useCallback, useMemo, useState } from 'react';
import { isTimelineNextDateInvalid } from '../criminalStageRuntimeCore';
import type { LawyerRequest } from '../criminalStore';
import {
    isLawyerRequestExecuted,
    isLawyerRequestLocked,
} from '../lawyerRequestStatusMachine';

type QuickFinalizeStatus = 'approved' | 'rejected';
export function useCriminalRequestQuickFinalizeController() {
    const [quickFinalizeRequest, setQuickFinalizeRequest] = useState<LawyerRequest | null>(null);
    const [quickFinalizeStatus, setQuickFinalizeStatus] = useState<QuickFinalizeStatus>('approved');
    const [quickFinalizeMargin, setQuickFinalizeMargin] = useState('');
    const [quickFinalizeDate, setQuickFinalizeDate] = useState('');

    const closeQuickFinalizeModal = useCallback(() => {
        setQuickFinalizeRequest(null);
        setQuickFinalizeMargin('');
        setQuickFinalizeDate('');
        setQuickFinalizeStatus('approved');
    }, []);

    const openRequestQuickFinalizeModal = useCallback(
        (request: LawyerRequest, onOpenLockedRequest: (request: LawyerRequest) => void) => {
            if (isLawyerRequestExecuted(request.status) || isLawyerRequestLocked(request)) {
                onOpenLockedRequest(request);
                return;
            }
            setQuickFinalizeRequest(request);
            setQuickFinalizeStatus('approved');
            setQuickFinalizeMargin('');
            setQuickFinalizeDate(new Date().toISOString().slice(0, 10));
        },
        [],
    );

    const quickFinalizeDecisionBeforeRequest = useMemo(() => {
        if (!quickFinalizeRequest) return false;
        const requestDate = String(quickFinalizeRequest.requestDate ?? '').trim();
        const decisionDate = quickFinalizeDate.trim();
        if (!requestDate || !decisionDate) return false;
        return isTimelineNextDateInvalid(requestDate, decisionDate);
    }, [quickFinalizeRequest, quickFinalizeDate]);

    const submitQuickFinalize = useCallback(
        (
            onPromptFatalLock: (status: QuickFinalizeStatus, onConfirm: () => void) => void,
            onCommitFinalize: (
                status: QuickFinalizeStatus,
                requestId: string,
                fields: { judgeMargin: string; decisionDate: string },
            ) => void,
        ) => {
            if (!quickFinalizeRequest) return;
            const judgeMargin = quickFinalizeMargin.trim();
            const decisionDate = quickFinalizeDate.trim();
            if (!judgeMargin || !decisionDate || quickFinalizeDecisionBeforeRequest) return;
            onPromptFatalLock(quickFinalizeStatus, () =>
                onCommitFinalize(quickFinalizeStatus, quickFinalizeRequest.id, {
                    judgeMargin,
                    decisionDate,
                }),
            );
        },
        [
            quickFinalizeRequest,
            quickFinalizeMargin,
            quickFinalizeDate,
            quickFinalizeDecisionBeforeRequest,
            quickFinalizeStatus,
        ],
    );

    return {
        quickFinalizeRequest,
        quickFinalizeStatus,
        quickFinalizeMargin,
        quickFinalizeDate,
        setQuickFinalizeStatus,
        setQuickFinalizeMargin,
        setQuickFinalizeDate,
        closeQuickFinalizeModal,
        openRequestQuickFinalizeModal,
        quickFinalizeDecisionBeforeRequest,
        submitQuickFinalize,
    };
}
