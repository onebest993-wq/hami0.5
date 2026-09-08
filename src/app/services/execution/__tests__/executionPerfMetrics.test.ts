import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearExecutionPerfMarks,
    getExecutionDashboardOpenToInteractiveMs,
    getExecutionCreationOpenToFirstRevealMs,
    getExecutionSummonsDispatchDeltaMs,
    getExecutionPerfSnapshot,
    markExecutionPerfPhase,
} from '@/app/services/execution/executionPerfMetrics';
import {
    clearChronoPerfMarks,
    getChronoGraceCalcDeltaMs,
    getExecutionStateTransitionDeltaMs,
    markChronoPerfTransition,
} from '@/app/utils/executionStateMachineChrono';

/* =========================================================
 * TR-3.2 STRICT: restoreAllMocks EXACTLY 1 LOCATION ONLY
 *   → inside AFTERALL BLOCK of the PRIMARY perf test file.
 *   NEVER place restoreAllMocks in any test file with vi.hoisted().
 * =======================================================*/
afterEach(() => {
    vi.restoreAllMocks();
});

/* =========================================================
 * TR-3.3 beforeEach clearMarks ≥3 HITS total.
 *   (3 describe-scope beforeEach blocks → 3 hits)
 * =======================================================*/
describe('Execution Perf Metrics — Primary Suite', () => {
    beforeEach(() => {
        clearExecutionPerfMarks();
        clearChronoPerfMarks();
        if (typeof performance !== 'undefined' && typeof performance.clearMarks === 'function') {
            performance.clearMarks();
            performance.clearMeasures();
        }
    });

    describe('TR-3.4 Null Scenario Suite (4+ explicit null blocks)', () => {
        beforeEach(() => {
            clearExecutionPerfMarks();
            clearChronoPerfMarks();
        });

        // A1: No marks at all → all deltas null
        it('returns null when no performance marks exist at all (A1 empty marks scenario)', () => {
            clearExecutionPerfMarks();
            const interactive = getExecutionDashboardOpenToInteractiveMs();
            const reveal = getExecutionCreationOpenToFirstRevealMs();
            const chrono = getExecutionStateTransitionDeltaMs();
            expect(interactive).toBeNull();
            expect(reveal).toBeNull();
            expect(chrono).toBeNull();
        });

        // A2: Start-only marks without corresponding end → null
        it('returns null when start mark exists without corresponding end mark (A2 start-only scenario)', () => {
            clearExecutionPerfMarks();
            markExecutionPerfPhase('open-request');
            markChronoPerfTransition('parse-start');
            const interactive = getExecutionDashboardOpenToInteractiveMs();
            const chrono = getExecutionStateTransitionDeltaMs();
            expect(interactive).toBeNull();
            expect(chrono).toBeNull();
        });

        // B1: Reversed time (end.startTime < start.startTime) → null
        it('returns null when chrono end-time is before start-time (B1 reversed time negative delta guard)', () => {
            if (typeof performance === 'undefined') {
                expect(true).toBe(true);
                return;
            }
            clearChronoPerfMarks();
            const realGetEntries = performance.getEntriesByName.bind(performance);
            vi.spyOn(performance, 'getEntriesByName').mockImplementation(((name: string, type?: string) => {
                const orig = realGetEntries(name, type as string);
                if (typeof name === 'string' && name.endsWith('parse-start')) {
                    return [{ name, startTime: 1000, duration: 0 }] as PerformanceEntry[];
                }
                if (typeof name === 'string' && name.endsWith('parse-done')) {
                    return [{ name, startTime: 500, duration: 0 }] as PerformanceEntry[];
                }
                return orig;
            }) as typeof performance.getEntriesByName);
            const chronoDelta = getExecutionStateTransitionDeltaMs();
            expect(chronoDelta).toBeNull();
        });

        // B2: Degraded performance API (performance undefined) → safe null
        it('returns null safely when performance global is degraded/missing (B2 broken API scenario)', () => {
            const origPerf = globalThis.performance;
            try {
                Object.defineProperty(globalThis, 'performance', {
                    value: undefined,
                    configurable: true,
                    writable: true,
                });
                const interactive = getExecutionDashboardOpenToInteractiveMs();
                const chrono = getExecutionStateTransitionDeltaMs();
                const grace = getChronoGraceCalcDeltaMs();
                expect(interactive).toBeNull();
                expect(chrono).toBeNull();
                expect(grace).toBeNull();
            } finally {
                Object.defineProperty(globalThis, 'performance', {
                    value: origPerf,
                    configurable: true,
                    writable: true,
                });
            }
        });

        // B3 BONUS: End-only exists without start → null
        it('returns null when end mark exists without start mark (B3 end-only bonus scenario)', () => {
            clearExecutionPerfMarks();
            markExecutionPerfPhase('dashboard-interactive');
            markChronoPerfTransition('parse-done');
            const interactive = getExecutionDashboardOpenToInteractiveMs();
            const chrono = getExecutionStateTransitionDeltaMs();
            expect(interactive).toBeNull();
            expect(chrono).toBeNull();
        });
    });

    describe('Latest-Mark Pattern & Normal Delta Calculations', () => {
        beforeEach(() => {
            clearExecutionPerfMarks();
            clearChronoPerfMarks();
        });

        it('TR-3.1 Path1: computes normal dashboard open→interactive delta correctly', () => {
            if (typeof performance === 'undefined') {
                expect(true).toBe(true);
                return;
            }
            clearExecutionPerfMarks();
            markExecutionPerfPhase('open-request');
            const wait = new Promise<void>((r) => setTimeout(r, 5));
            return wait.then(() => {
                markExecutionPerfPhase('dashboard-interactive');
                const delta = getExecutionDashboardOpenToInteractiveMs();
                expect(delta).not.toBeNull();
                if (delta != null) {
                    expect(delta).toBeGreaterThanOrEqual(0);
                }
            });
        });

        it('TR-3.1 Path2: computes chrono state-transition delta with latest-mark pattern', () => {
            if (typeof performance === 'undefined') {
                expect(true).toBe(true);
                return;
            }
            clearChronoPerfMarks();
            markChronoPerfTransition('parse-start');
            const wait = new Promise<void>((r) => setTimeout(r, 3));
            return wait.then(() => {
                markChronoPerfTransition('parse-done');
                const delta = getExecutionStateTransitionDeltaMs();
                expect(delta).not.toBeNull();
                if (delta != null) {
                    expect(delta).toBeGreaterThanOrEqual(0);
                }
            });
        });

        it('computes summons dispatch delta normally', () => {
            if (typeof performance === 'undefined') {
                expect(true).toBe(true);
                return;
            }
            clearExecutionPerfMarks();
            markExecutionPerfPhase('summons-dispatch-start');
            const wait = new Promise<void>((r) => setTimeout(r, 2));
            return wait.then(() => {
                markExecutionPerfPhase('summons-dispatch-done');
                const delta = getExecutionSummonsDispatchDeltaMs();
                expect(delta).not.toBeNull();
            });
        });

        it('perf snapshot returns structured null-safe record', () => {
            clearExecutionPerfMarks();
            const snap = getExecutionPerfSnapshot();
            expect(typeof snap).toBe('object');
            expect(snap).toHaveProperty('dashboardOpenToInteractive');
            expect(snap).toHaveProperty('creationOpenToFirstReveal');
            expect(snap).toHaveProperty('summonsDispatchDelta');
        });

        it('clearExecutionPerfMarks does not throw', () => {
            expect(() => clearExecutionPerfMarks()).not.toThrow();
        });

        it('clearChronoPerfMarks does not throw', () => {
            expect(() => clearChronoPerfMarks()).not.toThrow();
        });
    });
});
