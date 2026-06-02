import { useEffect, useState } from 'react';

/** مراحل تشغيل التطبيق — تفصل التفاعل الأول عن الخدمات الثقيلة. */
export type RuntimePhase = 'boot' | 'interactive' | 'background';

const BACKGROUND_IDLE_TIMEOUT_MS = 5_000;

export function useRuntimePhase(): RuntimePhase {
    const [phase, setPhase] = useState<RuntimePhase>('boot');

    useEffect(() => {
        let cancelled = false;
        let idleId: number | undefined;

        const raf = requestAnimationFrame(() => {
            if (cancelled) return;
            setPhase('interactive');

            const armBackground = () => {
                if (!cancelled) setPhase('background');
            };

            if (typeof requestIdleCallback !== 'undefined') {
                idleId = requestIdleCallback(armBackground, {
                    timeout: BACKGROUND_IDLE_TIMEOUT_MS,
                });
            } else {
                window.setTimeout(armBackground, 1_200);
            }
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
                cancelIdleCallback(idleId);
            }
        };
    }, []);

    return phase;
}

export function isBackgroundPhase(phase: RuntimePhase): boolean {
    return phase === 'background';
}
