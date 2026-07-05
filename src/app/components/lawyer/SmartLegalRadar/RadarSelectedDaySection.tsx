import React from 'react';
import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import { prefetchRadarEventForm } from '@/app/runtime/radarWidgetLoader';
import { getDayName } from './utils';
import { EmptyState } from './CalendarGrid';
import { EventCardsList } from './EventCardsList';
import { RadarAiBriefing } from './RadarAiBriefing';
import { RADAR_BTN_GOLD, RADAR_ICON_GOLD } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export type RadarSelectedDaySectionProps = {
    selectedDate: string;
    selectedEvents: UnifiedEvent[];
    highlightEventId?: string;
    aiBriefing: string | null;
    conflictMessage: string | null;
    onAddEvent: () => void;
    onEditEvent: (event: UnifiedEvent) => void;
    onDeleteEvent: (event: UnifiedEvent) => void;
    onOpenSource?: (event: UnifiedEvent) => void;
};

export const RadarSelectedDaySection = React.memo(function RadarSelectedDaySection({
    selectedDate,
    selectedEvents,
    highlightEventId,
    aiBriefing,
    conflictMessage,
    onAddEvent,
    onEditEvent,
    onDeleteEvent,
    onOpenSource,
}: RadarSelectedDaySectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[#F5EDE0]/95 font-bold flex items-center gap-2 text-sm sm:text-base">
                    <Calendar size={16} className={RADAR_ICON_GOLD} />
                    {selectedDate ? (
                        <span>{getDayName(selectedDate)} — {selectedDate}</span>
                    ) : (
                        'اختر تاريخاً'
                    )}
                </h2>
                <button
                    type="button"
                    onClick={onAddEvent}
                    onPointerEnter={prefetchRadarEventForm}
                    data-testid="radar-add-event"
                    className={RADAR_BTN_GOLD}
                >
                    <Plus size={16} />
                    إضافة موعد
                </button>
            </div>

            <>
                {selectedEvents.length > 0 && aiBriefing ? (
                    <RadarAiBriefing briefing={aiBriefing} />
                ) : null}

                {conflictMessage ? (
                    <div className="bg-rose-950/25 border border-rose-500/35 text-rose-300 text-sm p-3 rounded-xl flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>{conflictMessage}</span>
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
            </>
        </div>
    );
});
