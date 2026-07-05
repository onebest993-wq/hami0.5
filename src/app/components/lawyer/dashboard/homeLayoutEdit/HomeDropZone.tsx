import React, { useEffect, useRef } from 'react';
import type { HomeWidgetZone } from '@/app/services/settings/homeLayout';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';

const DOCK_ZONE_EXPAND = { top: 72, side: 32, bottom: 48 };

function expandDockZoneRect(rect: DOMRect): DOMRect {
    return new DOMRect(
        rect.left - DOCK_ZONE_EXPAND.side,
        rect.top - DOCK_ZONE_EXPAND.top,
        rect.width + DOCK_ZONE_EXPAND.side * 2,
        rect.height + DOCK_ZONE_EXPAND.top + DOCK_ZONE_EXPAND.bottom,
    );
}

export function HomeDropZone({
    zone,
    className,
    children,
    testId,
}: {
    zone: HomeWidgetZone;
    className?: string;
    children: React.ReactNode;
    testId?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const { isEditing, dropHighlightZone, registerZoneRect } = useHomeLayoutEdit();

    useEffect(() => {
        if (!isEditing || !ref.current) {
            registerZoneRect(zone, null);
            return;
        }
        const el = ref.current;
        const report = () => {
            const rect = el.getBoundingClientRect();
            registerZoneRect(zone, zone === 'dock' ? expandDockZoneRect(rect) : rect);
        };
        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        const scroller = el.closest('.hami-home-scroll-root');
        scroller?.addEventListener('scroll', report, { passive: true });
        window.addEventListener('resize', report, { passive: true });
        return () => {
            ro.disconnect();
            scroller?.removeEventListener('scroll', report);
            window.removeEventListener('resize', report);
            registerZoneRect(zone, null);
        };
    }, [isEditing, zone, registerZoneRect]);

    const highlighted = isEditing && dropHighlightZone === zone;

    return (
        <div
            ref={ref}
            data-hami-drop-zone={zone}
            data-testid={testId}
            className={`${className ?? ''} ${
                highlighted
                    ? 'ring-2 ring-[#E6C673]/50 ring-offset-2 ring-offset-transparent rounded-[1.5rem]'
                    : ''
            }`}
        >
            {children}
        </div>
    );
}
