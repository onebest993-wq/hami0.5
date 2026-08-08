import React, { useEffect, useMemo, useState, useCallback } from 'react';

import { useCalendarData, buildEventsByDateIndex } from '@/app/components/lawyer/hooks/useCalendarData';

import { RadarHeader, MonthNav } from './SmartLegalRadar/RadarHeader';

import { RadarShell } from './SmartLegalRadar/RadarShell';

import { RadarSelectedDaySection } from './SmartLegalRadar/RadarSelectedDaySection';

import { CalendarGridHost } from './SmartLegalRadar/CalendarGridHost';

import { EventFormHost } from './SmartLegalRadar/EventFormHost';

import { timeValue } from './SmartLegalRadar/utils';

import { useSmartLegalRadarView } from './SmartLegalRadar/hooks/useSmartLegalRadarView';

import { useSmartLegalRadarForm } from './SmartLegalRadar/hooks/useSmartLegalRadarForm';

import { useSmartLegalRadarDayInsights } from './SmartLegalRadar/hooks/useSmartLegalRadarDayInsights';

import { useSmartLegalRadarLifecycle } from './SmartLegalRadar/hooks/useSmartLegalRadarLifecycle';

import { useScheduleTabEscape } from './SmartLegalRadar/hooks/useScheduleTabEscape';

import { RADAR_SCROLL } from './SmartLegalRadar/radarTheme';

import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';

import { RadarAddEventDock } from './SmartLegalRadar/RadarAddEventDock';
import { SparkCalendarNudgeHost } from '@/app/spark/ui/SparkCalendarNudgeHost';
import type { CalendarSparkSupplementalInput } from '@/app/spark/calendar/calendarSparkSupplementalScan';



interface SmartLegalRadarProps {

    onBack: () => void;

    userId: string;

    initialDate?: string;

    initialEventId?: string;

    onOpenSource?: (sourceModule: string, sourceEntityId: string) => void;

    onOpenRepositoryNote?: (noteId: string) => void;

    calendarSparkSupplemental?: CalendarSparkSupplementalInput;

    /** false عند keep-alive مخفي — يوقف سرقة Cap/Escape */
    screenActive?: boolean;

}



export const SmartLegalRadar: React.FC<SmartLegalRadarProps> = ({

    onBack,

    userId,

    initialDate,

    initialEventId,

    onOpenSource,

    onOpenRepositoryNote,

    calendarSparkSupplemental,

    screenActive = true,

}) => {

    const [highlightEventId, setHighlightEventId] = useState<string | undefined>(initialEventId);



    useOpaqueFeatureSurface(screenActive, '#121212');



    const view = useSmartLegalRadarView(initialDate);



    useEffect(() => {

        if (!initialEventId) return;

        setHighlightEventId(initialEventId);

        const t = window.setTimeout(() => setHighlightEventId(undefined), 8000);

        return () => window.clearTimeout(t);

    }, [initialEventId]);



    const {

        allEvents,

        sparkScanEvents,

        customEvents,

        effectiveUserId,

        getEventsForDate,

        addEvent,

        deleteEvent,

        updateEvent,

        backgroundSyncing,

        syncing: foregroundSyncing,

        error: calendarError,

    } = useCalendarData(userId);

    useSmartLegalRadarLifecycle(userId, foregroundSyncing || backgroundSyncing, allEvents.length);



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



    const { conflictMessage, aiBriefing, scheduleConflict } = useSmartLegalRadarDayInsights(selectedEvents);



    const headerProps = {

        onBack,

        viewYear: view.viewYear,

        viewMonth: view.viewMonth,

        onPrevMonth: view.prevMonth,

        onNextMonth: view.nextMonth,

        onGoToToday: view.goToToday,

        showFullMonth: view.showFullMonth,

        onToggleFullMonth: view.toggleFullMonth,

        selectedDate: view.selectedDate,

        syncing: foregroundSyncing,

    };



    const handleOpenSource = useCallback(
        (ev: (typeof selectedEvents)[number]) => {
            const mod = ev.bridge?.sourceModule;
            const entId = ev.bridge?.sourceEntityId;
            if (mod && entId) onOpenSource?.(mod, entId);
        },
        [onOpenSource],
    );

    const handleFocusCalendarEvent = useCallback(
        (eventId: string, date: string) => {
            view.focusDate(date);
            setHighlightEventId(eventId);
        },
        [view],
    );

    const handleFocusCalendarDay = useCallback(
        (dateYmd: string) => {
            view.focusDate(dateYmd);
        },
        [view],
    );



    return (

        <RadarShell>

            <RadarHeader {...headerProps} />



            <div className={RADAR_SCROLL}>

                {calendarError ? (

                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">

                        {calendarError}

                    </div>

                ) : null}



                <MonthNav {...headerProps} />

                <SparkCalendarNudgeHost
                    allEvents={sparkScanEvents}
                    supplemental={calendarSparkSupplemental}
                    disabled={!screenActive}
                    onFocusEvent={handleFocusCalendarEvent}
                    onFocusDay={handleFocusCalendarDay}
                    onOpenSource={onOpenSource}
                    onOpenRepositoryNote={onOpenRepositoryNote}
                    suppressConflictNudge={scheduleConflict.hasConflict}
                    selectedDateYmd={view.selectedDate}
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

                    aiBriefing={aiBriefing ?? undefined}

                    conflictMessage={conflictMessage}

                    scheduleConflict={scheduleConflict}

                    onEditEvent={form.openEditForm}

                    onDeleteEvent={form.handleDelete}

                    onOpenSource={handleOpenSource}

                />

            </div>



            <RadarAddEventDock

                selectedDate={view.selectedDate}

                onAddEvent={form.openAddForm}

            />



            <EventFormHost

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

};


