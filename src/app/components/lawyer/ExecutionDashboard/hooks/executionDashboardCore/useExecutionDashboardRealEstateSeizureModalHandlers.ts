/** Phase C — حفظ بيانات الحجز العقاري من النافذة */
import { useCallback, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { RealEstateSeizureAsset, TimelineEvent } from '@/app/types/execution';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export type UseExecutionDashboardRealEstateSeizureModalHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    realEstateSeizureModalDecisionId: string | null;
    realEstateSeizureSnapshotRef: MutableRefObject<RealEstateSeizureAsset[]>;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
    setRealEstateSeizureAssets: Dispatch<SetStateAction<RealEstateSeizureAsset[]>>;
    setShowRealEstateSeizureModal: (show: boolean) => void;
};

export function useExecutionDashboardRealEstateSeizureModalHandlers({
    decisionsStorageExecutionId,
    realEstateSeizureAssets,
    realEstateSeizureModalDecisionId,
    realEstateSeizureSnapshotRef,
    nextTimelineId,
    pushTimelineEvent,
    showToast,
    setRealEstateSeizureAssets,
    setShowRealEstateSeizureModal,
}: UseExecutionDashboardRealEstateSeizureModalHandlersParams) {
    const realEstateModalInitial = useMemo(() => {
        const did = String(realEstateSeizureModalDecisionId || '').trim();
        if (!did) return null;
        return (
            realEstateSeizureAssets.find((a) => String(a.decisionRowId || '').trim() === did) || null
        );
    }, [realEstateSeizureAssets, realEstateSeizureModalDecisionId]);

    const saveRealEstateSeizureFromModal = useCallback(
        (draft: {
            propertyNoAndDistrict: string;
            propertyGender: 'دار' | 'شقة' | 'عرصة' | 'بستان';
            deedNotes: string;
        }) => {
            const decisionId = String(realEstateSeizureModalDecisionId || '').trim();
            if (!decisionId) return;
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = realEstateSeizureSnapshotRef.current;
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const nextRow: RealEstateSeizureAsset = {
                id: existing?.id || `re_${decisionId}_${Date.now()}`,
                decisionRowId: decisionId,
                propertyNoAndDistrict: draft.propertyNoAndDistrict,
                propertyGender: draft.propertyGender,
                estimatedPriceIqd: existing?.estimatedPriceIqd ?? null,
                deedNotes: draft.deedNotes,
                status: existing?.status || 'seized',
                record_locked: existing?.record_locked || false,
                auction_date_ymd: existing?.auction_date_ymd ?? null,
                sale_price_iqd: existing?.sale_price_iqd ?? null,
                awaiting_sale_price: false,
                sale_price_draft: undefined,
                archived_at_ymd: existing?.archived_at_ymd ?? null,
            };
            const nextAssets = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
            setRealEstateSeizureAssets(nextAssets);

            try {
                patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
                    seizureRequestSavedAt: nowIso,
                });
            } catch {
                /* ignore */
            }

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: 'وضع إشارة حجز عقاري',
                    description: `رقم العقار والمقاطعة: ${nextRow.propertyNoAndDistrict}\nجنس العقار: ${nextRow.propertyGender}${nextRow.deedNotes ? `\nتفاصيل السند/ملاحظات: ${nextRow.deedNotes}` : ''}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — الحجز العقاري',
                    metadata: {
                        timelineThreadKey: `real_estate_seizure:${decisionId}`,
                        decisionRowId: decisionId,
                        realEstateAssetId: nextRow.id,
                    },
                },
                { mergePatch: { realEstateSeizureAssets: nextAssets } },
            );
            showToast('تم حفظ بيانات العقار وربطها بالسجل الزمني', 'success');
            setShowRealEstateSeizureModal(false);
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            realEstateSeizureModalDecisionId,
            realEstateSeizureSnapshotRef,
            showToast,
            setRealEstateSeizureAssets,
            setShowRealEstateSeizureModal,
        ],
    );

    return { realEstateModalInitial, saveRealEstateSeizureFromModal };
}
