import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from './RadarEmptyState';
import { EventCardsList } from './EventCardsList';
import { ScheduleConflictAlert } from './ScheduleConflictAlert';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';

export type RadarSelectedDaySectionProps = {
    selectedEvents: UnifiedEvent[];
    highlightEventId?: string;
    aiBriefing?: string;
    conflictMessage: string | null;
    scheduleConflict?: CrossSectionConflictResult | null;
    onEditEvent: (event: UnifiedEvent) => void;
    onDeleteEvent: (event: UnifiedEvent) => void | Promise<void>;
    onOpenSource?: (event: UnifiedEvent) => void;
};

export const RadarSelectedDaySection = React.memo(function RadarSelectedDaySection({
    selectedEvents,
    highlightEventId,
    conflictMessage,
    scheduleConflict = null,
    onEditEvent,
    onDeleteEvent,
    onOpenSource,
}: RadarSelectedDaySectionProps) {
    return (
        <div className="relative space-y-2.5 pb-4">
            {scheduleConflict?.hasConflict ? (
                <ScheduleConflictAlert conflict={scheduleConflict} />
            ) : null}

            {conflictMessage ? (
                <div className="rounded-xl border border-[#E8DCC8]/26 bg-[#2a241e]/90 text-[#F5EDE0] text-sm p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#B7C5C7]" aria-hidden />
                    <span className="text-[#E8DCC8]/90">{conflictMessage}</span>
                </div>
            ) : null}

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
