import React, { useMemo } from 'react';
import { RADAR_TEXT } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { buildEventCardViewModel } from './eventCardViewModel';
import { EventCardChips } from './EventCardChips';
import { EventCardDetails } from './EventCardDetails';
import { EventCardActions } from './EventCardActions';

interface EventCardProps {
    event: UnifiedEvent;
    highlighted?: boolean;
    onEdit: (event: UnifiedEvent) => void;
    onDelete: (event: UnifiedEvent) => void;
    onOpenSource?: (event: UnifiedEvent) => void;
}

export const EventCard = React.memo(function EventCard({
    event,
    highlighted,
    onEdit,
    onDelete,
    onOpenSource,
}: EventCardProps) {
    const model = useMemo(
        () => buildEventCardViewModel(event, Boolean(event.isBridged && onOpenSource)),
        [event, onOpenSource],
    );

    return (
        <article
            className={`relative hami-radar-event-card overflow-hidden ${
                highlighted ? 'hami-radar-event-card--highlighted' : ''
            }`}
            data-testid={`radar-event-card-${model.eventId}`}
            data-highlighted={highlighted ? '1' : undefined}
        >
            <div className="px-3 py-2.5 space-y-1.5" dir="rtl">
                <div className="flex items-start gap-1 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <EventCardChips model={model} />

                        <p
                            className={`text-[14px] font-semibold leading-snug ${RADAR_TEXT}`}
                            data-testid={`radar-event-title-${model.eventId}`}
                        >
                            {model.displayTitle}
                        </p>

                        <EventCardDetails model={model} />
                    </div>

                    <EventCardActions
                        event={event}
                        canOpenSource={model.canOpenSource}
                        canMutateCalendar={model.canMutateCalendar}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onOpenSource={onOpenSource}
                    />
                </div>
            </div>
        </article>
    );
});
