import { useCallback, useEffect, useRef, useState } from 'react';
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
    const initialStageIndex = resolveInitialStageIndex(file, initialStages.length, initialStages);

    const [stages, setStages] = useState<CaseStage[]>(initialStages);
    const [activeStageIndex, setActiveStageIndex] = useState(initialStageIndex);
    const [viewingStageIndex, setViewingStageIndex] = useState(initialStageIndex);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const touchEndYRef = useRef<number | null>(null);

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
        touchEndYRef.current = null;
        setTouchStart(e.targetTouches[0].clientX);
        touchStartYRef.current = e.targetTouches[0].clientY;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
        touchEndYRef.current = e.targetTouches[0].clientY;
    }, []);

    const onTouchEnd = useCallback(() => {
        const startY = touchStartYRef.current;
        const endY = touchEndYRef.current;
        if (touchStart !== null && touchEnd !== null && startY !== null && endY !== null) {
            const dx = Math.abs(touchStart - touchEnd);
            const dy = Math.abs(startY - endY);
            if (dy > dx) {
                return;
            }
        }

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
