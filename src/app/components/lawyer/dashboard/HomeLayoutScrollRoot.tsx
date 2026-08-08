import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { bindHomeScrollPacing } from '@/app/runtime/framePacingGuard';
import { resolveHomeDockSticky } from '@/app/services/alerts/homeHubCarouselVirtual';

type HomePageScrollContextValue = {
    /** المحتوى أطول من الشاشة — يُثبَّت الدوك أسفلها */
    dockSticky: boolean;
};

const HomePageScrollContext = createContext<HomePageScrollContextValue>({ dockSticky: false });

export function useHomePageScroll() {
    return useContext(HomePageScrollContext);
}

function readHomeDockStickyTargets(root: HTMLElement) {
    const mainGrid = root.querySelector('[data-testid="home-main-grid"]');
    const bottomChrome = root.querySelector('[data-testid="home-bottom-chrome"]');
    return {
        contentHeight: mainGrid instanceof HTMLElement ? mainGrid.offsetHeight : 0,
        chromeHeight: bottomChrome instanceof HTMLElement ? bottomChrome.offsetHeight : 0,
        viewportHeight: root.clientHeight,
        scrollHeight: root.scrollHeight,
    };
}

/** تمرير ذكي: يتقلص مع المحتوى ويتمدد حتى حد الشاشة ثم يُفعّل التمرير */
export function HomeLayoutScrollRoot({
    className = '',
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const dockStickyRef = useRef(false);
    const [dockSticky, setDockSticky] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return bindHomeScrollPacing(el);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let rafId = 0;
        let paused = document.hidden;
        let ro: ResizeObserver | null = null;

        const applyMeasure = () => {
            const needsStickyPad = resolveHomeDockSticky(readHomeDockStickyTargets(el));
            if (dockStickyRef.current === needsStickyPad) return;
            dockStickyRef.current = needsStickyPad;
            setDockSticky(needsStickyPad);
        };

        const scheduleMeasure = () => {
            if (paused) return;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                applyMeasure();
            });
        };

        const attachObservers = () => {
            ro?.disconnect();
            ro = new ResizeObserver(scheduleMeasure);
            const mainGrid = el.querySelector('[data-testid="home-main-grid"]');
            const bottomChrome = el.querySelector('[data-testid="home-bottom-chrome"]');
            if (mainGrid instanceof HTMLElement) ro.observe(mainGrid);
            if (bottomChrome instanceof HTMLElement) ro.observe(bottomChrome);
            if (!(mainGrid instanceof HTMLElement) && !(bottomChrome instanceof HTMLElement)) {
                ro.observe(el);
            }
        };

        const onVisibility = () => {
            paused = document.hidden;
            if (!paused) scheduleMeasure();
        };

        attachObservers();
        scheduleMeasure();

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('resize', scheduleMeasure, { passive: true });

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ro?.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, []);

    const scrollContextValue = useMemo(() => ({ dockSticky }), [dockSticky]);

    return (
        <HomePageScrollContext.Provider value={scrollContextValue}>
            <div ref={ref} className={`hami-home-scroll-root ${className}`.trim()}>
                {children}
            </div>
        </HomePageScrollContext.Provider>
    );
}
