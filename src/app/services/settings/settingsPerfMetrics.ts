import { debug } from '@/app/utils/debug';
import {
    reportSettingsOpenToSentry,
    type SettingsPerfReportContext,
} from '@/app/services/settings/settingsSentryReporting';

const MARK_PREFIX = 'hami:settings:';

type SettingsPerfPhase = 'open-request' | 'chunk-ready' | 'first-paint' | 'interactive';

export function markSettingsPerfPhase(phase: SettingsPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearSettingsPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of ['open-request', 'chunk-ready', 'first-paint', 'interactive'] as const) {
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

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getSettingsOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestPerfMark(`${MARK_PREFIX}open-request`);
    const interactive = latestPerfMark(`${MARK_PREFIX}interactive`);
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

/** DEV: log — PROD (مع DSN): Sentry breadcrumb + metric */
export function reportSettingsPerf(context: SettingsPerfReportContext = {}): void {
    const ms = getSettingsOpenToInteractiveMs();
    if (ms == null) return;
    if (import.meta.env.DEV) {
        debug.log('[SettingsPerf] open→interactive', ms, 'ms', context);
    }
    reportSettingsOpenToSentry(ms, context);
}
