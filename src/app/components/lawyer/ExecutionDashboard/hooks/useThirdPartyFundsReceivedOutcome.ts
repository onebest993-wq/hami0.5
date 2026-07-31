import { useEffect, type MutableRefObject } from 'react';
import type { ExecutionFile, ThirdPartySeizure, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    buildThirdPartyFundsReceivedTimelineEvent,
    creditThirdPartySeizureFunds,
    markThirdPartySeizureFundsReceived,
    resolveThirdPartyFundsReceivedPayload,
    shouldHandleThirdPartyFundsReceivedOutcome,
    type ThirdPartyFundsReceivedOutcomeDetail,
} from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';

export type UseThirdPartyFundsReceivedOutcomeInput = {
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    executionDataId?: string;
    executionId?: string;
    decisionsStorageExecutionId?: string;
    setThirdPartySeizuresUi: React.Dispatch<React.SetStateAction<ThirdPartySeizure[]>>;
    clearThirdPartyFundsDraft: (seizureId: string) => void;
    getLedgerParams: () => UnifiedLedgerTotalParams | null;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    onLedgerRevision: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export function useThirdPartyFundsReceivedOutcome(input: UseThirdPartyFundsReceivedOutcomeInput) {
    const {
        executionDataRef,
        executionDataId,
        executionId,
        decisionsStorageExecutionId,
        setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft,
        getLedgerParams,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMergeRef,
        onLedgerRevision,
        showToast,
    } = input;

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<ThirdPartyFundsReceivedOutcomeDetail>).detail ?? {};
            const myId = String(executionDataId ?? executionId ?? '');
            if (
                !shouldHandleThirdPartyFundsReceivedOutcome(detail, myId, decisionsStorageExecutionId)
            ) {
                return;
            }

            const decisionId = String(detail.decisionId || '').trim();
            const payload = resolveThirdPartyFundsReceivedPayload(
                decisionsStorageExecutionId,
                decisionId
            );
            if (!payload) return;

            const prev = (executionDataRef.current?.thirdPartySeizures || []) as ThirdPartySeizure[];
            const nextSeizures = markThirdPartySeizureFundsReceived(
                prev,
                payload.seizureId,
                payload.amountIqd
            );
            if (!nextSeizures) return;

            const hit = prev.find((s) => String(s.id || '').trim() === payload.seizureId) || null;
            const partyName = payload.thirdPartyName || hit?.thirdPartyName || '—';

            setThirdPartySeizuresUi(nextSeizures);
            clearThirdPartyFundsDraft(payload.seizureId);

            const exId = String(
                decisionsStorageExecutionId ?? executionDataId ?? executionId ?? ''
            ).trim();
            const nowIso = new Date().toISOString();
            const trustCredit = creditThirdPartySeizureFunds(
                exId,
                {
                    amountIqd: payload.amountIqd,
                    thirdPartySeizureId: payload.seizureId,
                    thirdPartyName: partyName,
                    decisionRowId: decisionId,
                    at: nowIso,
                },
                getLedgerParams()
            );

            setTimelineEvents((prevTl) => {
                const ev = buildThirdPartyFundsReceivedTimelineEvent({
                    decisionId,
                    seizureId: payload.seizureId,
                    thirdPartyName: partyName,
                    amountIqd: payload.amountIqd,
                    trustCredit,
                    nowIso,
                    nextTimelineId,
                });
                const nextTl = [ev, ...prevTl];
                queueMicrotask(() =>
                    persistExecutionMergeRef.current?.({
                        thirdPartySeizures: nextSeizures,
                        timelineEvents: nextTl,
                    })
                );
                return nextTl;
            });

            if (trustCredit.ok) {
                onLedgerRevision();
            }

            showToast(
                trustCredit.ok
                    ? `تم اعتماد الاستلام وإيداع ${payload.amountIqd.toLocaleString('ar-IQ')} د.ع في الأمانات — يُخصم من المتبقي.`
                    : 'تم اعتماد الاستلام لكن تعذّر ربط المبلغ بالمركز المالي.',
                trustCredit.ok ? 'success' : 'warning'
            );
        };

        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        clearThirdPartyFundsDraft,
        decisionsStorageExecutionId,
        executionDataId,
        executionDataRef,
        executionId,
        getLedgerParams,
        nextTimelineId,
        onLedgerRevision,
        persistExecutionMergeRef,
        setThirdPartySeizuresUi,
        setTimelineEvents,
        showToast,
    ]);
}
