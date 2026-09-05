import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { CALENDAR_MONTHS } from '@/app/services/calendar/calendarArabicLabels';

export function calendarTodayYmd(now: Date = new Date()): string {
    return getLocalTodayYmd(now);
}

export function isCalendarToday(dateStr: string, now: Date = new Date()): boolean {
    return dateStr === calendarTodayYmd(now);
}

/** يوم سابق — للعرض الشفاف دون الحذف */
export function isCalendarPastDay(dateStr: string, now: Date = new Date()): boolean {
    if (!dateStr || dateStr.length < 10) return false;
    return dateStr < calendarTodayYmd(now);
}

export function calendarMonthGridMetrics(
    viewYear: number,
    viewMonth: number,
): {
    daysInMonth: number;
    firstDayOfMonth: number;
} {
    return {
        daysInMonth: new Date(viewYear, viewMonth + 1, 0).getDate(),
        firstDayOfMonth: new Date(viewYear, viewMonth, 1).getDay(),
    };
}

export function shiftCalendarMonth(
    viewYear: number,
    viewMonth: number,
    delta: -1 | 1,
): { year: number; month: number } {
    const next = viewMonth + delta;
    if (next < 0) return { year: viewYear - 1, month: 11 };
    if (next > 11) return { year: viewYear + 1, month: 0 };
    return { year: viewYear, month: next };
}

export function clampYmdToCalendarMonth(
    year: number,
    monthIndex: number,
    preferredDay: number,
): string {
    const { daysInMonth } = calendarMonthGridMetrics(year, monthIndex);
    const day = Math.min(Math.max(1, preferredDay), daysInMonth);
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** يُبقي اليوم المحدد داخل الشهر المعروض حتى لا ينفصل شريط الأسبوع عن شريط الشهر */
export function selectedDateAfterCalendarMonthShift(
    selectedDate: string,
    viewYear: number,
    viewMonth: number,
    delta: -1 | 1,
): { year: number; month: number; selectedDate: string } {
    const { year, month } = shiftCalendarMonth(viewYear, viewMonth, delta);
    const parsed = Number.parseInt(selectedDate.slice(8, 10), 10);
    const preferredDay = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    return { year, month, selectedDate: clampYmdToCalendarMonth(year, month, preferredDay) };
}

export function viewFromCalendarYmd(
    ymd: string,
): { selectedDate: string; viewYear: number; viewMonth: number } | null {
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return { selectedDate: ymd, viewYear: d.getFullYear(), viewMonth: d.getMonth() };
}

/** تسمية عربية لخلية يوم التقويم — قارئ الشاشة فقط */
export function buildCalendarDayAriaLabel(
    day: number,
    viewMonth: number,
    viewYear: number,
    eventCount: number,
    isTodayCell: boolean,
): string {
    const parts = [`${day} ${CALENDAR_MONTHS[viewMonth]} ${viewYear}`];
    if (isTodayCell) parts.push('اليوم');
    if (eventCount > 0) {
        parts.push(`${eventCount} ${eventCount === 1 ? 'موعد' : 'مواعيد'}`);
    }
    return parts.join('، ');
}

export function buildCalendarGridAriaLabel(viewMonth: number, viewYear: number): string {
    return `تقويم ${CALENDAR_MONTHS[viewMonth]} ${viewYear}`;
}

export function calendarEventTimeValue(t?: string): number {
    if (!t) return 9999;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 9999;
    return h * 60 + m;
}
