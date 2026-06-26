import type { MutableRefObject } from 'react';
import type { ExecutionFile, ThirdPartySeizure, TimelineEvent } from '@/app/types/execution';
import {
    getExecutorDecisionRowById,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';

export type SaveThirdPartySeizureInput = {
    decisionId: string;
    thirdPartyName: string;
    requestedAmountIqd: number;
    notificationDateIso: string;
};

export type RunSaveThirdPartySeizureParams = {
    input: SaveThirdPartySeizureInput;
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    getLocalTodayYmd: () => string;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        ev: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
    onSeizuresUpdated: (next: ThirdPartySeizure[]) => void;
};

export function runSaveThirdPartySeizureForDecision({
    input,
    decisionsStorageExecutionId,
    executionDataRef,
    getLocalTodayYmd,
    nextTimelineId,
    pushTimelineEvent,
    showToast,
    onSeizuresUpdated,
}: RunSaveThirdPartySeizureParams): void {
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return;
    const draft = {
        thirdPartyName: input.thirdPartyName,
        requestedAmountIqd: input.requestedAmountIqd,
        notificationDateIso: input.notificationDateIso,
    };
    const nowIso = new Date().toISOString();
    const today = getLocalTodayYmd();
    const prev = (executionDataRef.current?.thirdPartySeizures || []) as ThirdPartySeizure[];
    const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
    const entityId = String(existing?.id || `tps_${decisionId}_${Date.now()}`);
    const nextRow = {
        id: entityId,
        decisionRowId: decisionId,
        thirdPartyName: String(draft.thirdPartyName || '').trim(),
        requestedAmountIqd:
            typeof draft.requestedAmountIqd === 'number' && Number.isFinite(draft.requestedAmountIqd)
                ? Math.max(0, Math.trunc(draft.requestedAmountIqd))
                : null,
        notificationDateIso: String(draft.notificationDateIso || '').trim()
            ? String(draft.notificationDateIso).trim()
            : null,
        replyStatus: existing?.replyStatus || 'pending',
        transferredAmountIqd:
            typeof existing?.transferredAmountIqd === 'number' &&
            Number.isFinite(existing.transferredAmountIqd)
                ? Math.max(0, Math.trunc(existing.transferredAmountIqd))
                : null,
        status: existing?.status || 'notified',
    };
    const nextSeizures: ThirdPartySeizure[] = [
        nextRow as ThirdPartySeizure,
        ...prev.filter((a) => String(a.id || '') !== entityId),
    ];
    onSeizuresUpdated(nextSeizures);

    try {
        const decisionRow = getExecutorDecisionRowById(decisionsStorageExecutionId, decisionId) as {
            seizurePayloadJson?: string;
        };
        const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
        const updatedPayloadJson = (() => {
            try {
                const prevJson = rawJson ? (JSON.parse(rawJson) as Record<string, unknown>) : {};
                return JSON.stringify({
                    ...prevJson,
                    thirdPartySeizureId: entityId,
                    thirdPartyName: nextRow.thirdPartyName,
                    requestedAmountIqd: nextRow.requestedAmountIqd,
                    notificationDateIso: nextRow.notificationDateIso,
                });
            } catch {
                return JSON.stringify({
                    thirdPartySeizureId: entityId,
                    thirdPartyName: nextRow.thirdPartyName,
                    requestedAmountIqd: nextRow.requestedAmountIqd,
                    notificationDateIso: nextRow.notificationDateIso,
                });
            }
        })();
        const amountLabel =
            typeof nextRow.requestedAmountIqd === 'number' && nextRow.requestedAmountIqd > 0
                ? `${nextRow.requestedAmountIqd.toLocaleString('ar-IQ')} د.ع`
                : '—';
        patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: [
                `الجهة: ${nextRow.thirdPartyName || '—'}`,
                `المبلغ المطلوب حجزه: ${amountLabel}`,
                nextRow.notificationDateIso
                    ? `تاريخ التبليغ: ${String(nextRow.notificationDateIso).slice(0, 10)}`
                    : null,
            ]
                .filter(Boolean)
                .join('\n'),
            seizurePayloadJson: updatedPayloadJson,
        });
    } catch {
        /* ignore */
    }

    const requested =
        typeof nextRow.requestedAmountIqd === 'number' &&
        Number.isFinite(nextRow.requestedAmountIqd) &&
        nextRow.requestedAmountIqd > 0
            ? `${nextRow.requestedAmountIqd.toLocaleString('ar-IQ')} د.ع`
            : '—';

    pushTimelineEvent(
        {
            id: nextTimelineId(),
            date: today,
            timestamp: nowIso,
            title: '📨 حجز مال المدين لدى الغير — تم التبليغ',
            description: `الجهة: ${nextRow.thirdPartyName}\nالمبلغ المطلوب حجزه: ${requested}${nextRow.notificationDateIso ? `\nتاريخ التبليغ: ${String(nextRow.notificationDateIso).slice(0, 10)}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — حجز لدى الغير',
            metadata: {
                timelineThreadKey: `third_party_seizure:${decisionId}`,
                decisionRowId: decisionId,
                thirdPartySeizureId: entityId,
            },
        },
        { mergePatch: { thirdPartySeizures: nextSeizures } },
    );
    showToast('تم إنشاء مسار الحجز لدى الغير بحالة (تم التبليغ).', 'success');
}
