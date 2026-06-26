import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { SeizedAsset, TimelineEvent } from '@/app/types/execution';
import {
    buildReleaseSeizureTimelineEvent,
    buildUndoReleaseSeizureTimelineEvent,
    createPatchSeizedRowAndTimeline,
    mapSeizedAssetReleased,
    mapSeizedAssetReleaseUndone,
    resolveCoerciveActionsAfterRelease,
    resolveCoerciveActionsAfterReleaseUndo,
    type PatchSeizedRowAndTimeline,
} from './executionDashboardSeizureRowPatch';

export type UseExecutionDashboardSeizureReleaseHandlersParams = {
    seizedAssets: SeizedAsset[];
    activeCoerciveActions: string[];
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setActiveCoerciveActions: Dispatch<SetStateAction<string[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    showToast: (message: string, type?: string) => void;
};

export function useExecutionDashboardSeizureReleaseHandlers({
    seizedAssets,
    activeCoerciveActions,
    setSeizedAssets,
    setTimelineEvents,
    setActiveCoerciveActions,
    persistExecutionMerge,
    nextTimelineId,
    showToast,
}: UseExecutionDashboardSeizureReleaseHandlersParams) {
    const patchSeizedRowAndTimeline: PatchSeizedRowAndTimeline = useMemo(
        () =>
            createPatchSeizedRowAndTimeline({
                setSeizedAssets,
                setTimelineEvents,
                setActiveCoerciveActions,
                persistExecutionMerge,
            }),
        [setSeizedAssets, setTimelineEvents, setActiveCoerciveActions, persistExecutionMerge],
    );

    const releaseSeizureAssetRow = useCallback(
        (asset: SeizedAsset) => {
            if (asset.seizure_record_locked) {
                showToast('السجل مقفول — استخدم «تراجع» إن كان الحجز قد فُك.', 'warning');
                return;
            }
            const today = getLocalTodayYmd();
            const now = new Date().toISOString();
            const { cleanedType, nextAsset } = mapSeizedAssetReleased(asset, today);
            const nextAc = resolveCoerciveActionsAfterRelease(activeCoerciveActions, asset);
            const nextAssets = seizedAssets.map((a) => (a.id === asset.id ? nextAsset : a));
            const ev = buildReleaseSeizureTimelineEvent(asset, cleanedType, today, now, nextTimelineId);
            patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
            showToast('تم فك الحجز وإزالة إشارة الحجز من المدين', 'success');
        },
        [
            activeCoerciveActions,
            seizedAssets,
            nextTimelineId,
            patchSeizedRowAndTimeline,
            showToast,
        ],
    );

    const undoReleaseSeizureAssetRow = useCallback(
        (asset: SeizedAsset) => {
            if (!asset.seizure_record_locked || String(asset.status) !== 'released') return;
            const today = getLocalTodayYmd();
            const now = new Date().toISOString();
            const { cleanedType, nextAsset } = mapSeizedAssetReleaseUndone(asset);
            const nextAc = resolveCoerciveActionsAfterReleaseUndo(activeCoerciveActions, asset);
            const nextAssets = seizedAssets.map((a) => (a.id === asset.id ? nextAsset : a));
            const ev = buildUndoReleaseSeizureTimelineEvent(asset, cleanedType, today, now, nextTimelineId);
            patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
            showToast('تم التراجع وإعادة تفعيل بطاقة الحجز', 'success');
        },
        [
            activeCoerciveActions,
            seizedAssets,
            nextTimelineId,
            patchSeizedRowAndTimeline,
            showToast,
        ],
    );

    return {
        patchSeizedRowAndTimeline,
        releaseSeizureAssetRow,
        undoReleaseSeizureAssetRow,
    };
}
