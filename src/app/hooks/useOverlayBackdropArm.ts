import { useEffect, useState } from 'react';

/** يمنع إغلاق الطبقة بنفس اللمسة التي فتحتها (leftover click / ghost click). */
export const OVERLAY_BACKDROP_ARM_MS = 80;

export function useOverlayBackdropArm(open: boolean, armAfterMs = OVERLAY_BACKDROP_ARM_MS): boolean {
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        if (!open) {
            setArmed(false);
            return;
        }
        setArmed(false);
        const id = window.setTimeout(() => setArmed(true), armAfterMs);
        return () => window.clearTimeout(id);
    }, [armAfterMs, open]);

    return armed;
}
