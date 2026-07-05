import { useLayoutEffect, useState, type RefObject } from 'react';

export type AnchoredMenuPosition = {
    top: number;
    left: number;
    minWidth: number;
};

const MENU_MIN_WIDTH = 192;
const MENU_EST_HEIGHT = 120;
const VIEWPORT_PAD = 8;

export function computeAnchoredMenuPosition(rect: DOMRect): AnchoredMenuPosition {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right - MENU_MIN_WIDTH;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - MENU_MIN_WIDTH - VIEWPORT_PAD));

    let top = rect.bottom + 6;
    if (top + MENU_EST_HEIGHT > vh - VIEWPORT_PAD) {
        top = Math.max(VIEWPORT_PAD, rect.top - MENU_EST_HEIGHT - 6);
    }

    return { top, left, minWidth: MENU_MIN_WIDTH };
}

/** يثبّت القائمة داخل الشاشة — يتجاوز overflow:hidden على البطاقة */
export function useAnchoredMenuPosition(
    open: boolean,
    anchorRef: RefObject<HTMLElement | null>,
    initialPos: AnchoredMenuPosition | null,
): AnchoredMenuPosition | null {
    const [pos, setPos] = useState<AnchoredMenuPosition | null>(null);

    useLayoutEffect(() => {
        if (!open) {
            setPos(null);
            return;
        }

        const update = () => {
            const el = anchorRef.current;
            if (!el) return;
            setPos(computeAnchoredMenuPosition(el.getBoundingClientRect()));
        };

        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open, anchorRef]);

    if (!open) return null;
    return pos ?? initialPos;
}
