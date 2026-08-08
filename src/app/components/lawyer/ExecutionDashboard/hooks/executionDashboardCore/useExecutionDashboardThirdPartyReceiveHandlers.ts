import { useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { ExecutionFile, ThirdPartySeizureAsset } from '@/app/types/execution';
import type { TimelineEvent } from '@/app/types/execution';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    buildThirdPartyReceiveTimelineDescription,
    mapThirdPartyAssetToReceived,
    validateThirdPartyReceiveAmount,
} from './executionDashboardThirdPartyReceive';

export type UseExecutionDashboardThirdPartyReceiveHandlersParams = {
    thirdPartySeizureSnapshotRef: RefObject<ThirdPartySeizureAsset[]>;
    setThirdPartySeizureAssets: Dispatch<SetStateAction<ThirdPartySeizureAsset[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    seizureMatrixLedgerParamsRef: MutableRefObject<UnifiedLedgerTotalParams | null>;
    pushTimelineEvent: (
        ev: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    nextTimelineId: () => string;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
};

export function useExecutionDashboardThirdPartyReceiveHandlers({
    thirdPartySeizureSnapshotRef,
    setThirdPartySeizureAssets,
    persistExecutionMerge,
    showToast,
    decisionsStorageExecutionId,
    executionData,
    executionId,
    seizureMatrixLedgerParamsRef,
    pushTimelineEvent,
    nextTimelineId,
    setUnifiedLedgerRevision,
}: UseExecutionDashboardThirdPartyReceiveHandlersParams) {
    const beginThirdPartyReceiveStep = useCallback(
        (asset: ThirdPartySeizureAsset) => {
            if (asset.record_locked) return;
            const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
                a.id === asset.id
                    ? {
                          ...a,
                          awaiting_receive: true,
                          receive_amount_draft: a.receive_amount_draft ?? '',
                      }
                    : { ...a, awaiting_receive: false, receive_amount_draft: '' },
            );
            setThirdPartySeizureAssets(nextAssets);
            persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
        },
        [persistExecutionMerge, setThirdPartySeizureAssets, thirdPartySeizureSnapshotRef],
    );

    const updateThirdPartyReceiveDraft = useCallback(
        (assetId: string, v: string) => {
            const cleaned = formatNumberInput(String(v || ''));
            const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
                a.id === assetId ? { ...a, receive_amount_draft: cleaned } : a,
            );
            setThirdPartySeizureAssets(nextAssets);
            persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
        },
        [persistExecutionMerge, setThirdPartySeizureAssets, thirdPartySeizureSnapshotRef],
    );

    const cancelThirdPartyReceiveStep = useCallback(
        (asset: ThirdPartySeizureAsset) => {
            const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
                a.id === asset.id ? { ...a, awaiting_receive: false, receive_amount_draft: '' } : a,
            );
            setThirdPartySeizureAssets(nextAssets);
            persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
        },
        [persistExecutionMerge, setThirdPartySeizureAssets, thirdPartySeizureSnapshotRef],
    );

    const confirmThirdPartyReceive = useCallback(
        (asset: ThirdPartySeizureAsset) => {
            const row = thirdPartySeizureSnapshotRef.current.find((a) => a.id === asset.id) ?? asset;
            if (row.record_locked) return;
            const validation = validateThirdPartyReceiveAmount(String(row.receive_amount_draft || ''));
            if (!validation.ok) {
                showToast(validation.ok === false ? validation.message : 'مبلغ غير صالح', 'warning');
                return;
            }
            const parsed = validation.amountIqd;
            const today = getLocalTodayYmd();
            const now = new Date().toISOString();
            const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
                a.id === row.id ? mapThirdPartyAssetToReceived(row, parsed, today, now) : a,
            );
            setThirdPartySeizureAssets(nextAssets);
            const exId = requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId,
                executionId,
                executionData: executionData as Record<string, unknown> | null,
            });
            const trustCredit = creditThirdPartySeizureFunds(
                exId,
                {
                    amountIqd: parsed,
                    thirdPartySeizureId: String(row.id),
                    thirdPartyName: row.thirdPartyName,
                    at: now,
                },
                seizureMatrixLedgerParamsRef.current,
            );
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: now,
                    title: '💰 استلام أموال محجوزة لدى الغير',
                    description: buildThirdPartyReceiveTimelineDescription(
                        row.thirdPartyName,
                        parsed,
                        trustCredit.ok,
                    ),
                    type: 'payment',
                    source: 'المركز المالي — حجز لدى الغير',
                    metadata: {
                        timelineThreadKey: `third_party_received:${row.id}`,
                        thirdPartyAssetId: row.id,
                        actualReceivedAmountIqd: String(parsed),
                        ...(trustCredit.paymentId ? { trustPaymentId: trustCredit.paymentId } : {}),
                    },
                },
                { mergePatch: { thirdPartySeizureAssets: nextAssets } },
            );
            if (trustCredit.ok) {
                setUnifiedLedgerRevision((v) => v + 1);
                showToast(
                    `تم تسجيل الاستلام وإيداع ${parsed.toLocaleString('ar-IQ')} د.ع في الأمانات — يُخصم من المتبقي.`,
                    'success',
                );
            } else {
                showToast('تم تسجيل الاستلام لكن تعذّر ربط المبلغ بالمركز المالي.', 'warning');
            }
        },
        [
            decisionsStorageExecutionId,
            executionData?.id,
            executionId,
            nextTimelineId,
            pushTimelineEvent,
            seizureMatrixLedgerParamsRef,
            setThirdPartySeizureAssets,
            setUnifiedLedgerRevision,
            showToast,
            thirdPartySeizureSnapshotRef,
        ],
    );

    return {
        beginThirdPartyReceiveStep,
        updateThirdPartyReceiveDraft,
        cancelThirdPartyReceiveStep,
        confirmThirdPartyReceive,
    };
}
