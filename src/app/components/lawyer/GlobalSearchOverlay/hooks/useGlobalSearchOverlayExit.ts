import { useEffect, useRef } from 'react';

/** يُنادى onExitComplete مرة عند الانتقال من مفتوح → مغلق */
export function useGlobalSearchOverlayExit(open: boolean, onExitComplete?: () => void): void {
    const wasOpenRef = useRef(open);

    useEffect(() => {
        if (wasOpenRef.current && !open) {
            onExitComplete?.();
        }
        wasOpenRef.current = open;
    }, [open, onExitComplete]);
}
