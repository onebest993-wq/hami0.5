import { useCallback, useEffect, useState } from 'react';
import type { CaseStage } from '../../LawyerShared';
import {
    getDisplayTimelineFromStage,
    isViewingArchivedStage,
    resolveInitialStageIndex,
} from '../smartFile/stageInit';
import { resolveSwipeViewingIndex, SMART_FILE_MIN_SWIPE_PX } from '../smartFile/stageSwipe';
import { buildStepperStagesFromArray } from '../smartFile/stepperStages';

export function useSmartFileStageNavigation(
    file: Record<string, unknown> | null | undefined,
    initialStages: CaseStage[],
) {
    const initialStageIndex = resolveInitialStageIndex(file, initialStages.length);

    const [stages, setStages] = useState<CaseStage[]>(initialStages);
    const [activeStageIndex, setActiveStageIndex] = useState(initialStageIndex);
    const [viewingStageIndex, setViewingStageIndex] = useState(initialStageIndex);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const currentStage = stages[activeStageIndex];
    const viewedStage = stages[viewingStageIndex];
    const isViewingArchived = isViewingArchivedStage(viewedStage);
    const displayStage = viewedStage || currentStage;
    const { displayTimeline, deletedEvents } = getDisplayTimelineFromStage(displayStage);

    const { stepperStages } = buildStepperStagesFromArray(stages, activeStageIndex);
    const currentStageId = `stg_${viewingStageIndex + 1}`;

    useEffect(() => {
        setViewingStageIndex(activeStageIndex);
    }, [activeStageIndex]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    }, []);

    const onTouchEnd = useCallback(() => {
        const next = resolveSwipeViewingIndex(
            viewingStageIndex,
            stages.length,
            touchStart,
            touchEnd,
            SMART_FILE_MIN_SWIPE_PX,
        );
        if (next !== null) {
            setViewingStageIndex(next);
        }
    }, [viewingStageIndex, stages.length, touchStart, touchEnd]);

    return {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        viewingStageIndex,
        setViewingStageIndex,
        currentStage,
        viewedStage,
        isViewingArchived,
        displayStage,
        displayTimeline,
        deletedEvents,
        stepperStages,
        currentStageId,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
}
