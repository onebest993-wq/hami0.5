import { debug } from '@/app/utils/debug';
import {
    reportProfileOpenToSentry,
    type ProfileSentryReportContext,
} from '@/app/services/profile/profileSentryReporting';

const MARK_PREFIX = 'hami:profile:';

export type ProfilePerfPhase =
    | 'pointer-down'
    | 'open-request'
    | 'shell-revealed'
    | 'chunk-ready'
    | 'first-paint'
    | 'interactive';

export type ProfilePerfSnapshot = {
    pointerToOpenMs: number | null;
    openToShellRevealMs: number | null;
    openToFirstPaintMs: number | null;
    openToInteractiveMs: number | null;
    pointerToFirstPaintMs: number | null;
};

export type ProfilePerfReportContext = ProfileSentryReportContext;

export function markProfilePerfPhase(phase: ProfilePerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearProfilePerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of [
            'pointer-down',
            'open-request',
            'shell-revealed',
            'chunk-ready',
            'first-paint',
            'interactive',
        ] as const) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
}

function latestPerfMark(name: string): PerformanceEntry | undefined {
    const entries = performance.getEntriesByName(name, 'mark');
    return entries.length > 0 ? entries[entries.length - 1] : undefined;
}

function phaseDeltaMs(from: ProfilePerfPhase, to: ProfilePerfPhase): number | null {
    if (typeof performance === 'undefined') return null;
    const start = latestPerfMark(`${MARK_PREFIX}${from}`);
    const end = latestPerfMark(`${MARK_PREFIX}${to}`);
    if (!start || !end || end.startTime < start.startTime) return null;
    return Math.round(end.startTime - start.startTime);
}

export function getProfilePerfSnapshot(): ProfilePerfSnapshot {
    return {
        pointerToOpenMs: phaseDeltaMs('pointer-down', 'open-request'),
        openToShellRevealMs: phaseDeltaMs('open-request', 'shell-revealed'),
        openToFirstPaintMs: phaseDeltaMs('open-request', 'first-paint'),
        openToInteractiveMs: getProfileOpenToInteractiveMs(),
        pointerToFirstPaintMs: phaseDeltaMs('pointer-down', 'first-paint'),
    };
}

export function getProfileOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestPerfMark(`${MARK_PREFIX}open-request`);
    const interactive = latestPerfMark(`${MARK_PREFIX}interactive`);
    if (!open || !interactive) return null;
    if (interactive.startTime < open.startTime) return null;
    return Math.round(interactive.startTime - open.startTime);
}

export function reportProfilePerf(context: ProfilePerfReportContext = {}): void {
    const snapshot = getProfilePerfSnapshot();
    if (snapshot.openToInteractiveMs == null) return;
    if (import.meta.env.DEV) {
        debug.log('[ProfilePerf]', snapshot, context);
    }
    reportProfileOpenToSentry(snapshot.openToInteractiveMs, context);
}
