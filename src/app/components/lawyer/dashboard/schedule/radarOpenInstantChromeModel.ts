import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    CALENDAR_EVENT_TYPE_LABELS,
    CALENDAR_MONTHS,
    CALENDAR_WEEK_DAYS,
} from '@/app/services/calendar/calendarArabicLabels';
import {
    buildCalendarWeekStrip,
    formatCalendarEventTimeRange,
    formatCalendarSelectedDayCaption,
} from '@/app/services/calendar/calendarWeekStrip';
import {
    getCachedCalendarEvents,
    hasCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    buildCalendarDayAriaLabel,
    calendarEventTimeValue,
    calendarMonthGridMetrics,
    isCalendarPastDay,
    isCalendarToday,
} from '@/app/services/calendar/calendarMonthMath';
import { describeLegalDeadlineForCalendarCard } from '@/app/services/calendar/legalDeadlineEngine';
import { calendarModuleVisual } from '@/app/services/calendarModuleVisuals';
import type { CalendarShellSession } from '@/app/services/calendar/calendarShellSession';

/** نفس تسميات الرادار — بلا استيراد SmartLegalRadar حتى لا يدخل جذع MainView */
export const RADAR_OPEN_INSTANT_WEEK_DAYS = CALENDAR_WEEK_DAYS;
export const RADAR_OPEN_INSTANT_MONTHS = CALENDAR_MONTHS;

export type RadarOpenInstantWeekDay = {
    ymd: string;
    name: string;
    dayNum: number;
    selected: boolean;
    muted: boolean;
    hasEvents: boolean;
    today: boolean;
    ariaLabel: string;
};

export type RadarOpenInstantMonthCell = {
    day: number;
    ymd: string;
    selected: boolean;
    today: boolean;
    past: boolean;
    eventCount: number;
    ariaLabel: string;
};

export type RadarOpenInstantDayEvent = {
    id: string;
    title: string;
    timeLabel: string | null;
    kindLabel: string;
    bridged: boolean;
    sourceLabel: string | null;
    countdownLabel: string | null;
    sourceModule: string | null;
    sourceEntityId: string | null;
    sourceEventId: string | null;
};

export type RadarOpenInstantSnapshot = {
    selectedDate: string;
    viewMonth: number;
    viewYear: number;
    showFullMonth: boolean;
    todayYmd: string;
    monthLabel: string;
    dayTitle: string;
    dayMeta: string;
    todaySelected: boolean;
    week: RadarOpenInstantWeekDay[];
    monthCells: RadarOpenInstantMonthCell[];
    firstDayOfMonth: number;
    dayEvents: RadarOpenInstantDayEvent[];
    /** لقطة ذاكرة مؤكدة (حتى لو فارغة) — لا جملة «لا توجد مواعيد» قبلها */
    snapshotReady: boolean;
};

function isChromeBridgedEvent(event: CalendarEvent): boolean {
    const mod = event.sourceModule;
    return Boolean(mod && mod !== 'manual' && event.sourceEntityId && event.sourceEventId);
}

function chromeShowsLegalCountdown(event: CalendarEvent): boolean {
    const title = String(event.title ?? '');
    const mod = event.sourceModule;
    if (mod === 'lawsuit' || mod === 'execution' || mod === 'criminal' || mod === 'urgent') {
        return event.type === 'deadline' || /مهلة|طعن|تمييز|استئناف|اعتراض|انتهاء|مستعجل/i.test(title);
    }
    if (isChromeBridgedEvent(event)) return false;
    return event.type === 'deadline' || /مهلة|طعن|تمييز|استئناف|اعتراض/i.test(title);
}

function chromeCountdownLabel(event: CalendarEvent, asOf: string): string | null {
    if (!chromeShowsLegalCountdown(event)) return null;
    const ymd = eventYmd(event);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    const legal = describeLegalDeadlineForCalendarCard({
        expirationYmd: ymd,
        decisionSource: event.title,
        asOf,
    });
    return legal.remainingLegalWorkingDays <= 0
        ? 'انتهت'
        : `${legal.remainingLegalWorkingDays}ي عمل`;
}

function chromeSourceLabel(event: CalendarEvent): string | null {
    if (!isChromeBridgedEvent(event) || !event.sourceModule) return null;
    return calendarModuleVisual(event.sourceModule).label;
}

function cachedEventsForUser(userId: string | null | undefined): CalendarEvent[] {
    if (!userId) return [];
    return getCachedCalendarEvents(userId) ?? [];
}

function eventYmd(event: CalendarEvent): string {
    return typeof event.date === 'string' ? event.date.slice(0, 10) : '';
}

