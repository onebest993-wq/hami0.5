import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { patchActiveStage } from '../smartFile/stageMutations';
import {
    filterTimelineEmptyTrash,
    filterTimelineRemoveId,
    mapTimelineSoftDelete,
} from '../smartFile/timelineMutations';

type SaveToCloud = (updatedStages: CaseStage[]) => void;

export function useSmartFileTimelineActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    currentStage: CaseStage;
    saveToCloud: SaveToCloud;
    setEditingEvent: (event: TimelineEvent | null) => void;
    setIsTrashOpen: (open: boolean) => void;
    onCalendarUnlink?: (params: { sourceEventId: string; eventType?: TimelineEvent['type'] }) => void;
}) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        saveToCloud,
        setEditingEvent,
        setIsTrashOpen,
        onCalendarUnlink,
    } = options;

    const commitTimeline = useCallback(
        (timeline: TimelineEvent[]) => {
            const updated = patchActiveStage(stages, activeStageIndex, { timeline });
            setStages(updated);
            saveToCloud(updated);
        },
        [stages, activeStageIndex, setStages, saveToCloud],
    );

    const handleDeleteEvent = useCallback(
        (id: string) => {
            const ev = currentStage.timeline?.find((e) => e.id === id);
            if (ev?.type === 'appointment') {
                onCalendarUnlink?.({ sourceEventId: id, eventType: ev.type });
            }
            commitTimeline(mapTimelineSoftDelete(currentStage.timeline ?? [], id, true));
        },
        [currentStage.timeline, commitTimeline, onCalendarUnlink],
    );

    const handleRestoreEvent = useCallback(
        (id: string) => {
            commitTimeline(mapTimelineSoftDelete(currentStage.timeline ?? [], id, false));
        },
        [currentStage.timeline, commitTimeline],
    );

    const handleHardDeleteEvent = useCallback(
        (id: string) => {
            const ev = currentStage.timeline?.find((e) => e.id === id);
            if (ev?.type === 'appointment') {
                onCalendarUnlink?.({ sourceEventId: id, eventType: ev.type });
            }
            commitTimeline(filterTimelineRemoveId(currentStage.timeline ?? [], id));
        },
        [currentStage.timeline, commitTimeline, onCalendarUnlink],
    );

    const handleEmptyTrash = useCallback(() => {
        if (!confirm('هل أنت متأكد من إفراغ سلة المهملات؟')) return;
        commitTimeline(filterTimelineEmptyTrash(currentStage.timeline ?? []));
        setIsTrashOpen(false);
    }, [currentStage.timeline, commitTimeline, setIsTrashOpen]);

    const handleEditEvent = useCallback(
        (id: string) => {
            const event = currentStage.timeline?.find((e) => e.id === id);
            if (event) setEditingEvent(event);
        },
        [currentStage.timeline, setEditingEvent],
    );

    return {
        handleDeleteEvent,
        handleRestoreEvent,
        handleHardDeleteEvent,
        handleEmptyTrash,
        handleEditEvent,
    };
}
