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
        const update = () => setScale(resolveViewportShellScale(window.innerWidth));
        update();
        window.addEventListener('resize', update, { passive: true });
        return () => window.removeEventListener('resize', update);
    }, []);

    return scale;
}
