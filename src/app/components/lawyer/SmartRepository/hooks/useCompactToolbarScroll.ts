import { useCallback, useEffect, useRef, useState } from 'react';

type CompactOverflowState = {
    overflowing: boolean;
    atStart: boolean;
    atEnd: boolean;
};

/**
 * ╪ز┘à╪▒┘è╪▒ ╪د┘╪┤╪▒┘è╪╖ ╪د┘┘à╪╡╪║┘ّ╪▒: ╪د┘┘ scrollbar ┘à╪«┘┘è╪î ┘╪░╪د ┘┘ê┘┘ّ╪▒ ╪س┘╪د╪س ┘ê╪│╪د╪خ┘ ╪╡╪▒┘è╪ص╪ر ظ¤
 * ╪│╪ص╪ذ ╪ذ╪د┘┘à╪د┘ê╪│/╪د┘┘é┘┘à╪î ╪╣╪ش┘╪ر ╪د┘┘à╪د┘ê╪│ (╪╣┘à┘ê╪»┘è ظْ ╪ث┘┘é┘è)╪î ┘ê╪ث╪│┘ç┘à ╪ز┘┘é┘ّ┘ ╪╣┘╪» ╪د┘╪╖╪▒┘┘è┘.
 * ╪د┘┘┘à╪│ ┘è╪╣╪ز┘à╪» overflow-x-auto ╪د┘╪ث╪╡┘┘è ╪ذ┘╪د ╪ز╪»╪«┘ّ┘.
 */
export function useCompactToolbarScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
    const [overflow, setOverflow] = useState<CompactOverflowState>({
        overflowing: false,
        atStart: true,
        atEnd: false,
    });

    const syncOverflow = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        const pos = Math.abs(el.scrollLeft);
        setOverflow((prev) => {
            const next = {
                overflowing: max > 1,
                atStart: pos <= 1,
                atEnd: pos >= max - 1,
            };
            return prev.overflowing === next.overflowing &&
                prev.atStart === next.atStart &&
                prev.atEnd === next.atEnd
                ? prev
                : next;
        });
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        syncOverflow();
        const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncOverflow) : null;
        resizeObserver?.observe(el);

        // ╪╣╪ش┘╪ر ╪د┘┘à╪د┘ê╪│ ╪د┘╪╣┘à┘ê╪»┘è╪ر ╪ز╪ص╪▒┘ّ┘â ╪د┘╪┤╪▒┘è╪╖ ╪ث┘┘é┘è╪د┘ï (rtl: ╪د┘╪د╪ز╪ش╪د┘ç ┘à╪╣┘â┘ê╪│)
        const onWheel = (e: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth + 1) return;
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            const rtl = getComputedStyle(el).direction === 'rtl';
            el.scrollLeft += rtl ? -e.deltaY : e.deltaY;
            e.preventDefault();
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('scroll', syncOverflow, { passive: true });
        return () => {
            resizeObserver?.disconnect();
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('scroll', syncOverflow);
        };
    }, [syncOverflow]);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'touch') return; // ╪د┘┘┘à╪│ ┘┘ç ╪ز┘à╪▒┘è╪▒ ╪ث╪╡┘┘è
        const el = scrollRef.current;
        if (!el) return;
        dragRef.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const el = scrollRef.current;
        if (!drag.active || !el) return;
        const dx = e.clientX - drag.startX;
        if (!drag.moved && Math.abs(dx) > 4) {
            drag.moved = true;
            el.setPointerCapture(e.pointerId);
        }
        if (drag.moved) el.scrollLeft = drag.startScroll - dx;
    }, []);

    const endDrag = useCallback(() => {
        dragRef.current.active = false;
    }, []);

    const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current.moved) return;
        // ╪د┘╪│╪ص╪ذ ╪د┘╪ز┘ç┘ë ╪ذ┘┘é╪▒╪ر ╪╣╪▒╪╢┘è╪ر ┘┘ê┘é ╪▓╪▒ ظ¤ ┘╪د ┘┘┘╪╣┘ّ┘ ╪د┘╪ث╪»╪د╪ر
        dragRef.current.moved = false;
        e.preventDefault();
        e.stopPropagation();
    }, []);

    /** ╪ز┘ê╪ش┘è┘ç ┘┘è╪▓┘è╪د╪خ┘è: ┘┘è rtl ╪د┘╪ذ╪»╪د┘è╪ر ┘è┘à┘è┘ (+scrollLeft ┘╪ص┘ê 0) ┘ê╪د┘┘┘ç╪د┘è╪ر ┘è╪│╪د╪▒ (ظêْ) */
    const scrollTowards = useCallback((edge: 'start' | 'end') => {
        const el = scrollRef.current;
        if (!el) return;
        const rtl = getComputedStyle(el).direction === 'rtl';
        const step = Math.max(el.clientWidth * 0.6, 120);
        const physicalDir = edge === 'end' ? (rtl ? -1 : 1) : rtl ? 1 : -1;
        el.scrollBy({ left: physicalDir * step, behavior: 'smooth' });
    }, []);

    return {
        scrollRef,
        overflow,
        scrollTowards,
        dragHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onPointerLeave: endDrag,
            onClickCapture,
        },
    };
}
