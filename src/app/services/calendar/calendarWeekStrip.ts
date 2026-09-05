import { formatDateToLocalYmd } from '@/app/utils/localYmd';

/** أيام الأسبوع (أحد→سبت) التي يقع فيها التاريخ المحدد */
export function buildCalendarWeekStrip(selectedDate: string): string[] {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return [];
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
        const x = new Date(start);
        x.setDate(start.getDate() + i);
        return formatDateToLocalYmd(x);
    });
}

export function formatCalendarSelectedDayTitle(selectedDate: string, fallback = selectedDate): string {
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

export function formatCalendarEventTimeRange(time?: string | null, endTime?: string | null): string | null {
    const start = String(time ?? '').trim();
    if (!start) return null;
    const end = String(endTime ?? '').trim();
    if (end && end !== start) return `${start}–${end}`;
    return start;
}

export function formatCalendarSelectedDayCaption(selectedDate: string): { title: string; meta: string } {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
        return { title: selectedDate, meta: '' };
    }
    try {
        return {
            title: formatCalendarSelectedDayTitle(selectedDate),
            meta: new Intl.DateTimeFormat('ar-IQ', { year: 'numeric' }).format(d),
        };
    } catch {
        return { title: formatCalendarSelectedDayTitle(selectedDate), meta: '' };
    }
}
