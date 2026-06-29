import { debug } from '@/app/utils/debug';
import {
    reportNotificationsOpenToSentry,
    type NotificationPerfReportContext,
} from '@/app/services/notifications/notificationSentryReporting';

const MARK_PREFIX = 'hami:notifications:';

export type NotificationPerfPhase = 'open-request' | 'chunk-ready' | 'first-paint' | 'interactive';

export type { NotificationPerfReportContext };

export function markNotificationPerfPhase(phase: NotificationPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearNotificationPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

export function getNotificationsOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportNotificationPerf(context: NotificationPerfReportContext = {}): void {
    const ms = getNotificationsOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[NotificationPerf] open→interactive', ms, 'ms', context);
    }
    reportNotificationsOpenToSentry(ms, context);
}
