import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import {
    HomeArrowRightIcon,
    HomeChevronLeftIcon,
    HomeChevronRightIcon,
    HomePlusIcon,
} from '@/app/components/lawyer/dashboard/homeStemIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    buildRadarOpenInstantSnapshot,
    radarOpenInstantWeekDayClass,
    type RadarOpenInstantDayEvent,
} from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel';
import { RadarOpenInstantMonthGrid } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantMonthGrid';
import { RadarOpenInstantDayList } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantDayList';
import { RadarOpenInstantAddHost } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantAddHost';
import { prefetchRadarEventForm } from '@/app/components/lawyer/dashboard/schedule/prefetchRadarEventForm';
import { getCachedCalendarEvents, subscribeCalendarEventsCache } from '@/app/services/calendar/calendarEventsCache';
import {
    isCalendarEventFormOpen,
    isCalendarReminderOverlayOpen,
} from '@/app/services/calendar/calendarReminderOverlayGate';
import { requestCalendarOpenSource } from '@/app/services/calendar/calendarOpenSourceIntent';
import {
    focusCalendarShellDate,
    patchCalendarShellSession,
    peekCalendarShellSession,
    seedCalendarShellSession,
    subscribeCalendarShellSession,
    applyCalendarShellMonthShift,
    requestCalendarShellEdit,
} from '@/app/services/calendar/calendarShellSession';
import { calendarTodayYmd } from '@/app/services/calendar/calendarMonthMath';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import {
    RADAR_ADD_DOCK,
    RADAR_BACK_BTN,
    RADAR_BTN_ADD,
    RADAR_BTN_GHOST_ACTIVE,
    RADAR_HEADER,
    RADAR_MONTH_CALENDAR_BTN,
    RADAR_MONTH_NAV,
    RADAR_NAV_ICON_BTN,
    RADAR_PAGE,
    RADAR_SCROLL,
    RADAR_TITLE,
} from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeClasses';
import '@/app/components/lawyer/SmartLegalRadar/radarCss/radarPage.css';
import '@/app/components/lawyer/SmartLegalRadar/radarCss/radarChrome.css';
import '@/app/components/lawyer/SmartLegalRadar/radarCss/radarCards.css';

/**
 * كروم التقويم الدائم — أسبوع/شهر/قائمة/إضافة من الكاش.
 * لا تستورد JS SmartLegalRadar حتى لا يدخل جذع MainView.
 */
