import React from 'react';
import { GlobalSearchOverlayDialogChrome } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayDialogChrome';
import { GlobalSearchOverlayLayerFrame } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLayerFrame';
import { useGlobalSearchOverlayExit } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayExit';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

/** غلاف ثابت كامل — Host / keepWarm؛ keepWarm يبقي DOM مخفياً لفتح فوري */
export function GlobalSearchOverlayStaticShell({
    open,
    keepWarm = false,
    onExitComplete,
    onClose,
    overlayRef,
    inputRef,
    onKeyDownCapture,
    keyboardInset,
    isEnrichingIndex,
    focusArmed = true,
    ...chrome
}: GlobalSearchOverlayShellProps) {
    useGlobalSearchOverlayExit(open, onExitComplete);

    return (
        <GlobalSearchOverlayLayerFrame
            open={open}
            keepWarm={keepWarm}
            keyboardInset={keyboardInset}
            onClose={onClose}
            overlayRef={overlayRef}
            onKeyDownCapture={onKeyDownCapture}
            isEnrichingIndex={isEnrichingIndex}
        >
            <GlobalSearchOverlayDialogChrome
                open={open}
                onClose={onClose}
                inputRef={inputRef}
                keyboardInset={keyboardInset}
                focusArmed={focusArmed}
                {...chrome}
            />
        </GlobalSearchOverlayLayerFrame>
    );
}
