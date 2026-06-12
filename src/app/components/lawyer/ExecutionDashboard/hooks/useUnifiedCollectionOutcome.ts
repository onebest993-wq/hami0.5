import { useEffect, type MutableRefObject } from 'react';
import {
    matchesExecutionOutcomeEvent,
    type ExecutionDecisionOutcomeDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionDecisionOutcomeHelpers';

export function useUnifiedCollectionOutcome(input: {
    executionDataId?: string;
    executionId?: string;
    setEvictionAssetsTabUnlocked: (v: boolean) => void;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: string }
    ) => void;
}) {
    const {
        executionDataId,
        executionId,
        setEvictionAssetsTabUnlocked,
        persistExecutionMergeRef,
        showToast,
    } = input;

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<ExecutionDecisionOutcomeDetail>).detail;
            const myId = String(executionDataId ?? executionId ?? '');
            if (!matchesExecutionOutcomeEvent(detail, myId)) return;
            if (detail?.requestKind !== 'unified_collection') return;
            const decisionId = String(detail?.decisionId || '').trim();
            const outcome = String(detail?.outcome ?? '');
            if (outcome === 'approved') {
                setEvictionAssetsTabUnlocked(true);
                queueMicrotask(() =>
                    persistExecutionMergeRef.current?.({ eviction_assets_tab_unlocked: true })
                );
                showToast('وافق المنفذ على طلب الاستحصال.', 'success', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
                return;
            }
            if (outcome === 'rejected') {
                showToast('رُفض طلب الاستحصال — راجع الأسباب.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
                return;
            }
            if (outcome === 'alternative') {
                showToast('صدر قرار بديل بخصوص طلب الاستحصال — راجع التفاصيل.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            }
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        executionDataId,
        executionId,
        persistExecutionMergeRef,
        setEvictionAssetsTabUnlocked,
        showToast,
    ]);
}
