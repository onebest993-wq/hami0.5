import React, { useCallback, useState } from 'react';
import {
    capturePointerSafe,
    preventDefaultIfCancelable,
    releasePointerSafe,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

export function useProfileImageFrameTilt(
    interaction: string,
    previewInteractive: boolean,
) {
    const [tiltActive, setTiltActive] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const onTiltPointer = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (interaction !== 'tilt' || !previewInteractive) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            setTilt({
                x: (py - 0.5) * -14,
                y: (px - 0.5) * 16,
            });
            setTiltActive(true);
        },
        [interaction, previewInteractive],
    );

    const onTiltPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (interaction !== 'tilt' || !previewInteractive) return;
            if (
                typeof window !== 'undefined' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                return;
            }
            preventDefaultIfCancelable(event);
            capturePointerSafe(event.currentTarget, event.pointerId);
            onTiltPointer(event);
        },
        [interaction, previewInteractive, onTiltPointer],
    );

    const onTiltEnd = useCallback(() => {
        setTiltActive(false);
        setTilt({ x: 0, y: 0 });
    }, []);

    const onTiltPointerEnd = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            releasePointerSafe(event.currentTarget, event.pointerId);
            onTiltEnd();
        },
        [onTiltEnd],
    );

    return {
        tiltActive,
        tilt,
        onTiltPointer,
        onTiltPointerDown,
        onTiltPointerEnd,
    };
}
