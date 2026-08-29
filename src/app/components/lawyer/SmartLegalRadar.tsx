import React, { useCallback } from 'react';

import './SmartLegalRadar/radarFormCritical.css';

import { useCalendarData } from '@/app/components/lawyer/hooks/useCalendarData';
import { RadarHeader } from './SmartLegalRadar/RadarHeader';
import { MonthNav } from './SmartLegalRadar/RadarMonthNav';
import { RadarShell } from './SmartLegalRadar/RadarShell';
import { RadarSelectedDaySection } from './SmartLegalRadar/RadarSelectedDaySection';
import { CalendarGridHost } from './SmartLegalRadar/CalendarGridHost';
import { EventForm } from './SmartLegalRadar/EventForm';
import { useSmartLegalRadarView } from './SmartLegalRadar/hooks/useSmartLegalRadarView';
import { useSmartLegalRadarForm } from './SmartLegalRadar/hooks/useSmartLegalRadarForm';
import { useSmartLegalRadarDayInsights } from './SmartLegalRadar/hooks/useSmartLegalRadarDayInsights';
import { useSmartLegalRadarLifecycle } from './SmartLegalRadar/hooks/useSmartLegalRadarLifecycle';
import { useSmartLegalRadarSchedule } from './SmartLegalRadar/hooks/useSmartLegalRadarSchedule';
import { useScheduleTabEscape } from './SmartLegalRadar/hooks/useScheduleTabEscape';
import { RADAR_SCROLL } from './SmartLegalRadar/radarTheme';
import { RadarAddEventDock } from './SmartLegalRadar/RadarAddEventDock';
import { RadarCalendarSyncError } from './SmartLegalRadar/RadarCalendarSyncError';

interface SmartLegalRadarProps {
    onBack: () => void;
    userId: string;
    initialDate?: string;
    initialEventId?: string;
    onOpenSource?: (sourceModule: string, sourceEntityId: string, sourceEventId?: string) => void;
    /** false عند keep-alive مخفي — يوقف سرقة Cap/Escape */
    screenActive?: boolean;
}

/** لا نضبط data-hami-feature-open هنا: يصارع علم التقويم على html ويسود الخروج */
export const SmartLegalRadar = React.memo(function SmartLegalRadar({
    onBack,
    userId,
    initialDate,
    initialEventId,
    onOpenSource,
    screenActive = true,
}: SmartLegalRadarProps) {
    const view = useSmartLegalRadarView(initialDate);
    const {
        allEvents,
        customEvents,
        effectiveUserId,
        getEventsForDate,
        addEvent,
        deleteEvent,
        updateEvent,
        syncing: foregroundSyncing,
        error: calendarError,
        refresh: refreshCalendar,
    } = useCalendarData(userId);

    useSmartLegalRadarLifecycle(userId, allEvents.length, screenActive);

    const form = useSmartLegalRadarForm({
        selectedDate: view.selectedDate,
        effectiveUserId,
        customEvents,
        addEvent,
        updateEvent,
        deleteEvent,
    });

    useScheduleTabEscape({
        enabled: screenActive,
        showForm: form.showForm,
        formSaving: form.saving,
        onCloseForm: form.closeForm,
        onBack,
    });

    const {
        highlightEventId,
        daysInMonth,
        firstDayOfMonth,
        eventsByDateForMonth,
        selectedEvents,
        datesWithEvents,
    } = useSmartLegalRadarSchedule(allEvents, getEventsForDate, view, initialEventId);

    const { conflictMessage, dayBriefing, scheduleConflict } = useSmartLegalRadarDayInsights(
        selectedEvents,
    );

    const handleOpenSource = useCallback(
        (ev: (typeof selectedEvents)[number]) => {
            const mod = ev.bridge?.sourceModule;
            const entId = ev.bridge?.sourceEntityId;
            if (mod && entId) onOpenSource?.(mod, entId, ev.bridge?.sourceEventId);
        },
        [onOpenSource],
    );

    return (
        <RadarShell>
            <RadarHeader onBack={onBack} syncing={foregroundSyncing} />

            <div className={RADAR_SCROLL}>
                {calendarError ? (
                    <RadarCalendarSyncError message={calendarError} onRetry={refreshCalendar} />
                ) : null}

                <MonthNav
                    viewYear={view.viewYear}
                    viewMonth={view.viewMonth}
                    onPrevMonth={view.prevMonth}
                    onNextMonth={view.nextMonth}
                    onGoToToday={view.goToToday}
                    showFullMonth={view.showFullMonth}
                    onToggleFullMonth={view.toggleFullMonth}
                    selectedDate={view.selectedDate}
                    datesWithEvents={datesWithEvents}
                    onSelectDate={view.focusDate}
                />

                <CalendarGridHost
                    visible={view.showFullMonth}
                    viewYear={view.viewYear}
                    viewMonth={view.viewMonth}
                    firstDayOfMonth={firstDayOfMonth}
                    daysInMonth={daysInMonth}
                    selectedDate={view.selectedDate}
                    eventsByDate={eventsByDateForMonth}
                    onDateClick={view.handleDateClick}
                />

                <RadarSelectedDaySection
                    selectedEvents={selectedEvents}
                    highlightEventId={highlightEventId}
                    dayBriefing={dayBriefing ?? undefined}
                    conflictMessage={conflictMessage}
                    scheduleConflict={scheduleConflict}
                    onEditEvent={form.openEditForm}
                    onDeleteEvent={form.handleDelete}
                    onOpenSource={handleOpenSource}
                />
            </div>

            <RadarAddEventDock selectedDate={view.selectedDate} onAddEvent={form.openAddForm} />

            <EventForm
                show={form.showForm}
                onClose={form.closeForm}
                formData={form.formData}
                editingEvent={form.editingEvent}
                saving={form.saving}
                onSave={form.handleSave}
                onDelete={form.handleFormDelete}
            />
        </RadarShell>
    );
});
