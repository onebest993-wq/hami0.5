import { debug } from '@/app/utils/debug';

const MARK_PREFIX = 'hami:lawsuit-archive:';

export type LawsuitArchivePerfPhase =
    | 'open-request'
    | 'keys-warm-start'
    | 'keys-ready'
    | 'hydrate-done'
    | 'interactive';

const PHASES: readonly LawsuitArchivePerfPhase[] = [
    'open-request',
    'keys-warm-start',
    'keys-ready',
    'hydrate-done',
    'interactive',
] as const;

let lawsuitArchivePerfReported = false;

export function markLawsuitArchivePerf(phase: LawsuitArchivePerfPhase): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${MARK_PREFIX}${phase}`);
    } catch {
        /* ignore */
    }
}

export function clearLawsuitArchivePerfMarks(): void {
    if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') return;
    try {
        for (const phase of PHASES) {
            performance.clearMarks(`${MARK_PREFIX}${phase}`);
        }
    } catch {
        /* ignore */
    }
    lawsuitArchivePerfReported = false;
}

function markStartTime(phase: LawsuitArchivePerfPhase): number | null {
    if (typeof performance === 'undefined') return null;
    const entry = performance.getEntriesByName(`${MARK_PREFIX}${phase}`, 'mark')[0];
    if (!entry || !Number.isFinite(entry.startTime)) return null;
    return entry.startTime;
}

/** فرق ms بين مرحلتين (null إن نقصت علامة) */
export function getLawsuitArchivePhaseDeltaMs(
    from: LawsuitArchivePerfPhase,
    to: LawsuitArchivePerfPhase,
): number | null {
    const a = markStartTime(from);
    const b = markStartTime(to);
    if (a == null || b == null) return null;
    const ms = b - a;
    if (!Number.isFinite(ms) || ms < 0) return null;
    return Math.round(ms);
}

export type LawsuitArchivePerfSnapshot = {
    openToKeysReadyMs: number | null;
    openToHydrateMs: number | null;
    openToInteractiveMs: number | null;
    keysWarmDurationMs: number | null;
};

export function getLawsuitArchivePerfSnapshot(): LawsuitArchivePerfSnapshot {
    return {
        openToKeysReadyMs: getLawsuitArchivePhaseDeltaMs('open-request', 'keys-ready'),
        openToHydrateMs: getLawsuitArchivePhaseDeltaMs('open-request', 'hydrate-done'),
        openToInteractiveMs: getLawsuitArchivePhaseDeltaMs('open-request', 'interactive'),
        keysWarmDurationMs: getLawsuitArchivePhaseDeltaMs('keys-warm-start', 'keys-ready'),
    };
}

/** يُستدعى مرة لكل جلسة فتح — يسجّل في DEV عبر performance marks */
export function reportLawsuitArchivePerf(): void {
    if (lawsuitArchivePerfReported) return;
    const snap = getLawsuitArchivePerfSnapshot();
    if (snap.openToInteractiveMs == null && snap.openToKeysReadyMs == null) return;
    lawsuitArchivePerfReported = true;
    if (import.meta.env.DEV) {
        debug.log('[LawsuitArchivePerf]', snap);
    }
}
