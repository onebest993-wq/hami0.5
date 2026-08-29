import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventMatchesCalendarFocus } from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';

export const EVENT_LIST_EXPAND_THRESHOLD = 15;
const EVENT_LIST_VIRTUAL_SCROLL_THRESHOLD = 25;
const PROGRESSIVE_BATCH_SIZE = 12;

export function useProgressiveEventList<T extends { id: string }>(
    events: T[],
    highlightEventId?: string,
) {
    const [showAll, setShowAll] = useState(false);
    const [renderCount, setRenderCount] = useState(EVENT_LIST_EXPAND_THRESHOLD);

    const highlightIndex = useMemo(() => {
        if (highlightEventId == null) return -1;
        return events.findIndex((e) => eventMatchesCalendarFocus(e, highlightEventId));
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

    return {
        visibleEvents,
        hiddenCount,
        expandAll,
        useVirtualScroll: events.length > EVENT_LIST_VIRTUAL_SCROLL_THRESHOLD,
    };
}
