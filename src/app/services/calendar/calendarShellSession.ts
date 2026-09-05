import { calendarTodayYmd, viewFromCalendarYmd, selectedDateAfterCalendarMonthShift } from '@/app/services/calendar/calendarMonthMath';

export type CalendarShellSession = {
    selectedDate: string;
    viewYear: number;
    viewMonth: number;
    showFullMonth: boolean;
};

const listeners = new Set<() => void>();

export type CalendarShellFormIntent =
    | { kind: 'add' }
    | { kind: 'edit'; eventId: string };

let formIntent: CalendarShellFormIntent | null = null;
let session: CalendarShellSession | null = null;

function notifyCalendarShellSession(): void {
    for (const listener of listeners) listener();
}

function sameSession(a: CalendarShellSession, b: CalendarShellSession): boolean {
    return (
        a.selectedDate === b.selectedDate &&
        a.viewYear === b.viewYear &&
        a.viewMonth === b.viewMonth &&
        a.showFullMonth === b.showFullMonth
    );
}

export function peekCalendarShellSession(): CalendarShellSession | null {
    return session;
}

export function subscribeCalendarShellSession(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function patchCalendarShellSession(partial: Partial<CalendarShellSession>): CalendarShellSession {
    const base = session ?? seedCalendarShellSession();
    const next: CalendarShellSession = {
        selectedDate: partial.selectedDate ?? base.selectedDate,
        viewYear: partial.viewYear ?? base.viewYear,
        viewMonth: partial.viewMonth ?? base.viewMonth,
        showFullMonth: partial.showFullMonth ?? base.showFullMonth,
    };
    if (session && sameSession(session, next)) return session;
    session = next;
    notifyCalendarShellSession();
    return next;
}

export function seedCalendarShellSession(now: Date = new Date()): CalendarShellSession {
    if (session) return session;
    const today = calendarTodayYmd(now);
    const fromYmd = viewFromCalendarYmd(today);
    session = {
        selectedDate: today,
        viewYear: fromYmd?.viewYear ?? now.getFullYear(),
        viewMonth: fromYmd?.viewMonth ?? now.getMonth(),
        showFullMonth: false,
    };
    return session;
}

export function applyCalendarShellMonthShift(delta: -1 | 1): CalendarShellSession {
    const shell = peekCalendarShellSession() ?? seedCalendarShellSession();
    const next = selectedDateAfterCalendarMonthShift(
        shell.selectedDate,
        shell.viewYear,
        shell.viewMonth,
        delta,
    );
    return patchCalendarShellSession({
        viewYear: next.year,
        viewMonth: next.month,
        selectedDate: next.selectedDate,
    });
}

export function requestCalendarShellAdd(): void {
    formIntent = { kind: 'add' };
    notifyCalendarShellSession();
}

export function requestCalendarShellEdit(eventId: string): void {
    const id = eventId.trim();
    if (!id) return;
    formIntent = { kind: 'edit', eventId: id };
    notifyCalendarShellSession();
}

export function consumeCalendarShellFormIntent(): CalendarShellFormIntent | null {
    const next = formIntent;
    formIntent = null;
    return next;
}

export function focusCalendarShellDate(ymd: string): CalendarShellSession {
    const view = viewFromCalendarYmd(ymd);
    if (!view) return seedCalendarShellSession();
    return patchCalendarShellSession(view);
}

/** للاختبارات */
export function resetCalendarShellSessionForTests(): void {
    session = null;
    formIntent = null;
    listeners.clear();
}
