import type { Dispatch, SetStateAction } from 'react';
import type { SeizedAsset, TimelineEvent } from '@/app/types/execution';
import {
    seizureCoerciveKeyFromAssetType,
    stripSeizureTypeDecorators,
} from '@/app/components/lawyer/ExecutionDashboard/helpers';

export type PatchSeizedRowAndTimeline = (
    nextAssets: SeizedAsset[],
    ev: TimelineEvent,
    nextAc?: string[],
) => void;

export type CreatePatchSeizedRowAndTimelineDeps = {
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setActiveCoerciveActions: Dispatch<SetStateAction<string[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
};

export function createPatchSeizedRowAndTimeline({
    setSeizedAssets,
    setTimelineEvents,
    setActiveCoerciveActions,
    persistExecutionMerge,
}: CreatePatchSeizedRowAndTimelineDeps): PatchSeizedRowAndTimeline {
    return (nextAssets, ev, nextAc) => {
        setSeizedAssets(nextAssets);
        setTimelineEvents((prev) => {
            const nextTl = [ev, ...prev];
            const p: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTl };
            if (nextAc) {
                p.activeCoerciveActions = nextAc;
            }
            queueMicrotask(() => persistExecutionMerge(p));
            return nextTl;
        });
        if (nextAc) {
            setActiveCoerciveActions(nextAc);
        }
    };
}

export function mapSeizedAssetReleased(
    asset: SeizedAsset,
    today: string,
): { cleanedType: string; nextAsset: SeizedAsset } {
    const cleanedType = stripSeizureTypeDecorators(String(asset.type)) || String(asset.type);
    return {
        cleanedType,
        nextAsset: {
            ...asset,
            type: cleanedType,
            status: 'released',
            seizure_record_locked: true,
            released_at_ymd: today,
        },
    };
}

export function mapSeizedAssetReleaseUndone(
    asset: SeizedAsset,
): { cleanedType: string; nextAsset: SeizedAsset } {
    const cleanedType = stripSeizureTypeDecorators(String(asset.type)) || String(asset.type);
    return {
        cleanedType,
        nextAsset: {
            ...asset,
            type: cleanedType,
            status: 'seized',
            seizure_record_locked: false,
            released_at_ymd: null,
        },
    };
}

export function resolveCoerciveActionsAfterRelease(
    activeCoerciveActions: string[],
    asset: SeizedAsset,
): string[] {
    const key = seizureCoerciveKeyFromAssetType(asset);
    return key ? activeCoerciveActions.filter((x) => x !== key) : activeCoerciveActions;
}

export function resolveCoerciveActionsAfterReleaseUndo(
    activeCoerciveActions: string[],
    asset: SeizedAsset,
): string[] {
    const key = seizureCoerciveKeyFromAssetType(asset);
    return key && !activeCoerciveActions.includes(key)
        ? [...activeCoerciveActions, key]
        : activeCoerciveActions;
}

export function buildReleaseSeizureTimelineEvent(
    asset: SeizedAsset,
    cleanedType: string,
    today: string,
    now: string,
    nextTimelineId: () => string,
): TimelineEvent {
    return {
        id: nextTimelineId(),
        date: today,
        timestamp: now,
        title: '🔓 فك حجز',
        description: `فك حجز مسجّل: ${cleanedType}${asset.description ? ` — ${asset.description}` : ''}`,
        type: 'coercive',
        source: 'محضر المتابعة — الحجز المالي',
        metadata: {
            timelineThreadKey: `seizure_release:${asset.id}`,
            seizureAssetId: asset.id,
        },
    };
}

export function buildUndoReleaseSeizureTimelineEvent(
    asset: SeizedAsset,
    cleanedType: string,
    today: string,
    now: string,
    nextTimelineId: () => string,
): TimelineEvent {
    return {
        id: nextTimelineId(),
        date: today,
        timestamp: now,
        title: '↩️ تراجع عن فك الحجز',
        description: `إعادة تفعيل الحجز: ${cleanedType}${asset.description ? ` — ${asset.description}` : ''}`,
        type: 'coercive',
        source: 'محضر المتابعة — الحجز المالي',
        metadata: {
            timelineThreadKey: `seizure_release_undo:${asset.id}`,
            seizureAssetId: asset.id,
        },
    };
}
