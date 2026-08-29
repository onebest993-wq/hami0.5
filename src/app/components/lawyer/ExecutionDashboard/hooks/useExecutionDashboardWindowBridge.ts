import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { TimelineEvent } from '@/app/types/execution';
import { HAMI_RESIDENTIAL_GRACE_CLEARED } from '@/app/utils/residentialEvictionGrace';
import { stripResidentialGraceTimelineEvents } from '@/app/utils/residentialGraceTimeline';

export type UseExecutionResidentialGraceClearedListenerParams = {
    executionDataId: string | undefined;
    executionId: string | undefined;
    setEvictionVacateDeadlineLocal: (v: string | null) => void;
    setEvictionVacateDraft: (v: string) => void;
    setEvictionResidentialGracePeriodStart: (v: string | null) => void;
    setEvictionResidentialGraceManuallyEndedAt: (v: string | null) => void;
    setEvictionExecutorVacateGrantApproved: (v: boolean) => void;
    setGraceModalAllowResave: (v: boolean) => void;
    caseTasksPendingRef: React.MutableRefObject<NonNullable<ExecutionFile['caseTasksPending']>>;
    setCaseTasksPending: React.Dispatch<
        React.SetStateAction<NonNullable<ExecutionFile['caseTasksPending']>>
    >;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    persistExecutionMergeRef: React.MutableRefObject<
        ((patch: Record<string, unknown>) => void) | null
    >;
};

export function useExecutionResidentialGraceClearedListener(
    params: UseExecutionResidentialGraceClearedListenerParams,
) {
    const {
        executionDataId,
        executionId,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart,
        setEvictionResidentialGraceManuallyEndedAt,
        setEvictionExecutorVacateGrantApproved,
        setGraceModalAllowResave,
        caseTasksPendingRef,
        setCaseTasksPending,
        setTimelineEvents,
        persistExecutionMergeRef,
    } = params;

    useEffect(() => {
        const myId = String(executionDataId ?? executionId ?? '').trim();
        if (!myId) return;
        const onGraceCleared = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string }>;
            if (String(ce.detail?.executionId ?? '').trim() !== myId) return;
            setEvictionVacateDeadlineLocal(null);
            setEvictionVacateDraft('');
            setEvictionResidentialGracePeriodStart(null);
            setEvictionResidentialGraceManuallyEndedAt(null);
            setEvictionExecutorVacateGrantApproved(false);
            setGraceModalAllowResave(false);
            const nextTasks = (caseTasksPendingRef.current || []).filter(
                (t) => !String(t.id || '').startsWith('eviction-residential-grace-'),
            );
            setCaseTasksPending(nextTasks);
            setTimelineEvents((prev) => {
                const next = stripResidentialGraceTimelineEvents(prev);
                if (next.length === prev.length) return prev;
                queueMicrotask(() => persistExecutionMergeRef.current?.({ timelineEvents: next }));
                return next;
            });
        };
        window.addEventListener(HAMI_RESIDENTIAL_GRACE_CLEARED, onGraceCleared as EventListener);
        return () =>
            window.removeEventListener(HAMI_RESIDENTIAL_GRACE_CLEARED, onGraceCleared as EventListener);
    }, [
        executionDataId,
        executionId,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart,
        setEvictionResidentialGraceManuallyEndedAt,
        setEvictionExecutorVacateGrantApproved,
        setGraceModalAllowResave,
        caseTasksPendingRef,
        setCaseTasksPending,
        setTimelineEvents,
        persistExecutionMergeRef,
    ]);
}

export function useExecutionToastBridge(
    showToastRef: React.MutableRefObject<(message: string, type: 'success' | 'warning' | 'info') => void>,
) {
    useEffect(() => {
        const onToast = (e: Event) => {
            const ce = e as CustomEvent<{ message: string; type: 'success' | 'warning' | 'info' }>;
            if (ce.detail?.message) {
                showToastRef.current(ce.detail.message, ce.detail.type || 'success');
            }
        };
        window.addEventListener('hami-toast', onToast as EventListener);
        return () => window.removeEventListener('hami-toast', onToast as EventListener);
    }, [showToastRef]);
}

export type UseExecutionDecisionOutcomeToastBridgeParams = {
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    showUnifiedExecutionModalRef: React.MutableRefObject<boolean>;
    showToastRef: React.MutableRefObject<(message: string, type: 'success' | 'warning' | 'info') => void>;
};

export function useExecutionDecisionOutcomeToastBridge(
    params: UseExecutionDecisionOutcomeToastBridgeParams,
) {
    const {
        executionDataId,
        executionId,
        decisionsStorageExecutionId,
        showUnifiedExecutionModalRef,
        showToastRef,
    } = params;

    useEffect(() => {
        const myId = String(executionDataId ?? executionId ?? '');
        if (!myId) return;
        const handler = (e: Event) => {
            queueMicrotask(() => {
                const ce = e as CustomEvent<{
                    executionId?: string;
                    requestKind?: string;
                    outcome?: string;
                    decisionId?: string;
                    suppressNavigatorToast?: boolean;
                }>;
                const evId = String(ce.detail?.executionId ?? '');
                if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return;
                if (ce.detail?.suppressNavigatorToast === true) return;
                const outcome = String(ce.detail?.outcome ?? '');
                if (outcome !== 'approved' && outcome !== 'rejected' && outcome !== 'alternative') return;
                if (!String(ce.detail?.decisionId ?? '').trim()) return;
                if (!String(ce.detail?.requestKind ?? '').trim()) return;
                const kind = String(ce.detail?.requestKind ?? '').trim();
                if (
                    kind === 'seizure' ||
                    kind === 'unified_collection' ||
                    kind === 'guarantor_request' ||
                    kind === 'third_party_funds_received'
                )
                    return;
                if (showUnifiedExecutionModalRef.current) return;
                showToastRef.current(
                    outcome === 'approved' || outcome === 'alternative'
                        ? 'تم بتّ الطلب من المنفذ.'
                        : 'تم رفض الطلب من المنفذ.',
                    outcome === 'approved' || outcome === 'alternative' ? 'success' : 'info',
                );
            });
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [executionDataId, executionId, decisionsStorageExecutionId, showUnifiedExecutionModalRef, showToastRef]);
}
