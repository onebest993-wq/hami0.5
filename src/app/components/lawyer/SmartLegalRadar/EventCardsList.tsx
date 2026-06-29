import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EventCard } from './EventCard';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

/** فوق هذا العدد — دفعة أولى + expand مع render تدريجي */
export const EVENT_LIST_EXPAND_THRESHOLD = 15;
/** فوق هذا — قائمة قابلة للتمرير + content-visibility */
export const EVENT_LIST_VIRTUAL_SCROLL_THRESHOLD = 25;
const PROGRESSIVE_BATCH_SIZE = 12;

export type EventCardsListProps = {
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
    const [showAll, setShowAll] = useState(false);
    const [renderCount, setRenderCount] = useState(EVENT_LIST_EXPAND_THRESHOLD);

    const highlightIndex = useMemo(() => {
        if (highlightEventId == null) return -1;
        return events.findIndex((e) => String(e.id) === String(highlightEventId));
    }, [events, highlightEventId]);

    useEffect(() => {
        setShowAll(false);
        setRenderCount(EVENT_LIST_EXPAND_THRESHOLD);
    }, [events]);

    useEffect(() => {
        if (highlightIndex >= EVENT_LIST_EXPAND_THRESHOLD) {
            setShowAll(true);
        }
    }, [highlightIndex]);

    const needsExpand = events.length > EVENT_LIST_EXPAND_THRESHOLD;
    const cap = needsExpand && !showAll ? EVENT_LIST_EXPAND_THRESHOLD : events.length;
    const visibleEvents = events.slice(0, Math.min(renderCount, cap));
    const hiddenCount = needsExpand && !showAll ? events.length - EVENT_LIST_EXPAND_THRESHOLD : 0;

    const expandAll = useCallback(() => {
        setShowAll(true);
        setRenderCount(EVENT_LIST_EXPAND_THRESHOLD);
    }, []);

    useEffect(() => {
        if (!showAll || events.length <= EVENT_LIST_EXPAND_THRESHOLD) return undefined;

        let cancelled = false;
        let count = EVENT_LIST_EXPAND_THRESHOLD;
        const step = () => {
            if (cancelled) return;
            count = Math.min(count + PROGRESSIVE_BATCH_SIZE, events.length);
            setRenderCount(count);
            if (count < events.length) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
        return () => {
            cancelled = true;
        };
    }, [showAll, events.length]);

    return (
        <div
            className={
                events.length > EVENT_LIST_VIRTUAL_SCROLL_THRESHOLD
                    ? 'space-y-3 max-h-[min(70dvh,640px)] overflow-y-auto overscroll-contain scrollbar-hide'
                    : 'space-y-3'
            }
            data-testid="radar-event-cards-list"
        >
            {visibleEvents.map((event, idx) => (
                <div
                    key={event.id}
                    className="[content-visibility:auto] [contain-intrinsic-size:auto_120px]"
                >
                    <EventCard
                        event={event}
                        index={idx}
                        highlighted={highlightEventId != null && String(event.id) === String(highlightEventId)}
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
                    className="w-full py-3 rounded-xl border border-[#F5EDE0]/12 bg-[#F5EDE0]/[0.04] text-[#E8DCC8]/80 text-sm font-bold hover:bg-[#F5EDE0]/[0.07] hover:text-[#F5EDE0] transition-colors touch-manipulation min-h-[44px]"
                >
                    عرض {hiddenCount} موعد إضافي
                </button>
            ) : null}
        </div>
    );
});
