import { debug } from '@/app/utils/debug';
import {
    reportSettingsOpenToSentry,
    type SettingsPerfReportContext,
} from '@/app/services/settings/settingsSentryReporting';

const MARK_PREFIX = 'hami:settings:';

export type SettingsPerfPhase = 'open-request' | 'chunk-ready' | 'first-paint' | 'interactive';

export type { SettingsPerfReportContext };

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
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

/** ms من open-request → interactive (null إذا لم تُسجَّل المرحلتان) */
export function getSettingsOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = performance.getEntriesByName(`${MARK_PREFIX}open-request`, 'mark')[0];
    const interactive = performance.getEntriesByName(`${MARK_PREFIX}interactive`, 'mark')[0];
    if (!open || !interactive) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportSettingsPerfIfDev(context?: string): void {
    if (!import.meta.env.DEV) return;
    const ms = getSettingsOpenToInteractiveMs();
    if (ms == null) return;
    debug.log(`[SettingsPerf] open→interactive ${ms}ms`, context ?? '');
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
