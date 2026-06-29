import { useEffect } from 'react';

/** يخفّي طبقة خلفية اللوحة أثناء شاشة كاملة (مخزن، تقويم، …) */
export function useOpaqueFeatureSurface(active = true): void {
    useEffect(() => {
        if (!active) return;
        const root = document.documentElement;
        const prev = root.dataset.hamiFeatureOpen;
        root.dataset.hamiFeatureOpen = '1';
        return () => {
            if (prev !== undefined) root.dataset.hamiFeatureOpen = prev;
            else delete root.dataset.hamiFeatureOpen;
        };
    }, [active]);
}
