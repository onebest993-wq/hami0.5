import React, { useEffect, useLayoutEffect } from 'react';
import { markBootPhase, reportBootTimeline } from '@/app/bootstrap/bootMetrics';
import { HamiWordmarkBoot, type HamiWordmarkBootPhase } from '@/app/bootstrap/HamiWordmarkBoot';

export type HamiBootOverlayPhase = 'visible' | 'exiting';

type HamiBootOverlayProps = {
    phase: HamiBootOverlayPhase;
};

function wordmarkPhase(overlayPhase: HamiBootOverlayPhase): HamiWordmarkBootPhase {
    if (overlayPhase === 'exiting') return 'exit';
    return 'idle';
}

/** طبقة إقلاع كاملة الشاشة — شعار حامي الكامل حتى جاهزية الواجهة. */
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
            className={`hami-boot-cinematic hami-boot-cinematic--${phase} fixed inset-0 z-[99980] overflow-hidden font-sans text-white`}
            dir="rtl"
            aria-busy={phase === 'visible'}
            aria-label="تهيئة حامي"
            data-testid="lawyer-boot-shell"
        >
            <div className="hami-boot-canvas" aria-hidden />

            <div className="hami-boot-center-stage">
                <HamiWordmarkBoot phase={wordmarkPhase(phase)} />
            </div>
        </div>
    );
}
