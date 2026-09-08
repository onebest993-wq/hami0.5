import { debug } from '@/app/utils/debug';
import {
    reportForumOpenToSentry,
    type ForumPerfReportContext,
} from '@/app/services/forum/forumSentryReporting';

const MARK_PREFIX = 'hami:forum:';

type ForumPerfPhase = 'open-request' | 'first-paint' | 'interactive' | 'chunk-ready';

export type { ForumPerfReportContext };

export function markForumPerfPhase(phase: ForumPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearForumPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'first-paint', 'interactive', 'chunk-ready'] as const) {
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

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان أو كان الوقت غير موجب) */
export function getForumOpenToInteractiveMs(): number | null {
    if (
        typeof performance === 'undefined' ||
        typeof performance.getEntriesByName !== 'function'
    ) {
        return null;
    }
    const open = latestPerfMark(`${MARK_PREFIX}open-request`);
    const interactive = latestPerfMark(`${MARK_PREFIX}interactive`);
    if (!open || !interactive) return null;
    const delta = interactive.startTime - open.startTime;
    if (!Number.isFinite(delta) || delta <= 0) return null;
    return Math.round(delta);
}

/** DEV: log — PROD (مع DSN): Sentry breadcrumb + metric */
export function reportForumPerf(context: ForumPerfReportContext = {}): void {
    const ms = getForumOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[ForumPerf] open→interactive', ms, 'ms', context);
    }
    reportForumOpenToSentry(ms, context);
}