export function radarOpenInstantWeekDayClass(day: RadarOpenInstantWeekDay): string {
    const parts = ['hami-radar-week-strip__day'];
    if (day.selected) parts.push('hami-radar-week-strip__day--selected');
    else if (day.today) parts.push('hami-radar-week-strip__day--today');
    if (day.muted && !day.selected) parts.push('hami-radar-week-strip__day--muted');
    return parts.join(' ');
}

export function radarOpenInstantMonthCellClass(cell: RadarOpenInstantMonthCell): string {
    let cellClass =
        'relative aspect-square min-h-[44px] w-full rounded-lg flex flex-col items-center justify-center text-sm font-semibold border border-transparent touch-manipulation';
    if (cell.selected) cellClass += ' hami-radar-day-selected z-10';
    else if (cell.today) cellClass += ' hami-radar-day-today';
    else if (cell.past) cellClass += ' hami-radar-day-muted';
    else if (cell.eventCount > 0) cellClass += ' hami-radar-day-has-events';
    else cellClass += ' hami-radar-text-primary';
    return cellClass;
}

/** لقطة اليوم للفتح الفوري — شريط الشهر/الأسبوع/قائمة الكاش كما في الرادار */
export function buildRadarOpenInstantSnapshot(
    now: Date = new Date(),
    userId?: string | null,
    shell?: CalendarShellSession | null,
): RadarOpenInstantSnapshot {
    const todayYmd = getLocalTodayYmd(now);
    const selectedDate = shell?.selectedDate ?? todayYmd;
    const viewMonth = shell?.viewMonth ?? now.getMonth();
    const viewYear = shell?.viewYear ?? now.getFullYear();
    const showFullMonth = shell?.showFullMonth === true;
    const caption = formatCalendarSelectedDayCaption(selectedDate);
    const weekYmd = buildCalendarWeekStrip(selectedDate);
    const events = cachedEventsForUser(userId);
    const countByDate = new Map<string, number>();
    for (const event of events) {
        const ymd = eventYmd(event);
        if (!ymd) continue;
        countByDate.set(ymd, (countByDate.get(ymd) ?? 0) + 1);
    }
    const { daysInMonth, firstDayOfMonth } = calendarMonthGridMetrics(viewYear, viewMonth);
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    const dayEvents = events
        .filter((event) => eventYmd(event) === selectedDate)
        .sort((a, b) => calendarEventTimeValue(a.time) - calendarEventTimeValue(b.time))
        .map((event) => ({
            id: event.id,
            title: event.title.trim() || CALENDAR_EVENT_TYPE_LABELS[event.type] || 'موعد',
            timeLabel: formatCalendarEventTimeRange(event.time, event.endTime),
            kindLabel: CALENDAR_EVENT_TYPE_LABELS[event.type] || 'موعد',
            bridged: isChromeBridgedEvent(event),
            sourceLabel: chromeSourceLabel(event),
            countdownLabel: chromeCountdownLabel(event, todayYmd),
            sourceModule: event.sourceModule ?? null,
            sourceEntityId: event.sourceEntityId ?? null,
            sourceEventId: event.sourceEventId ?? null,
        }));

    return {
        selectedDate,
        viewMonth,
        viewYear,
        showFullMonth,
        todayYmd,
        monthLabel: `${RADAR_OPEN_INSTANT_MONTHS[viewMonth]} ${viewYear}`,
        dayTitle: caption.title,
        dayMeta: caption.meta,
        todaySelected: selectedDate === todayYmd,
        week: weekYmd.map((ymd, index) => {
            const dayNum = Number(ymd.slice(8, 10));
            const month = Number(ymd.slice(5, 7)) - 1;
            const year = Number(ymd.slice(0, 4));
            const hasEvents = (countByDate.get(ymd) ?? 0) > 0;
            const today = isCalendarToday(ymd, now);
            return {
                ymd,
                name: RADAR_OPEN_INSTANT_WEEK_DAYS[index] ?? '',
                dayNum,
                selected: ymd === selectedDate,
                muted: month !== viewMonth,
                hasEvents,
                today,
                ariaLabel: buildCalendarDayAriaLabel(
                    dayNum,
                    month,
                    year,
                    hasEvents ? 1 : 0,
                    today,
                ),
            };
        }),
        firstDayOfMonth,
        monthCells: Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const ymd = `${monthPrefix}-${String(day).padStart(2, '0')}`;
            const eventCount = countByDate.get(ymd) ?? 0;
            const today = isCalendarToday(ymd, now);
            return {
                day,
                ymd,
                selected: ymd === selectedDate,
                today,
                past: isCalendarPastDay(ymd, now),
                eventCount,
                ariaLabel: buildCalendarDayAriaLabel(day, viewMonth, viewYear, eventCount, today),
            };
        }),
        dayEvents,
        snapshotReady: Boolean(userId && hasCachedCalendarEvents(userId)),
    };
}
