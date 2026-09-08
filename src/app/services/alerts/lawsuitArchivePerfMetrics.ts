import { debug } from '@/app/utils/debug';

const MARK_PREFIX = 'hami:lawsuit-archive:';

export type LawsuitArchivePerfPhase =
    | 'open-request'
    | 'keys-warm-start'
    | 'keys-ready'
    | 'hydrate-done'
    | 'interactive'
    | 'zone-request'
    | 'zone-switched';

const PHASES: readonly LawsuitArchivePerfPhase[] = [
    'open-request',
    'keys-warm-start',
    'keys-ready',
    'hydrate-done',
    'interactive',
    'zone-request',
    'zone-switched',
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

function latestMarkStartTime(phase: LawsuitArchivePerfPhase): number | null {
    if (typeof performance === 'undefined') return null;
    const entries = performance.getEntriesByName(`${MARK_PREFIX}${phase}`, 'mark');
    const entry = entries.length > 0 ? entries[entries.length - 1] : null;
    if (!entry || !Number.isFinite(entry.startTime)) return null;
    return entry.startTime;
}

function markStartTime(phase: LawsuitArchivePerfPhase): number | null {
    return latestMarkStartTime(phase);
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

/** CR-7 zone-switch فرق ms من zone-request → zone-switched (CP-08/CP-09 لا يُعتمد قيمة [0] القديمة) */
export function getLawsuitZoneSwitchDeltaMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const reqEntries = performance.getEntriesByName(`${MARK_PREFIX}zone-request`, 'mark');
    const doneEntries = performance.getEntriesByName(`${MARK_PREFIX}zone-switched`, 'mark');
    const zoneReq = reqEntries.length > 0 ? reqEntries[reqEntries.length - 1] : null;
    const zoneDone = doneEntries.length > 0 ? doneEntries[doneEntries.length - 1] : null;
    if (!zoneReq || !zoneDone) return null;
    if (zoneDone.startTime < zoneReq.startTime) return null;
    const ms = zoneDone.startTime - zoneReq.startTime;
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
