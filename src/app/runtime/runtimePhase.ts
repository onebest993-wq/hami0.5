import { useEffect, useState } from 'react';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

/** مراحل تشغيل التطبيق — تفصل التفاعل الأول عن الخدمات الثقيلة. */
export type RuntimePhase = 'boot' | 'interactive' | 'background';

function backgroundIdleTimeoutMs(): number {
    if (isCapacitorNativePlatform()) return 4_500;
    return 1_200;
}

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
                    timeout: backgroundIdleTimeoutMs(),
                });
            } else {
                window.setTimeout(armBackground, backgroundIdleTimeoutMs());
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
