import { debug } from '@/app/utils/debug';
import {
    reportHomeHubOpenToSentry,
    type HomeHubSentryReportContext,
} from '@/app/services/alerts/homeHubSentryReporting';

const MARK_PREFIX = 'hami:home-hub:';

type HomeHubPerfPhase = 'open-request' | 'first-paint' | 'interactive';

type HomeHubPerfReportContext = {
    userId?: string;
    alertsTabCount?: number;
    pinsCount?: number;
    hadRadarCache?: boolean;
    hadAlertsCache?: boolean;
};

let homeHubPerfReported = false;

function resetHomeHubPerfReportSession(): void {
    homeHubPerfReported = false;
}

export function markHomeHubPerfPhase(phase: HomeHubPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearHomeHubPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
    resetHomeHubPerfReportSession();
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getHomeHubOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    const ms = interactive.startTime - open.startTime;
    if (!Number.isFinite(ms) || ms < 0) return null;
    return Math.round(ms);
}

export function reportHomeHubPerf(context: HomeHubPerfReportContext = {}): void {
    if (homeHubPerfReported) return;
    const ms = getHomeHubOpenToInteractiveMs();
    if (ms == null) return;
    homeHubPerfReported = true;
    if (import.meta.env.DEV) {
        const { userId: _omitUser, ...safeContext } = context;
        debug.log('[HomeHubPerf] open→interactive', ms, 'ms', safeContext);
    }
    reportHomeHubOpenToSentry(ms, context as HomeHubSentryReportContext);
}
