import { useEffect, useState } from 'react';

/** مقياس خفيف لأيقونات الدوك على شاشات أوسع — بدون تغيير نسب الهاتف */
export function resolveViewportShellScale(widthPx: number): number {
    if (widthPx >= 1024) return 1.08;
    if (widthPx >= 768) return 1.06;
    if (widthPx >= 600) return 1.04;
    return 1;
}

export function useViewportShellScale(): number {
    const [scale, setScale] = useState(() =>
        typeof window !== 'undefined' ? resolveViewportShellScale(window.innerWidth) : 1,
    );

    useEffect(() => {
        let rafId = 0;
        const update = () => setScale(resolveViewportShellScale(window.innerWidth));
        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                update();
            });
        };

        update();
        window.addEventListener('resize', scheduleUpdate, { passive: true });
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('resize', scheduleUpdate);
        };
    }, []);

    return scale;
}
