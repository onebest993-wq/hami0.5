import { debug } from '@/app/utils/debug';
import {
    reportForumOpenToSentry,
    type ForumPerfReportContext,
} from '@/app/services/forum/forumSentryReporting';

const MARK_PREFIX = 'hami:forum:';

export type ForumPerfPhase = 'open-request' | 'first-paint' | 'interactive';

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
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getForumOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportForumPerfIfDev(context?: string): void {
    if (!import.meta.env.DEV) return;
    const ms = getForumOpenToInteractiveMs();
    if (ms == null) return;
    debug.log(`[ForumPerf] open→interactive ${ms}ms`, context ?? '');
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
