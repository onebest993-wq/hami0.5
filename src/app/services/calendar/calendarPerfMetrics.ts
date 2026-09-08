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

function latestPerfMark(name: string): PerformanceEntry | null {
    const entries = performance.getEntriesByName(name, 'mark');
    return entries.length > 0 ? entries[entries.length - 1] : null;
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getCalendarOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestPerfMark(`${MARK_PREFIX}open-request`);
    const interactive = latestPerfMark(`${MARK_PREFIX}interactive`);
    if (!open || !interactive) return null;
    const delta = interactive.startTime - open.startTime;
    if (delta < 0) return null;
    return Math.round(delta);
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
