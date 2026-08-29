/** Marker hide / terminate / purpose-edit handlers */
import { useCallback } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import type { UseExecutionDashboardDebtorSummonsCoerciveHandlersParams } from './useExecutionDashboardDebtorSummonsCoerciveHandlers.types';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';

type MarkerParams = Pick<
    UseExecutionDashboardDebtorSummonsCoerciveHandlersParams,
    | 'executionData'
    | 'unifiedSummonsTargetDebtorKey'
    | 'primaryDebtorKeyResolved'
    | 'debtorSummonsMarkerLocal'
    | 'summonsPurposeDraft'
    | 'nextTimelineId'
    | 'persistExecutionMerge'
    | 'showToast'
    | 'setTimelineEvents'
    | 'setDebtorSummonsMarkerLocal'
    | 'setSummonsMarkerPopoverOpen'
>;

export function useDebtorSummonsMarkerHandlers({
    executionData,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    debtorSummonsMarkerLocal,
    summonsPurposeDraft,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setDebtorSummonsMarkerLocal,
    setSummonsMarkerPopoverOpen,
}: MarkerParams) {
    const clearDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const ts = new Date().toISOString();
        const cur = debtorSummonsMarkerLocal;
        if (!cur?.id) return;
        const nextMarker = {
            ...cur,
            badgeHiddenAt: ts,
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker,
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: prev,
            });
            return prev;
        });
        setSummonsMarkerPopoverOpen(false);
        showToast('أُخفيت الإشارة من البطاقة', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setTimelineEvents,
    ]);

    const terminateDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const marker = debtorSummonsMarkerLocal;
        if (!marker?.id) return;
        const ts = new Date().toISOString();
        const nextMarker = {
            ...marker,
            periodEndedAt: ts,
        };
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: ts.slice(0, 10),
            timestamp: ts,
            title: '⏹ إنهاء التبليغ',
            description: `تم إنهاء التبليغ المسجّل بتاريخ ${marker.date}. الغاية: ${marker.purpose || '—'}.`,
            type: 'notification',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker,
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
        unifiedSummonsTargetDebtorKey,
        setDebtorSummonsMarkerLocal,
        setTimelineEvents,
    ]);

    const saveSummonsMarkerPurposeEdit = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const m = debtorSummonsMarkerLocal;
        if (!m?.id) return;
        const p = summonsPurposeDraft.trim();
        const truncated = p.length > 280 ? `${p.slice(0, 280)}…` : p;
        const marker = {
            id: m.id,
            date: m.date,
            purpose: truncated || 'تبليغ',
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = prev.map((e) => {
                if (String(e.id) !== String(m.id)) return e;
                const title = `🔔 تطلب حضوره${p ? ` — ${p}` : ''}`;
                return {
                    ...e,
                    description: `الغاية: ${p || '—'}. تاريخ التبليغ المُسجَّل: ${m.date}`,
                    title,
                };
            });
            persisted = persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          marker,
                      )
                    : { debtor_summons_marker: marker }),
                timelineEvents: next,
            });
            return next;
        });
        setDebtorSummonsMarkerLocal(marker);
        setSummonsMarkerPopoverOpen(false);
        toastAfterExecutionPersist(persisted, showToast, 'تم حفظ الغاية');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        persistExecutionMerge,
        showToast,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setTimelineEvents,
    ]);

    return {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
    };
}
