import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';

function getHorizontalScrollState(el: HTMLElement) {
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    if (max <= 2) {
        return { max: 0, offset: 0, atStart: true, atEnd: true, thumbLeft: 0, thumbWidth: 100 };
    }
    const offset = Math.min(max, Math.max(0, el.scrollLeft));
    const viewRatio = el.clientWidth / el.scrollWidth;
    const thumbWidth = Math.max(viewRatio * 100, 10);
    const travel = 100 - thumbWidth;
    const thumbLeft = max > 0 ? (offset / max) * travel : 0;
    return {
        max,
        offset,
        atStart: offset <= 2,
        atEnd: offset >= max - 2,
        thumbLeft,
        thumbWidth,
    };
}

export function LegalCodesHorizontalScrollRail({
    children,
    shellClassName = '',
}: {
    children: React.ReactNode;
    shellClassName?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({
        canScroll: false,
        atStart: true,
        atEnd: true,
        thumbLeft: 0,
        thumbWidth: 100,
    });

    const syncScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const next = getHorizontalScrollState(el);
        setScrollState({
            canScroll: next.max > 2,
            atStart: next.atStart,
            atEnd: next.atEnd,
            thumbLeft: next.thumbLeft,
            thumbWidth: next.thumbWidth,
        });
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        syncScrollState();
        const ro = new ResizeObserver(syncScrollState);
        ro.observe(el);
        el.addEventListener('scroll', syncScrollState, { passive: true });
        return () => {
            ro.disconnect();
            el.removeEventListener('scroll', syncScrollState);
        };
    }, [syncScrollState, children]);

    const scrollByStep = useCallback((direction: 1 | -1) => {
        const el = scrollRef.current;
        if (!el) return;
        const step = Math.max(140, Math.round(el.clientWidth * 0.62));
        el.scrollBy({ left: direction * step, behavior: 'smooth' });
    }, []);

    const jumpToTrack = useCallback((clientX: number, trackEl: HTMLDivElement) => {
        const el = scrollRef.current;
        if (!el) return;
        const { max } = getHorizontalScrollState(el);
        if (max <= 0) return;
        const rect = trackEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        el.scrollTo({ left: ratio * max, behavior: 'smooth' });
    }, []);

    const navBtnClass =
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[#E6C673]/75 backdrop-blur-sm transition hover:border-[#E6C673]/22 hover:bg-[#E6C673]/[0.07] hover:text-[#E6C673] disabled:pointer-events-none disabled:opacity-25';

    return (
        <div className={`relative min-w-0 w-full ${shellClassName}`}>
            <div dir="rtl" className="flex items-center gap-1">
                {scrollState.canScroll ? (
                    <button
                        type="button"
                        aria-label="التمرير لليمين"
                        disabled={scrollState.atStart}
                        onClick={() => scrollByStep(-1)}
                        className={navBtnClass}
                    >
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                ) : null}

                <div
                    ref={scrollRef}
                    dir="ltr"
                    className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth py-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    <div dir="rtl" className="inline-flex w-max max-w-none flex-nowrap items-center gap-1.5 px-0.5">
                        {children}
                    </div>
                </div>

                {scrollState.canScroll ? (
                    <button
                        type="button"
                        aria-label="التمرير لليسار"
                        disabled={scrollState.atEnd}
                        onClick={() => scrollByStep(1)}
                        className={navBtnClass}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                ) : null}
            </div>

            {scrollState.canScroll ? (
                <div
                    role="presentation"
                    className="relative mx-7 mt-1 h-[2px] cursor-pointer rounded-full bg-white/[0.06]"
                    onClick={(e) => jumpToTrack(e.clientX, e.currentTarget)}
                >
                    <div
                        className="pointer-events-none absolute top-0 h-[2px] rounded-full bg-[#E6C673]/50 transition-[left,width] duration-200 ease-out"
                        style={{
                            left: `${scrollState.thumbLeft}%`,
                            width: `${scrollState.thumbWidth}%`,
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}
