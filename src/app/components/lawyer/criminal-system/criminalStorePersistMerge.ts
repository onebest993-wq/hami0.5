import type { CriminalCase, TimelineEvent } from './criminalCaseModel';
import { CRIMINAL_STORAGE_PATCHED_EVENT, loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { normalizeCriminalCaseLocation } from './criminalCaseDraftFactory';
import { normalizeTrialSessions, type TrialSession } from './trialSessionsEngine';

export function mergeTimelineEventsFromPersisted(
    live: TimelineEvent[] | undefined,
    persisted: TimelineEvent[] | undefined,
): TimelineEvent[] {
    const liveList = Array.isArray(live) ? live : [];
    const persistedList = Array.isArray(persisted) ? persisted : [];
    if (!persistedList.length) return liveList;
    const byId = new Map(liveList.map((e) => [e.id, e]));
    for (const ev of persistedList) {
        const id = String(ev.id ?? '').trim();
        if (!id) continue;
        const prior = byId.get(id);
        byId.set(id, prior ? ({ ...prior, ...ev } as TimelineEvent) : ev);
    }
    const seen = new Set<string>();
    const merged: TimelineEvent[] = [];
    for (const e of liveList) {
        merged.push(byId.get(e.id) ?? e);
        seen.add(e.id);
    }
    for (const e of persistedList) {
        const id = String(e.id ?? '').trim();
        if (!id || seen.has(id)) continue;
        merged.push(byId.get(id) ?? e);
    }
    return merged;
}

export function mergeTrialSessionsFromPersisted(
    live: TrialSession[] | undefined,
    persisted: TrialSession[] | undefined,
): TrialSession[] {
    const liveList = normalizeTrialSessions(live);
    const persistedList = normalizeTrialSessions(persisted);
    if (!persistedList.length) return liveList;
    const byId = new Map(liveList.map((s) => [s.id, s]));
    for (const session of persistedList) {
        const id = String(session.id ?? '').trim();
        if (!id) continue;
        const prior = byId.get(id);
        byId.set(id, prior ? ({ ...prior, ...session } as TrialSession) : session);
    }
    return liveList.map((s) => byId.get(s.id) ?? s);
}

/** دمج حقول مزامنة التقويم فقط — دون استبدال الإضبارة الحية بنسخة قديمة من IndexedDB. */
export function mergePersistedCriminalCaseWithLive(existing: CriminalCase, raw: CriminalCase): CriminalCase {
    const persistedLocation = normalizeCriminalCaseLocation(raw.location);
    const liveLocation = existing.location;
    const nextHearingDate = String(persistedLocation.nextHearingDate ?? '').trim();
    const location =
        nextHearingDate !== String(liveLocation.nextHearingDate ?? '').trim()
            ? { ...liveLocation, nextHearingDate: persistedLocation.nextHearingDate }
            : liveLocation;
    return {
        ...existing,
        location,
        timelineEvents: mergeTimelineEventsFromPersisted(existing.timelineEvents, raw.timelineEvents),
        trials: mergeTrialSessionsFromPersisted(existing.trials, raw.trials),
    };
}

type CriminalStoreCasesSlice = {
    casesById: Record<string, CriminalCase>;
};

function mergeCriminalCasesFromPersistedStorage(
    setState: (
        partial:
            | Partial<CriminalStoreCasesSlice>
            | ((state: CriminalStoreCasesSlice) => Partial<CriminalStoreCasesSlice>),
    ) => void,
    caseId?: string,
): void {
    const rows = loadCriminalCasesRaw();
    if (!rows.length) return;
    setState((state) => {
        const next = { ...state.casesById };
        for (const raw of rows) {
            const id = String(raw.id ?? '').trim();
            if (!id) continue;
            if (caseId && id !== String(caseId)) continue;
            const existing = next[id];
            next[id] = existing
                ? mergePersistedCriminalCaseWithLive(existing, raw as CriminalCase)
                : (raw as CriminalCase);
        }
        return { casesById: next };
    });
}

export function installCriminalStorePersistMergeListener(
    setState: (
        partial:
            | Partial<CriminalStoreCasesSlice>
            | ((state: CriminalStoreCasesSlice) => Partial<CriminalStoreCasesSlice>),
    ) => void,
): void {
    if (typeof window === 'undefined') return;
    window.addEventListener(CRIMINAL_STORAGE_PATCHED_EVENT, (ev) => {
        const detail = (ev as CustomEvent<{ caseId?: string }>).detail;
        mergeCriminalCasesFromPersistedStorage(setState, detail?.caseId);
    });
}
