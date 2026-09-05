import React, { Suspense, useCallback, useEffect, useSyncExternalStore } from 'react';

import { useCalendarData } from '@/app/components/lawyer/hooks/useCalendarData';
import { RadarHeader } from './SmartLegalRadar/RadarHeader';
import { MonthNav } from './SmartLegalRadar/RadarMonthNav';
import { RadarShell } from './SmartLegalRadar/RadarShell';
import { RadarSelectedDaySection } from './SmartLegalRadar/RadarSelectedDaySection';
import { CalendarGridHost } from './SmartLegalRadar/CalendarGridHost';
import { useSmartLegalRadarView } from './SmartLegalRadar/hooks/useSmartLegalRadarView';
import { useSmartLegalRadarForm } from './SmartLegalRadar/hooks/useSmartLegalRadarForm';
import { useSmartLegalRadarDayInsights } from './SmartLegalRadar/hooks/useSmartLegalRadarDayInsights';
import { useSmartLegalRadarLifecycle } from './SmartLegalRadar/hooks/useSmartLegalRadarLifecycle';
import { useSmartLegalRadarSchedule } from './SmartLegalRadar/hooks/useSmartLegalRadarSchedule';
import { useScheduleTabEscape } from './SmartLegalRadar/hooks/useScheduleTabEscape';
import { RADAR_SCROLL } from './SmartLegalRadar/radarTheme';
import { RadarAddEventDock } from './SmartLegalRadar/RadarAddEventDock';
import { RadarCalendarSyncError } from './SmartLegalRadar/RadarCalendarSyncError';
import { RadarEventFormInstantCover } from '@/app/components/lawyer/dashboard/schedule/RadarEventFormInstantCover';
import { useCalendarLiveHandoff } from '@/app/services/calendar/calendarLiveHandoffContext';
import {
    hasCachedCalendarEvents,
    subscribeCalendarEventsCache,
} from '@/app/services/calendar/calendarEventsCache';

import {
    loadRadarEventFormModule,
    prefetchRadarEventForm,
} from '@/app/components/lawyer/dashboard/schedule/prefetchRadarEventForm';

const EventFormLazy = React.lazy(async () => {
    const mod = await loadRadarEventFormModule();
    return { default: mod.EventForm };
});

interface SmartLegalRadarProps {
    onBack: () => void;
    userId: string;
    initialDate?: string;
    initialEventId?: string;
    onOpenSource?: (sourceModule: string, sourceEntityId: string, sourceEventId?: string) => void;
    /** false عند keep-alive مخفي — يوقف سرقة Cap/Escape */
    screenActive?: boolean;
    /** جسم فقط داخل كروم الصدفة — بلا رأس/أسبوع/مرساة إضافة مكررة */
    embedInChrome?: boolean;
}

/** لا نضبط data-hami-feature-open هنا: يصارع علم التقويم على html ويسود الخروج */
export const SmartLegalRadar = React.memo(function SmartLegalRadar({
    onBack,
    userId,
    initialDate,
    initialEventId,
    onOpenSource,
    screenActive = true,
    embedInChrome = false,
}: SmartLegalRadarProps) {
    const chromeHandoff = useCalendarLiveHandoff();
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
    const calendarCacheReady = useSyncExternalStore(
        subscribeCalendarEventsCache,
        () => hasCachedCalendarEvents(effectiveUserId),
        () => false,
    );

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
        enabled: screenActive && !embedInChrome,
        showForm: form.showForm,
        formSaving: form.saving,
        onCloseForm: form.closeForm,
        onBack,
    });

    useEffect(() => {
        if (!screenActive) return;
        let idleId = 0;
        let timeoutId = 0;
        const load = () => {
            prefetchRadarEventForm();
        };
        if (typeof window.requestIdleCallback === 'function') {
            idleId = window.requestIdleCallback(load, { timeout: 1200 });
        } else {
            timeoutId = window.setTimeout(load, 280);
        }
        return () => {
            if (idleId && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(idleId);
            }
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, [screenActive]);

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

    const body = (
        <>
            {calendarError ? (
                <RadarCalendarSyncError message={calendarError} onRetry={refreshCalendar} />
            ) : null}

            {embedInChrome ? null : (
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
            )}

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
                listSettled={calendarCacheReady || allEvents.length > 0}
            />
        </>
    );

    const formOverlay = form.showForm ? (
        <Suspense fallback={<RadarEventFormInstantCover onClose={form.closeForm} />}>
            <EventFormLazy
                show
                onClose={form.closeForm}
                formData={form.formData}
                editingEvent={form.editingEvent}
                saving={form.saving}
                onSave={form.handleSave}
                onDelete={form.handleFormDelete}
            />
        </Suspense>
    ) : null;

    if (embedInChrome) {
        return (
            <RadarShell embed>
                <div hidden={!chromeHandoff} aria-hidden={!chromeHandoff}>
                    {body}
                </div>
                {formOverlay}
            </RadarShell>
        );
    }

    return (
        <RadarShell>
            <RadarHeader onBack={onBack} syncing={foregroundSyncing} />

            <div className={RADAR_SCROLL}>{body}</div>

            <RadarAddEventDock selectedDate={view.selectedDate} onAddEvent={form.openAddForm} />

            {formOverlay}
        </RadarShell>
    );
});
