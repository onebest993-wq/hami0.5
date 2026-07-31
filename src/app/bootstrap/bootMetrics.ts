import { debug } from '@/app/utils/debug';
import {
    DASHBOARD_INTERACTIVE_EVENT,
    getDashboardInteractiveMs,
    isDashboardInteractive,
    markDashboardInteractiveOnce,
    onDashboardInteractive,
    resetDashboardInteractiveForTests,
} from '@/app/bootstrap/dashboardInteractiveMark';

export {
    DASHBOARD_INTERACTIVE_EVENT,
    getDashboardInteractiveMs,
    isDashboardInteractive,
    markDashboardInteractiveOnce,
    onDashboardInteractive,
    resetDashboardInteractiveForTests,
};

const MARK_PREFIX = 'hami:boot:';

export type BootPhase =
    | 'start'
    | 'static-shell-visible'
    | 'overlay-removed'
    | 'app-render'
    | 'shell-visible'
    | 'dashboard-chunk-loaded'
    | 'dashboard-interactive'
    | 'first-tab-open';

export type BootTimelineRow = { phase: BootPhase; ms: number | null };

export function markBootPhase(phase: BootPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function getBootTimeline(origin: 'start' | 'navigation' = 'start'): BootTimelineRow[] {
    if (typeof performance === 'undefined') return [];

    const phases: BootPhase[] = [
        'start',
        'static-shell-visible',
        'overlay-removed',
        'app-render',
        'shell-visible',
        'dashboard-chunk-loaded',
        'dashboard-interactive',
        'first-tab-open',
    ];

    let originMs = 0;
    if (origin === 'start') {
        const startEntry = performance.getEntriesByName(`${MARK_PREFIX}start`, 'mark')[0];
        originMs = startEntry?.startTime ?? 0;
    }

    return phases.map((phase) => {
        const entry = performance.getEntriesByName(`${MARK_PREFIX}${phase}`, 'mark')[0];
        return {
            phase,
            ms:
                entry == null
                    ? null
                    : Math.round(
                          origin === 'start' ? entry.startTime - originMs : entry.startTime,
                      ),
        };
    });
}

export function getBootPhaseMs(phase: BootPhase): number | null {
    return getBootTimeline().find((row) => row.phase === phase)?.ms ?? null;
}

/** أول لحظة يصبح فيها تبويب اللوحة الأساسي ظاهراً وقابلاً للاستخدام بصرياً. */
export function getFirstTabOpenMs(): number | null {
    return getBootPhaseMs('first-tab-open');
}

/** ms بين dashboard-interactive و first-tab-open (null إذا لم تكتمل المرحلتان). */
export function getDashboardToFirstTabOpenMs(): number | null {
    const interactive = getDashboardInteractiveMs();
    const firstTabOpen = getFirstTabOpenMs();
    if (interactive == null || firstTabOpen == null) return null;
    if (firstTabOpen < interactive) return null;
    return firstTabOpen - interactive;
}

export function reportBootTimeline(): void {
    if (!import.meta.env.DEV) return;

    const rows = getBootTimeline();
    if (rows.some((r) => r.ms !== null)) {
        debug.log('[BootMetrics] timeline (ms from start)', rows);
        if (typeof window !== 'undefined') {
            (window as Window & { __hamiBootTimeline?: BootTimelineRow[] }).__hamiBootTimeline = rows;
        }
    }
}
