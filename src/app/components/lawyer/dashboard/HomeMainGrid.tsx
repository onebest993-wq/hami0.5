import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { scheduleHomeMainGridPainted } from '@/app/bootstrap/homeMainGridPaintAnnounce';
import { HomeMainZoneErrorBoundary } from '@/app/components/lawyer/dashboard/HomeMainZoneErrorBoundary';
import type { HomeMainGridSlot } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import { HAMI_SHELL_CONTAINER } from '@/app/components/lawyer/dashboard/lawyerShellLayout';

export function HomeMainGrid({
    visible,
    slots,
    renderSlot,
    announcePaint = false,
}: {
    visible: boolean;
    slots: HomeMainGridSlot[];
    renderSlot: (slot: HomeMainGridSlot) => React.ReactNode;
    /** كشف البحر من أول شبكة مرسومة — هيكل أول إطار أو البلاطات الحية */
    announcePaint?: boolean;
}): React.ReactElement {
    const homeGridRef = useRef<HTMLDivElement | null>(null);
    const setHomeGridRef = useCallback(
        (node: HTMLDivElement | null) => {
            homeGridRef.current = node;
            if (node && announcePaint) scheduleHomeMainGridPainted(node);
        },
        [announcePaint],
    );

    useLayoutEffect(() => {
        if (!visible) return;
        if (announcePaint) scheduleHomeMainGridPainted(homeGridRef.current);
    }, [visible, slots.length, announcePaint]);

    return (
        <div
            data-testid="home-main-zone"
            aria-hidden={!visible}
            className={`hami-home-main-zone relative z-[1] hami-shell-gutter-x hami-home-main-zone-pad${
                visible ? '' : ' invisible pointer-events-none'
            }`}
        >
            <div className={`${HAMI_SHELL_CONTAINER} pb-3`}>
                <HomeMainZoneErrorBoundary>
                    <div
                        ref={setHomeGridRef}
                        data-testid="home-main-grid"
                    >
                        {slots.map((slot) => (
                            <div
                                key={slot.id}
                                data-hami-widget-slot=""
                                style={slot.style}
                                data-hami-layout-span={slot.span}
                            >
                                {renderSlot(slot)}
                            </div>
                        ))}
                    </div>
                </HomeMainZoneErrorBoundary>
            </div>
        </div>
    );
}
