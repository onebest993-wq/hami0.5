import React, { useEffect, useRef } from 'react';
import { bindHomeScrollPacing } from '@/app/runtime/framePacingGuard';

/** تمرير ذكي: يتقلص مع المحتوى ويتمدد حتى حد الشاشة ثم يُفعّل التمرير */
export function HomeLayoutScrollRoot({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return bindHomeScrollPacing(el);
    }, []);

    return (
        <div ref={ref} className="hami-home-scroll-root">
            {children}
        </div>
    );
}