export const RadarOpenInstantChrome = memo(function RadarOpenInstantChrome({
    onBack,
    userId,
    liveReady = false,
    liveBody = null,
    interactive = true,
}: {
    onBack: () => void;
    userId?: string | null;
    liveReady?: boolean;
    liveBody?: ReactNode;
    interactive?: boolean;
}): React.ReactElement {
    const [cacheTick, setCacheTick] = useState(0);
    const [shellTick, setShellTick] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const cacheUserId = resolveCalendarUserId(userId ?? null);

    useLayoutEffect(() => {
        seedCalendarShellSession();
        const unsubCache = subscribeCalendarEventsCache(() => {
            setCacheTick((n) => n + 1);
        });
        const unsubShell = subscribeCalendarShellSession(() => {
            setShellTick((n) => n + 1);
        });
        if (getCachedCalendarEvents(cacheUserId)?.length) {
            setCacheTick((n) => n + 1);
        }
        return () => {
            unsubCache();
            unsubShell();
        };
    }, [cacheUserId]);

    const snapshot = useMemo(
        () => buildRadarOpenInstantSnapshot(new Date(), cacheUserId, peekCalendarShellSession()),
        [cacheUserId, cacheTick, shellTick],
    );

    const setFormVisible = useCallback((open: boolean, eventId: string | null = null) => {
        setFormOpen(open);
        setEditingEventId(open ? eventId : null);
        if (open) prefetchRadarEventForm();
    }, []);

    useEffect(() => {
        if (!interactive) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isCalendarReminderOverlayOpen() || isCalendarEventFormOpen()) return;
            event.preventDefault();
            event.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            if (isCalendarReminderOverlayOpen() || isCalendarEventFormOpen()) return false;
            onBack();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [interactive, onBack]);

    useEffect(() => {
        prefetchRadarEventForm();
    }, []);

    const goToToday = useCallback(() => {
        const today = calendarTodayYmd();
        const d = new Date(`${today}T12:00:00`);
        patchCalendarShellSession({
            selectedDate: today,
            viewYear: d.getFullYear(),
            viewMonth: d.getMonth(),
        });
    }, []);

    const shiftMonth = useCallback((delta: -1 | 1) => {
        applyCalendarShellMonthShift(delta);
    }, []);

    const toggleFullMonth = useCallback(() => {
        const shell = peekCalendarShellSession() ?? seedCalendarShellSession();
        patchCalendarShellSession({ showFullMonth: !shell.showFullMonth });
    }, []);

    const openAdd = useCallback(() => {
        setFormVisible(true, null);
    }, [setFormVisible]);

    const openSource = useCallback((event: RadarOpenInstantDayEvent) => {
        if (!event.sourceModule || !event.sourceEntityId) {
            SmartToast.info('المصدر غير معروف');
            return;
        }
        requestCalendarOpenSource({
            sourceModule: event.sourceModule,
            sourceEntityId: event.sourceEntityId,
            sourceEventId: event.sourceEventId ?? undefined,
        });
    }, []);

    const openEvent = useCallback(
        (event: RadarOpenInstantDayEvent) => {
            if (event.bridged) {
                openSource(event);
                return;
            }
            if (liveReady) {
                requestCalendarShellEdit(event.id);
                return;
            }
            setFormVisible(true, event.id);
        },
        [liveReady, openSource, setFormVisible],
    );

    return (
        <div
            className={RADAR_PAGE}
            data-testid="smart-legal-radar"
            data-schedule-instant={interactive ? '1' : undefined}
            data-schedule-snapshot={snapshot.snapshotReady ? 'ready' : 'pending'}
            aria-label="رادار المواعيد"
            dir="rtl"
        >
            {!liveReady ? (
                <span data-testid="schedule-tab-loading" className="sr-only">
                    رادار المواعيد
                </span>
            ) : null}
            <header className={RADAR_HEADER}>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onBack();
                    }}
                    data-testid="radar-back"
                    className={RADAR_BACK_BTN}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    aria-label="رجوع"
                >
                    <HomeArrowRightIcon size={20} />
                    <span className="font-semibold text-sm">رجوع</span>
                </button>
                <h1 className={RADAR_TITLE}>رادار المواعيد</h1>
                <div className="w-10 flex items-center justify-end" aria-hidden />
            </header>

            <div className={RADAR_SCROLL}>
                <div className={RADAR_MONTH_NAV} dir="rtl" data-testid="radar-month-nav">
                    <div className="hami-radar-month-nav__month-row flex items-center gap-2 min-w-0 w-full">
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
                            <button
                                type="button"
                                data-testid="radar-prev-month"
                                onClick={() => shiftMonth(-1)}
                                aria-label="الشهر السابق"
                                className={RADAR_NAV_ICON_BTN}
                            >
                                <HomeChevronRightIcon size={18} />
                            </button>
                            <p
                                className="hami-radar-text-primary min-w-0 px-1 text-center text-[15px] sm:text-base font-bold tabular-nums truncate"
                                aria-live="polite"
                                data-testid="radar-month-label"
                            >
                                {snapshot.monthLabel}
                            </p>
                            <button
                                type="button"
                                data-testid="radar-next-month"
                                onClick={() => shiftMonth(1)}
                                aria-label="الشهر التالي"
                                className={RADAR_NAV_ICON_BTN}
                            >
                                <HomeChevronLeftIcon size={18} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={toggleFullMonth}
                            data-testid="radar-toggle-full-month"
                            aria-label={snapshot.showFullMonth ? 'إغلاق التقويم' : 'التقويم الكامل'}
                            aria-expanded={snapshot.showFullMonth}
                            aria-controls="radar-calendar-grid"
                            className={
                                snapshot.showFullMonth
                                    ? `${RADAR_BTN_GHOST_ACTIVE} hami-radar-month-nav__calendar-btn shrink-0`
                                    : RADAR_MONTH_CALENDAR_BTN
                            }
                        >
                            {snapshot.showFullMonth ? 'إغلاق' : 'الشهر'}
                        </button>
                    </div>

                    <div
                        className="hami-radar-month-nav__caption"
                        data-testid="radar-selected-day-label"
                    >
                        <div className="min-w-0 text-right">
                            <p className="hami-radar-text-primary truncate text-[13px] sm:text-sm font-bold leading-tight">
                                {snapshot.dayTitle}
                            </p>
                            {snapshot.dayMeta ? (
                                <p className="hami-radar-text-secondary truncate text-[10px] sm:text-[11px] mt-0.5">
                                    {snapshot.dayMeta}
                                </p>
                            ) : null}
                        </div>
                        {snapshot.todaySelected ? (
                            <span className="hami-radar-month-nav__today-badge shrink-0">اليوم</span>
                        ) : (
                            <button
                                type="button"
                                onClick={goToToday}
                                className="hami-radar-month-nav__today-btn shrink-0 min-h-[44px] px-3 text-[11px] font-semibold touch-manipulation"
                                data-testid="radar-today"
                            >
                                اليوم
                            </button>
                        )}
                    </div>

                    <div
                        className="hami-radar-week-strip"
                        data-testid="radar-week-strip"
                        role="group"
                        aria-label="أيام الأسبوع"
                    >
                        {snapshot.week.map((day) => (
                            <button
                                key={day.ymd}
                                type="button"
                                data-testid={`radar-week-day-${day.ymd}`}
                                aria-pressed={day.selected}
                                aria-current={day.today ? 'date' : undefined}
                                aria-label={day.ariaLabel}
                                onClick={() => focusCalendarShellDate(day.ymd)}
                                className={radarOpenInstantWeekDayClass(day)}
                                data-has-events={day.hasEvents ? '1' : undefined}
                            >
                                <span className="hami-radar-week-strip__name">{day.name}</span>
                                <span className="hami-radar-week-strip__num">{day.dayNum}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {!liveReady ? (
                    <>
                        <RadarOpenInstantMonthGrid
                            visible={snapshot.showFullMonth}
                            viewYear={snapshot.viewYear}
                            viewMonth={snapshot.viewMonth}
                            firstDayOfMonth={snapshot.firstDayOfMonth}
                            cells={snapshot.monthCells}
                            onSelectDay={focusCalendarShellDate}
                        />
                        <RadarOpenInstantDayList
                            events={snapshot.dayEvents}
                            snapshotReady={snapshot.snapshotReady}
                            onOpenEvent={openEvent}
                            onOpenSource={openSource}
                        />
                    </>
                ) : null}

                {liveBody}
            </div>

            <div className={RADAR_ADD_DOCK} data-testid="radar-day-actions">
                <button
                    type="button"
                    onClick={openAdd}
                    onPointerDown={prefetchRadarEventForm}
                    onFocus={prefetchRadarEventForm}
                    data-testid="radar-add-event"
                    className={RADAR_BTN_ADD}
                    aria-label={`إضافة موعد ليوم ${snapshot.dayTitle}`}
                >
                    <HomePlusIcon size={16} aria-hidden />
                    إضافة موعد
                </button>
            </div>

            <RadarOpenInstantAddHost
                userId={cacheUserId}
                selectedDate={snapshot.selectedDate}
                show={formOpen}
                editingEventId={editingEventId}
                onClose={() => setFormVisible(false)}
            />
        </div>
    );
});
