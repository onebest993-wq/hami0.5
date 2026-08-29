import {
    clampProfileBackgroundEditState,
    type ProfileBackgroundEditState,
} from '@/app/services/profile/profileImageEditor';

export function panFromDrag(
    dx: number,
    dy: number,
    frameW: number,
    frameH: number,
    _bitmapW: number,
    _bitmapH: number,
    baseState: ProfileBackgroundEditState,
): ProfileBackgroundEditState {
    const sensitivity = 2.2;
    const panDeltaX = (-dx / Math.max(frameW, 1)) * sensitivity;
    const panDeltaY = (-dy / Math.max(frameH, 1)) * sensitivity;
    return clampProfileBackgroundEditState({
        ...baseState,
        panX: baseState.panX + panDeltaX,
        panY: baseState.panY + panDeltaY,
    });
}
