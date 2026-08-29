import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { MONTHS } from './radarCalendarLabels';

export function todayYmd(): string {
    return getLocalTodayYmd();
}

export function isToday(dateStr: string): boolean {
    return dateStr === todayYmd();
}

/** يوم سابق — للعرض الشفاف دون الحذف */
export function isPastDay(dateStr: string): boolean {
    if (!dateStr || dateStr.length < 10) return false;
    return dateStr < todayYmd();
}

export function monthGridMetrics(viewYear: number, viewMonth: number): {
    daysInMonth: number;
    firstDayOfMonth: number;
} {
    return {
        daysInMonth: new Date(viewYear, viewMonth + 1, 0).getDate(),
        firstDayOfMonth: new Date(viewYear, viewMonth, 1).getDay(),
    };
}

export function shiftRadarMonth(
    viewYear: number,
    viewMonth: number,
    delta: -1 | 1,
): { year: number; month: number } {
    const next = viewMonth + delta;
    if (next < 0) return { year: viewYear - 1, month: 11 };
    if (next > 11) return { year: viewYear + 1, month: 0 };
    return { year: viewYear, month: next };
}

export function clampYmdToMonth(year: number, monthIndex: number, preferredDay: number): string {
    const { daysInMonth } = monthGridMetrics(year, monthIndex);
    const day = Math.min(Math.max(1, preferredDay), daysInMonth);
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** يُبقي اليوم المحدد داخل الشهر المعروض حتى لا ينفصل شريط الأسبوع عن شريط الشهر */
export function selectedDateAfterMonthShift(
    selectedDate: string,
    viewYear: number,
    viewMonth: number,
    delta: -1 | 1,
): { year: number; month: number; selectedDate: string } {
    const { year, month } = shiftRadarMonth(viewYear, viewMonth, delta);
    const parsed = Number.parseInt(selectedDate.slice(8, 10), 10);
    const preferredDay = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    return { year, month, selectedDate: clampYmdToMonth(year, month, preferredDay) };
}

export function formatRadarSelectedDayTitle(selectedDate: string, fallback = selectedDate): string {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return fallback;
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(d);
    } catch {
        return fallback;
    }
}

export function formatRadarSelectedDayCaption(selectedDate: string): { title: string; meta: string } {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
        return { title: selectedDate, meta: '' };
    }
    try {
        return {
            title: formatRadarSelectedDayTitle(selectedDate),
            meta: new Intl.DateTimeFormat('ar-IQ', { year: 'numeric' }).format(d),
        };
    } catch {
        return { title: formatRadarSelectedDayTitle(selectedDate), meta: '' };
    }
}

function toYmdParts(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** أيام الأسبوع (أحد→سبت) التي يقع فيها التاريخ المحدد */
export function buildWeekStrip(selectedDate: string): string[] {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return [];
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
        const x = new Date(start);
        x.setDate(start.getDate() + i);
        return toYmdParts(x);
    });
}

/** تسمية عربية لخلية يوم التقويم — قارئ الشاشة فقط */
export function buildCalendarDayAriaLabel(
    day: number,
    viewMonth: number,
    viewYear: number,
    eventCount: number,
    isTodayCell: boolean,
): string {
    const parts = [`${day} ${MONTHS[viewMonth]} ${viewYear}`];
    if (isTodayCell) parts.push('اليوم');
    if (eventCount > 0) {
        parts.push(`${eventCount} ${eventCount === 1 ? 'موعد' : 'مواعيد'}`);
    }
    return parts.join('، ');
}

export function buildCalendarGridAriaLabel(viewMonth: number, viewYear: number): string {
    return `تقويم ${MONTHS[viewMonth]} ${viewYear}`;
}

export function timeValue(t?: string): number {
    if (!t) return 9999;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 9999;
    return h * 60 + m;
}
