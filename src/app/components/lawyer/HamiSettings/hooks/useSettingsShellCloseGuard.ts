import { useLayoutEffect, useRef, type SyntheticEvent } from 'react';
import {
    clearSettingsForceVisible,
    isSettingsCloseGuarded,
    isSettingsLayerOpen,
    isSettingsOpenGestureBlockingClose,
    isSettingsOverlayInteractionArmed,
    scheduleSettingsOverlayInteractionArm,
} from '@/app/runtime/settingsInstantPaint';

export function useSettingsShellCloseGuard(visible: boolean, onClose: () => void) {
    const shellOpenedAtRef = useRef<number | null>(null);
    const wasVisibleRef = useRef(false);

    useLayoutEffect(() => {
        if (visible) {
            wasVisibleRef.current = true;
            shellOpenedAtRef.current =
                typeof performance !== 'undefined' ? performance.now() : Date.now();
            scheduleSettingsOverlayInteractionArm();
            return undefined;
        }
        if (wasVisibleRef.current) {
            wasVisibleRef.current = false;
        }
        shellOpenedAtRef.current = null;
        clearSettingsForceVisible();
        return undefined;
    }, [visible]);

    const canCloseNow = () => {
        if (isSettingsCloseGuarded() || isSettingsOpenGestureBlockingClose()) return false;
        if (!isSettingsLayerOpen(visible)) return false;
        return isSettingsOverlayInteractionArmed() || visible;
    };

    const requestCloseGuarded = (event?: SyntheticEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        if (!canCloseNow()) return;
        onClose();
    };

    return { requestCloseGuarded };
}
