import { debug } from '@/app/utils/debug';
import {
    reportCalendarOpenToSentry,
    type CalendarPerfReportContext,
} from '@/app/services/calendar/calendarSentryReporting';

const MARK_PREFIX = 'hami:calendar:';

export type CalendarPerfPhase = 'open-request' | 'first-paint' | 'interactive';

export type { CalendarPerfReportContext };

export function markCalendarPerfPhase(phase: CalendarPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearCalendarPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getCalendarOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportCalendarPerfIfDev(context?: string): void {
    if (!import.meta.env.DEV) return;
    const ms = getCalendarOpenToInteractiveMs();
    if (ms == null) return;
    debug.log(`[CalendarPerf] open→interactive ${ms}ms`, context ?? '');
}

/** DEV: log — PROD (مع DSN): Sentry breadcrumb + metric */
export function reportCalendarPerf(context: CalendarPerfReportContext = {}): void {
    const ms = getCalendarOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[CalendarPerf] open→interactive', ms, 'ms', context);
    }
    reportCalendarOpenToSentry(ms, context);
}
