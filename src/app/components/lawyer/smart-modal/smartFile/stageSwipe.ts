export const SMART_FILE_MIN_SWIPE_PX = 50;

export function resolveSwipeViewingIndex(
    viewingStageIndex: number,
    stagesLength: number,
    touchStart: number | null,
    touchEnd: number | null,
    minDistance: number = SMART_FILE_MIN_SWIPE_PX,
): number | null {
    if (touchStart === null || touchEnd === null || stagesLength <= 0) {
        return null;
    }

    const distance = touchStart - touchEnd;
    if (distance > minDistance && viewingStageIndex < stagesLength - 1) {
        return viewingStageIndex + 1;
    }
    if (distance < -minDistance && viewingStageIndex > 0) {
        return viewingStageIndex - 1;
    }
    return null;
}
