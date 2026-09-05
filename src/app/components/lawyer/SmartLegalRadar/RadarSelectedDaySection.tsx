import React from 'react';
import { EmptyState } from './RadarEmptyState';
import { EventCardsList } from './EventCardsList';
import { RadarDayNotices } from './RadarDayNotices';
import { useCalendarLiveHandoff } from '@/app/services/calendar/calendarLiveHandoffContext';
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
    /** لقطة كاش/جلب مؤكدة — لا جملة فارغة قبلها حتى لا تومض ثم تختفي */
    listSettled?: boolean;
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
    listSettled = true,
}: RadarSelectedDaySectionProps) {
    const handoff = useCalendarLiveHandoff();
    const showEmptyCopy = selectedEvents.length === 0 && listSettled;
    return (
        <div className="relative space-y-2 pb-3" data-testid="radar-selected-day-section">
            <RadarDayNotices
                scheduleConflict={scheduleConflict}
                conflictMessage={conflictMessage}
                dayBriefing={dayBriefing}
                hasEvents={selectedEvents.length > 0}
            />

            {selectedEvents.length === 0 ? (
                <EmptyState
                    testId={
                        showEmptyCopy && handoff ? 'radar-empty-state' : 'radar-live-pending-empty'
                    }
                    silent={!showEmptyCopy}
                />
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
