const EXECUTION_MARK_PREFIX = 'hami:execution:';

type ExecutionPerfPhase =
    | 'open-request'
    | 'dashboard-first-paint'
    | 'dashboard-interactive'
    | 'creation-first-reveal'
    | 'summons-dispatch-start'
    | 'summons-dispatch-done';

export function markExecutionPerfPhase(phase: ExecutionPerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${EXECUTION_MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearExecutionPerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        const phases: readonly ExecutionPerfPhase[] = [
            'open-request',
            'dashboard-first-paint',
            'dashboard-interactive',
            'creation-first-reveal',
            'summons-dispatch-start',
            'summons-dispatch-done',
        ];
        for (const phase of phases) {
            performance.clearMarks(`${EXECUTION_MARK_PREFIX}${phase}`);
        }
        performance.clearMeasures(`${EXECUTION_MARK_PREFIX}open-to-interactive`);
        performance.clearMeasures(`${EXECUTION_MARK_PREFIX}summons-delta`);
    } catch {
        /* ignore */
    }
}

/**
 * LATEST-MARK PATTERN (TR-3.1 Path 1):
 * NEVER use entries[0] (stale). ALWAYS use entries[entries.length - 1] (most recent).
 */
function latestExecutionPerfMark(name: string): PerformanceEntry | null {
    if (typeof performance === 'undefined') return null;
    const entries = performance.getEntriesByName(name, 'mark');
    return entries.length > 0 ? entries[entries.length - 1] : null;
}

/**
 * TR-3.1 Path 1: Execution Dashboard open → interactive delta.
 * NEGATIVE-DELTA NULL GUARD: if reversed time, return null not negative.
 */
export function getExecutionDashboardOpenToInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestExecutionPerfMark(`${EXECUTION_MARK_PREFIX}open-request`);
    const interactive = latestExecutionPerfMark(`${EXECUTION_MARK_PREFIX}dashboard-interactive`);
    if (!open || !interactive) return null;
    if (interactive.startTime < open.startTime) return null;
    return Math.round(interactive.startTime - open.startTime);
}

/**
 * TR-3.1 Path 1 (bonus): Execution Creation first reveal delta.
 * NEGATIVE-DELTA NULL GUARD: if reversed time, return null not negative.
 */
export function getExecutionCreationOpenToFirstRevealMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const open = latestExecutionPerfMark(`${EXECUTION_MARK_PREFIX}open-request`);
    const reveal = latestExecutionPerfMark(`${EXECUTION_MARK_PREFIX}creation-first-reveal`);
    if (!open || !reveal) return null;
    if (reveal.startTime < open.startTime) return null;
    return Math.round(reveal.startTime - open.startTime);
}

/** Summons dispatch delta. */
export function getExecutionSummonsDispatchDeltaMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const start = latestExecutionPerfMark(`${EXECUTION_MARK_PREFIX}summons-dispatch-start`);
    const done = latestExecutionPerfMark(`${EXECUTION_MARK_PREFIX}summons-dispatch-done`);
    if (!start || !done) return null;
    if (done.startTime < start.startTime) return null;
    return Math.round(done.startTime - start.startTime);
}

/** Get snapshot of latest execution perf phase names (for diagnostics). */
export function getExecutionPerfSnapshot(): Record<string, number | null> {
    return {
        dashboardOpenToInteractive: getExecutionDashboardOpenToInteractiveMs(),
        creationOpenToFirstReveal: getExecutionCreationOpenToFirstRevealMs(),
        summonsDispatchDelta: getExecutionSummonsDispatchDeltaMs(),
    };
}
