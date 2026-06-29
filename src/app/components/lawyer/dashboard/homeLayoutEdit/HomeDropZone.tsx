import React, { useEffect, useRef } from 'react';
import type { HomeWidgetZone } from '@/app/services/settings/homeLayout';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';

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
        const report = () => registerZoneRect(zone, el.getBoundingClientRect());
        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        window.addEventListener('scroll', report, true);
        window.addEventListener('resize', report);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', report, true);
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
