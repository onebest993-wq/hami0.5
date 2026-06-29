import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useCalendarData, buildEventsByDateIndex } from '@/app/components/lawyer/hooks/useCalendarData';
import { RadarHeader, MonthNav } from './SmartLegalRadar/RadarHeader';
import { CalendarGrid } from './SmartLegalRadar/CalendarGrid';
import { RadarShell } from './SmartLegalRadar/RadarShell';
import { RadarSelectedDaySection } from './SmartLegalRadar/RadarSelectedDaySection';
import { timeValue } from './SmartLegalRadar/utils';
import { useSmartLegalRadarView } from './SmartLegalRadar/hooks/useSmartLegalRadarView';
import { useSmartLegalRadarForm } from './SmartLegalRadar/hooks/useSmartLegalRadarForm';
import { useSmartLegalRadarDayInsights } from './SmartLegalRadar/hooks/useSmartLegalRadarDayInsights';
import { useSmartLegalRadarLifecycle } from './SmartLegalRadar/hooks/useSmartLegalRadarLifecycle';
import { RADAR_SCROLL } from './SmartLegalRadar/radarTheme';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';

const LazyEventForm = lazy(() =>
    import('./SmartLegalRadar/EventForm').then((m) => ({ default: m.EventForm })),
);

interface SmartLegalRadarProps {
    onBack: () => void;
    userId: string;
    initialDate?: string;
    initialEventId?: string;
    onOpenSource?: (sourceModule: string, sourceEntityId: string) => void;
}

export const SmartLegalRadar: React.FC<SmartLegalRadarProps> = ({
    onBack,
    userId,
    initialDate,
    initialEventId,
    onOpenSource,
}) => {
    const [highlightEventId, setHighlightEventId] = useState<string | undefined>(initialEventId);

    useOpaqueFeatureSurface(true);

    const view = useSmartLegalRadarView(initialDate);

    useEffect(() => {
        if (!initialEventId) return;
        setHighlightEventId(initialEventId);
        const t = window.setTimeout(() => setHighlightEventId(undefined), 8000);
        return () => window.clearTimeout(t);
    }, [initialEventId]);

    const {
        allEvents,
        customEvents,
        effectiveUserId,
        getEventsForDate,
        addEvent,
        deleteEvent,
        updateEvent,
        loading,
        syncing,
        error: calendarError,
    } = useCalendarData(userId);

    useSmartLegalRadarLifecycle(userId, loading, allEvents.length);

    const form = useSmartLegalRadarForm({
        selectedDate: view.selectedDate,
        effectiveUserId,
        customEvents,
        addEvent,
        updateEvent,
        deleteEvent,
    });

    const daysInMonth = useMemo(
        () => new Date(view.viewYear, view.viewMonth + 1, 0).getDate(),
        [view.viewYear, view.viewMonth],
    );
    const firstDayOfMonth = useMemo(
        () => new Date(view.viewYear, view.viewMonth, 1).getDay(),
        [view.viewYear, view.viewMonth],
    );
    const eventsByDateForMonth = useMemo(
        () => buildEventsByDateIndex(allEvents, view.viewYear, view.viewMonth),
        [view.viewYear, view.viewMonth, allEvents],
    );

    const selectedEvents = useMemo(() => {
        if (!view.selectedDate) return [];
        const d = new Date(`${view.selectedDate}T12:00:00`);
        if (Number.isNaN(d.getTime())) return [];
        return getEventsForDate(d).sort((a, b) => timeValue(a.time) - timeValue(b.time));
    }, [getEventsForDate, view.selectedDate]);

    const { conflictMessage, aiBriefing } = useSmartLegalRadarDayInsights(selectedEvents);

    const loadingDay = loading && allEvents.length === 0;
    const headerProps = {
        onBack,
        viewYear: view.viewYear,
        viewMonth: view.viewMonth,
        onPrevMonth: view.prevMonth,
        onNextMonth: view.nextMonth,
        onGoToToday: view.goToToday,
        showFullMonth: view.showFullMonth,
        onToggleFullMonth: view.toggleFullMonth,
        syncing,
    };

    const handleOpenSource = onOpenSource
        ? (ev: (typeof selectedEvents)[number]) => {
              const mod = ev.bridge?.sourceModule;
              const entId = ev.bridge?.sourceEntityId;
              if (mod && entId) onOpenSource(mod, entId);
          }
        : undefined;

    return (
        <RadarShell loading={loadingDay}>
            <RadarHeader {...headerProps} />

            <div className={RADAR_SCROLL}>
                {calendarError ? (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                        {calendarError}
                    </div>
                ) : null}

                <MonthNav {...headerProps} />

                {view.showFullMonth ? (
                    <CalendarGrid
                        viewYear={view.viewYear}
                        viewMonth={view.viewMonth}
                        firstDayOfMonth={firstDayOfMonth}
                        daysInMonth={daysInMonth}
                        selectedDate={view.selectedDate}
                        eventsByDate={eventsByDateForMonth}
                        onDateClick={view.handleDateClick}
                    />
                ) : null}

                <RadarSelectedDaySection
                    selectedDate={view.selectedDate}
                    selectedEvents={selectedEvents}
                    highlightEventId={highlightEventId}
                    loadingDay={loadingDay}
                    aiBriefing={aiBriefing}
                    conflictMessage={conflictMessage}
                    onAddEvent={form.openAddForm}
                    onEditEvent={form.openEditForm}
                    onDeleteEvent={form.handleDelete}
                    onOpenSource={handleOpenSource}
                />
            </div>

            {form.showForm ? (
                <Suspense fallback={null}>
                    <LazyEventForm
                        show={form.showForm}
                        onClose={form.closeForm}
                        formData={form.formData}
                        editingEvent={form.editingEvent}
                        saving={form.saving}
                        onFormChange={form.handleFormChange}
                        onSave={form.handleSave}
                        onDelete={form.handleFormDelete}
                    />
                </Suspense>
            ) : null}
        </RadarShell>
    );
};
