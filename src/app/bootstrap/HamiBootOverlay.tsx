import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { markBootPhase, reportBootTimeline } from '@/app/bootstrap/bootMetrics';
import { startBootProgressMotion } from '@/app/bootstrap/bootProgressMotion';

export type HamiBootOverlayPhase = 'visible' | 'exiting';

type HamiBootOverlayProps = {
    phase: HamiBootOverlayPhase;
};

/** طبقة إقلاع — شعار مقفول النسبة حتى جاهزية الواجهة. */
export function HamiBootOverlay({ phase }: HamiBootOverlayProps): React.ReactElement {
    const rootRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        if (phase !== 'visible') return;
        markBootPhase('shell-visible');
        window.dispatchEvent(new Event('hami:shell-visible'));
        const root = rootRef.current;
        if (!root) return undefined;
        return startBootProgressMotion(root);
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
            ref={rootRef}
            className={`hami-boot-cinematic hami-boot-cinematic--${phase} fixed inset-0 z-[99980] overflow-hidden bg-[#0a0f1c]`}
            dir="rtl"
            aria-busy={phase === 'visible'}
            aria-label="جاري التهيئة"
            data-testid="lawyer-boot-shell"
        >
            <div className="hami-boot-brand" data-testid="hami-boot-brand">
                <img
                    className="hami-boot-logo"
                    src="/hami-splash-logo.webp"
                    alt=""
                    width={160}
                    height={160}
                    decoding="async"
                    draggable={false}
                />
                <div
                    className="hami-boot-progress"
                    role="progressbar"
                    aria-hidden="true"
                    data-testid="hami-boot-progress"
                >
                    <span className="hami-boot-progress-fill" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
