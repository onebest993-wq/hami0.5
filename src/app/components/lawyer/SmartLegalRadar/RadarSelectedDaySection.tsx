import React from 'react';
import { EmptyState } from './RadarEmptyState';
import { EventCardsList } from './EventCardsList';
import { RadarDayNotices } from './RadarDayNotices';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';

type RadarSelectedDaySectionProps = {
    selectedEvents: UnifiedEvent[];
    highlightEventId?: string;
    dayBriefing?: string;
    conflictMessage: string | null;
    scheduleConflict?: CrossSectionConflictResult | null;
    onEditEvent: (event: UnifiedEvent) => void;
    onDeleteEvent: (event: UnifiedEvent) => void | Promise<void>;
    onOpenSource?: (event: UnifiedEvent) => void;
};

export const RadarSelectedDaySection = React.memo(function RadarSelectedDaySection({
    selectedEvents,
    highlightEventId,
    dayBriefing,
    conflictMessage,
    scheduleConflict = null,
    onEditEvent,
    onDeleteEvent,
    onOpenSource,
}: RadarSelectedDaySectionProps) {
    return (
        <div className="relative space-y-2.5 pb-4">
            <RadarDayNotices
                scheduleConflict={scheduleConflict}
                conflictMessage={conflictMessage}
                dayBriefing={dayBriefing}
                hasEvents={selectedEvents.length > 0}
            />

            {selectedEvents.length === 0 ? (
                <EmptyState />
            ) : (
                <EventCardsList
                    events={selectedEvents}
                    highlightEventId={highlightEventId}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                    onOpenSource={onOpenSource}
                />
            )}
        </div>
    );
});
