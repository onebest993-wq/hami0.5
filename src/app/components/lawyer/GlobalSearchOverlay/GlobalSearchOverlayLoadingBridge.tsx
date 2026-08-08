import React from 'react';

import { GlobalSearchOverlayStaticShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayStaticShell';
import { useGlobalSearchBridgeShellContent } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchBridgeShellContent';
import { useGlobalSearchFocusArm } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchFocusArm';

type GlobalSearchOverlayLoadingBridgeProps = {
    open: boolean;
    keepWarm?: boolean;
    onClose?: () => void;
    userId?: string | null;
};

/**
 * قشرة تحميل = نفس StaticShell النهائي — بلا swap هيكلي عند وصول الـ chunk.
 */
export function GlobalSearchOverlayLoadingBridge({
    open,
    keepWarm = false,
    onClose,
    userId = null,
}: GlobalSearchOverlayLoadingBridgeProps): React.ReactElement | null {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const focusArmed = useGlobalSearchFocusArm(open);
    const shellContent = useGlobalSearchBridgeShellContent(userId, open);
    const close = onClose ?? (() => undefined);

    return (
        <GlobalSearchOverlayStaticShell
            open={open}
            keepWarm={keepWarm}
            onClose={close}
            overlayRef={overlayRef}
            inputRef={inputRef}
            focusArmed={focusArmed}
            {...shellContent}
        />
    );
}
