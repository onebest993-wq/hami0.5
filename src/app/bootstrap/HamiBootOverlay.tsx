import React, { useEffect, useLayoutEffect } from 'react';
import { markBootPhase, reportBootTimeline } from '@/app/bootstrap/bootMetrics';

export type HamiBootOverlayPhase = 'visible' | 'exiting';

type HamiBootOverlayProps = {
    phase: HamiBootOverlayPhase;
};

/** طبقة إقلاع — خلفية لوحة فقط حتى جاهزية الواجهة (بلا شعار). */
export function HamiBootOverlay({ phase }: HamiBootOverlayProps): React.ReactElement {
    useLayoutEffect(() => {
        if (phase !== 'visible') return;
        markBootPhase('shell-visible');
        window.dispatchEvent(new Event('hami:shell-visible'));
    }, [phase]);

    useEffect(() => {
        if (phase !== 'exiting') return;
        return () => {
            markBootPhase('overlay-removed');
            reportBootTimeline();
        };
    }, [phase]);

    return (
        <div
            className={`hami-boot-cinematic hami-boot-cinematic--${phase} fixed inset-0 z-[99980] overflow-hidden bg-[#0a0f1c] font-sans text-white`}
            dir="rtl"
            aria-busy={phase === 'visible'}
            aria-label="تهيئة حامي"
            data-testid="lawyer-boot-shell"
        />
    );
}
