import { useLayoutEffect, useState, type CSSProperties } from 'react';

type VisualViewportFixedBox = {
    style: CSSProperties;
    keyboardOpen: boolean;
};

const EMPTY: VisualViewportFixedBox = { style: {}, keyboardOpen: false };

function readBox(vv: VisualViewport): VisualViewportFixedBox {
    const top = Math.round(vv.offsetTop);
    const left = Math.round(vv.offsetLeft);
    const width = Math.round(vv.width);
    const height = Math.round(vv.height);
    const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    return {
        style: {
            position: 'fixed',
            top,
            left,
            width,
            height,
            right: 'auto',
            bottom: 'auto',
        },
        keyboardOpen: covered > 48,
    };
}

/**
 * يثبّت overlay على visual viewport — مصدر واحد للكيبورد بلا marginBottom مزدوج.
 */
export function useVisualViewportFixedBox(enabled: boolean): VisualViewportFixedBox {
    const [box, setBox] = useState<VisualViewportFixedBox>(EMPTY);

    useLayoutEffect(() => {
        if (!enabled || typeof window === 'undefined') {
            setBox(EMPTY);
            return;
        }
        const vv = window.visualViewport;
        if (!vv) {
            setBox(EMPTY);
            return;
        }

        let frame = 0;
        const apply = () => {
            frame = 0;
            const next = readBox(vv);
            setBox((prev) => {
                const ps = prev.style;
                const ns = next.style;
                if (
                    prev.keyboardOpen === next.keyboardOpen &&
                    ps.top === ns.top &&
                    ps.left === ns.left &&
                    ps.width === ns.width &&
                    ps.height === ns.height
                ) {
                    return prev;
                }
                return next;
            });
        };
        const schedule = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(apply);
        };

        apply();
        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);
        window.addEventListener('orientationchange', schedule);
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            vv.removeEventListener('resize', schedule);
            vv.removeEventListener('scroll', schedule);
            window.removeEventListener('orientationchange', schedule);
        };
    }, [enabled]);

    return enabled ? box : EMPTY;
}

export function isCoarsePointerDevice(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
        if (window.matchMedia('(pointer: coarse)').matches) return true;
    } catch {
        /* ignore */
    }
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-hami-native') === '1';
}
