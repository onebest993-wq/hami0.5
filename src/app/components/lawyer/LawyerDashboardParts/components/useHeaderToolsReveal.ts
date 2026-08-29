import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

const SWIPE_OPEN_PX = 28;
const SWIPE_CLOSE_PX = 36;
const SWIPE_AXIS_PX = 48;

type SwipeState = {
    y: number;
    x: number;
    active: boolean;
    moved: boolean;
};

const idleSwipe = (): SwipeState => ({ y: 0, x: 0, active: false, moved: false });

/** طيّ شريط الأدوات العلوي: ضغط على العلامة، أو سحب للأسفل للفتح / للأعلى للإغلاق. */
const BLOOM_MS = 480;

export function useHeaderToolsReveal() {
    const [open, setOpen] = useState(false);
    const [bloom, setBloom] = useState(false);
    const swipeRef = useRef<SwipeState>(idleSwipe());

    useEffect(() => {
        if (!open) {
            setBloom(false);
            return;
        }
        setBloom(true);
        const timer = window.setTimeout(() => setBloom(false), BLOOM_MS);
        return () => window.clearTimeout(timer);
    }, [open]);

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (target instanceof Element && target.closest('.hami-header-tool-btn')) {
            swipeRef.current = idleSwipe();
            return;
        }
        swipeRef.current = {
            y: event.clientY,
            x: event.clientX,
            active: true,
            moved: false,
        };
    }, []);

    const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
        const swipe = swipeRef.current;
        if (!swipe.active) return;
        const dy = event.clientY - swipe.y;
        const dx = event.clientX - swipe.x;
        /* 10px كانت تُلغي الضغط على اللمس — السحب الحقيقي فقط يمنع click */
        if (Math.abs(dy) >= SWIPE_OPEN_PX || Math.abs(dx) > SWIPE_AXIS_PX) {
            swipe.moved = true;
        }
    }, []);

    const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
        const swipe = swipeRef.current;
        if (!swipe.active) return;
        const dy = event.clientY - swipe.y;
        const dx = Math.abs(event.clientX - swipe.x);
        swipe.active = false;
        if (dx > SWIPE_AXIS_PX) return;
        setOpen((isOpen) => {
            if (!isOpen && dy > SWIPE_OPEN_PX) return true;
            if (isOpen && dy < -SWIPE_CLOSE_PX) return false;
            return isOpen;
        });
    }, []);

    const onPointerCancel = useCallback(() => {
        swipeRef.current = idleSwipe();
    }, []);

    const toggle = useCallback(() => {
        if (swipeRef.current.moved) return;
        setOpen((isOpen) => !isOpen);
    }, []);

    return {
        open,
        bloom,
        toggle,
        close,
        navPointer: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
        },
    };
}
