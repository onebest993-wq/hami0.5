import React from 'react';
import type { RadarOpenInstantDayEvent } from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel';

type RadarOpenInstantDayListProps = {
    events: RadarOpenInstantDayEvent[];
    snapshotReady: boolean;
    onOpenEvent: (event: RadarOpenInstantDayEvent) => void;
    onOpenSource: (event: RadarOpenInstantDayEvent) => void;
};

export const RadarOpenInstantDayList = React.memo(function RadarOpenInstantDayList({
    events,
    snapshotReady,
    onOpenEvent,
    onOpenSource,
}: RadarOpenInstantDayListProps) {
    if (events.length === 0) {
        if (!snapshotReady) {
            return (
                <div
                    className="hami-radar-empty"
                    data-testid="radar-empty-pending"
                    aria-busy="true"
                    aria-label="قائمة اليوم"
                />
            );
        }
        return (
            <div className="hami-radar-empty" data-testid="radar-empty-state">
                <p className="hami-radar-text-secondary text-[13px] font-medium leading-relaxed">
                    لا توجد مواعيد لهذا اليوم
                </p>
            </div>
        );
    }

    return (
        <div className="relative space-y-2 pb-3" data-testid="radar-open-instant-day-list">
            {events.map((event) => (
                <article
                    key={event.id}
                    data-testid={`radar-open-instant-event-${event.id}`}
                    className="relative hami-radar-event-card overflow-hidden w-full"
                >
                    <div className="px-3 py-2 space-y-1" dir="rtl">
                        <div className="flex items-start gap-1 min-w-0">
                            <button
                                type="button"
                                className="min-w-0 flex-1 text-right touch-manipulation"
                                onClick={() =>
                                    event.bridged ? onOpenSource(event) : onOpenEvent(event)
                                }
                                aria-label={
                                    event.bridged
                                        ? `فتح مصدر الموعد ${event.title}`
                                        : `تعديل الموعد ${event.title}`
                                }
                            >
                                <p className="text-[11px] font-semibold hami-radar-text-secondary">
                                    {event.kindLabel}
                                    {event.sourceLabel ? ` · ${event.sourceLabel}` : ''}
                                    {event.timeLabel ? ` · ${event.timeLabel}` : ''}
                                    {event.countdownLabel ? ` · ${event.countdownLabel}` : ''}
                                </p>
                                <p className="text-[14px] font-semibold leading-snug hami-radar-text-primary">
                                    {event.title}
                                </p>
                            </button>
                            {event.bridged ? (
                                <button
                                    type="button"
                                    data-testid={`radar-event-open-source-${event.id}`}
                                    onClick={() => onOpenSource(event)}
                                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold hami-radar-text-secondary touch-manipulation"
                                    aria-label={`فتح المصدر الأصلي للموعد ${event.title}`}
                                >
                                    المصدر
                                </button>
                            ) : null}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
});
