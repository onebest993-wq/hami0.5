import React, { useEffect } from 'react';
import { EventCard } from './EventCard';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { eventMatchesCalendarFocus } from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';
import {
    EVENT_LIST_EXPAND_THRESHOLD,
    useProgressiveEventList,
} from './hooks/useProgressiveEventList';

export { EVENT_LIST_EXPAND_THRESHOLD };

type EventCardsListProps = {
    events: UnifiedEvent[];
    highlightEventId?: string;
    onEdit: (event: UnifiedEvent) => void;
    onDelete: (event: UnifiedEvent) => void;
    onOpenSource?: (event: UnifiedEvent) => void;
};

export const EventCardsList = React.memo(function EventCardsList({
    events,
    highlightEventId,
    onEdit,
    onDelete,
    onOpenSource,
}: EventCardsListProps) {
    const { visibleEvents, hiddenCount, expandAll, useVirtualScroll } = useProgressiveEventList(
        events,
        highlightEventId,
    );
    const visibleHighlightId = visibleEvents.find((e) =>
        eventMatchesCalendarFocus(e, highlightEventId),
    )?.id;

    useEffect(() => {
        if (!visibleHighlightId) return;
        const node = document.querySelector(`[data-testid="radar-event-card-${visibleHighlightId}"]`);
        if (!(node instanceof HTMLElement) || typeof node.scrollIntoView !== 'function') return;
        let reduceMotion = false;
        try {
            reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch {
            reduceMotion = false;
        }
        node.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior: reduceMotion ? 'auto' : 'smooth',
        });
    }, [visibleHighlightId]);

    return (
        <div
            className={
                useVirtualScroll
                    ? 'space-y-3 max-h-[min(70dvh,640px)] overflow-y-auto overscroll-contain scrollbar-hide'
                    : 'space-y-3'
            }
            data-testid="radar-event-cards-list"
        >
            {visibleEvents.map((event) => (
                <div
                    key={event.id}
                    className="[content-visibility:auto] [contain-intrinsic-size:auto_120px]"
                >
                    <EventCard
                        event={event}
                        highlighted={eventMatchesCalendarFocus(event, highlightEventId)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onOpenSource={onOpenSource}
                    />
                </div>
            ))}
            {hiddenCount > 0 ? (
                <button
                    type="button"
                    data-testid="radar-show-all-events"
                    onClick={expandAll}
                    className="w-full py-3 rounded-xl border border-white/10 bg-transparent hami-radar-text-secondary text-sm font-semibold hami-radar-hover-row touch-manipulation min-h-[44px]"
                >
                    عرض {hiddenCount} موعد إضافي
                </button>
            ) : null}
        </div>
    );
});
