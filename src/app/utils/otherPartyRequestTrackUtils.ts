import type {
    OtherPartyActionLogEntry,
    OtherPartyRequestTrackEntry,
    OtherPartyTrackedExecutorOutcome,
} from '@/app/types/execution';
import type { OtherPartyRequestBadge, OtherPartyRequestOutcome } from './otherPartyEffectiveRequestsUtils';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export function readOtherPartyRequestTracks(
    executionData: { other_party_request_tracks?: OtherPartyRequestTrackEntry[] | null } | null | undefined
): OtherPartyRequestTrackEntry[] {
    return [...(executionData?.other_party_request_tracks ?? [])];
}

function trackLogicalSnapshot(track: OtherPartyRequestTrackEntry) {
    return {
        optionId: String(track.optionId || '').trim(),
        label: track.label ?? null,
        submittedDate: track.submittedDate ?? null,
        executorOutcome: track.executorOutcome ?? 'none',
        hidden: Boolean(track.hidden),
        notes: track.notes ?? null,
        decisionId: track.decisionId ?? null,
    };
}

export function tracksLogicalEqual(
    a: OtherPartyRequestTrackEntry[],
    b: OtherPartyRequestTrackEntry[]
): boolean {
    if (a.length !== b.length) return false;
    const norm = (rows: OtherPartyRequestTrackEntry[]) =>
        [...rows]
            .map(trackLogicalSnapshot)
            .sort((x, y) => x.optionId.localeCompare(y.optionId));
    return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

export function tracksLogicalSignature(tracks: OtherPartyRequestTrackEntry[]): string {
    const norm = [...tracks]
        .map(trackLogicalSnapshot)
        .sort((x, y) => x.optionId.localeCompare(y.optionId));
    return JSON.stringify(norm);
}

const TRACK_OUTCOME_RANK: Record<OtherPartyTrackedExecutorOutcome, number> = {
    none: 0,
    submitted: 1,
    pending: 1,
    rejected: 2,
    alternative: 2,
    approved: 2,
};

function trackOutcomeRank(outcome: OtherPartyTrackedExecutorOutcome | undefined): number {
    return TRACK_OUTCOME_RANK[outcome ?? 'none'] ?? 0;
}

/** لا يُستبدَل مسار متقدّم محلياً (موافقة/رفض) بمسار submitted قديم من ملف التنفيذ */
export function mergeExternalTracksPreferLocalAdvance(
    local: OtherPartyRequestTrackEntry[],
    external: OtherPartyRequestTrackEntry[]
): OtherPartyRequestTrackEntry[] {
    const extById = trackMapByOptionId(external);
    const locById = trackMapByOptionId(local);
    const allIds = new Set([...extById.keys(), ...locById.keys()]);
    const next: OtherPartyRequestTrackEntry[] = [];
    for (const optionId of allIds) {
        const loc = locById.get(optionId);
        const ext = extById.get(optionId);
        if (loc && ext) {
            next.push(
                trackOutcomeRank(loc.executorOutcome) > trackOutcomeRank(ext.executorOutcome)
                    ? loc
                    : ext
            );
        } else {
            const row = loc ?? ext;
            if (row) next.push(row);
        }
    }
    return next;
}

export function trackMapByOptionId(
    tracks: OtherPartyRequestTrackEntry[]
): Map<string, OtherPartyRequestTrackEntry> {
    const map = new Map<string, OtherPartyRequestTrackEntry>();
    for (const t of tracks) {
        const id = String(t.optionId || '').trim();
        if (id) map.set(id, t);
    }
    return map;
}

/** إزالة تتبّع يدوي — يعيد الطلب لحالة «لم يُسجَّل تقدّم» */
export function removeOtherPartyRequestTrack(
    tracks: OtherPartyRequestTrackEntry[],
    optionId: string
): OtherPartyRequestTrackEntry[] {
    const id = String(optionId || '').trim();
    if (!id) return tracks;
    return tracks.filter((t) => String(t.optionId || '').trim() !== id);
}

export function patchOtherPartyRequestTrack(
    tracks: OtherPartyRequestTrackEntry[],
    optionId: string,
    patch: Partial<OtherPartyRequestTrackEntry>
): OtherPartyRequestTrackEntry[] {
    const id = String(optionId || '').trim();
    if (!id) return tracks;
    const now = new Date().toISOString();
    const idx = tracks.findIndex((t) => String(t.optionId || '').trim() === id);
    const prev = idx >= 0 ? tracks[idx]! : null;
    const next: OtherPartyRequestTrackEntry = {
        optionId: id,
        label: patch.label ?? prev?.label,
        submittedDate: patch.submittedDate ?? prev?.submittedDate,
        executorOutcome: patch.executorOutcome ?? prev?.executorOutcome ?? 'none',
        hidden: patch.hidden ?? prev?.hidden ?? false,
        notes: patch.notes ?? prev?.notes,
        decisionId: patch.decisionId ?? prev?.decisionId,
        updatedAt: now,
    };
    if (idx >= 0) {
        const copy = [...tracks];
        copy[idx] = next;
        return copy;
    }
    return [...tracks, next];
}

export function trackedOutcomeToBadge(
    outcome: OtherPartyTrackedExecutorOutcome
): { outcome: OtherPartyRequestOutcome; statusShort: string; hasRequest: boolean } {
    switch (outcome) {
        case 'submitted':
        case 'pending':
            return { outcome: 'pending', statusShort: 'قيد البت', hasRequest: true };
        case 'approved':
            return { outcome: 'effective', statusShort: 'نافذ', hasRequest: true };
        case 'rejected':
            return { outcome: 'rejected', statusShort: 'مرفوض', hasRequest: true };
        case 'alternative':
            return { outcome: 'alternative', statusShort: 'بديل', hasRequest: true };
        default:
            return { outcome: 'available', statusShort: 'متاح', hasRequest: false };
    }
}

export function mergeBadgeWithManualTrack(
    badge: OtherPartyRequestBadge,
    track: OtherPartyRequestTrackEntry | undefined
): OtherPartyRequestBadge {
    const raw = track?.executorOutcome ?? 'none';
    if (raw === 'none') {
        return {
            ...badge,
            outcome: 'available',
            statusShort: 'متاح',
            hasRequest: false,
            decisionId: null,
        };
    }
    const mapped = trackedOutcomeToBadge(raw);
    return {
        ...badge,
        ...mapped,
        decisionId: null,
    };
}

export function resolveManualTrackTabBadge(
    tracks: OtherPartyRequestTrackEntry[]
): { label: string; tone: 'amber' | 'emerald' | 'rose' | 'violet' | 'slate' } | null {
    const active = tracks.filter(
        (t) => !t.hidden && t.executorOutcome && t.executorOutcome !== 'none'
    );
    if (active.length === 0) return null;
    if (active.some((t) => t.executorOutcome === 'pending' || t.executorOutcome === 'submitted')) {
        return { label: 'قيد البت', tone: 'amber' };
    }
    if (active.some((t) => t.executorOutcome === 'rejected')) {
        return { label: 'مرفوض', tone: 'rose' };
    }
    if (active.some((t) => t.executorOutcome === 'alternative')) {
        return { label: 'بديل', tone: 'violet' };
    }
    if (active.every((t) => t.executorOutcome === 'approved')) {
        return { label: 'نافذ', tone: 'emerald' };
    }
    return { label: 'مختلط', tone: 'slate' };
}

/** عند اعتماد قرار المنفذ — إضافة سجل مضيء في السجل العام */
export function appendEffectiveTrackToActionLog(
    entries: OtherPartyActionLogEntry[],
    badge: OtherPartyRequestBadge,
    track: OtherPartyRequestTrackEntry
): OtherPartyActionLogEntry[] {
    const logId = `opa-track-${badge.id}`;
    if (entries.some((e) => e.id === logId)) return entries;
    const row: OtherPartyActionLogEntry = {
        id: logId,
        date: track.submittedDate || getLocalTodayYmd(),
        content: `${badge.label} — قرار منفذ العدل: نافذ`,
        outcome: 'approved',
        decisionNote: track.notes,
        savedAt: new Date().toISOString(),
    };
    return [row, ...entries];
}

export const EXECUTOR_OUTCOME_OPTIONS: Array<{
    value: OtherPartyTrackedExecutorOutcome;
    label: string;
    short: string;
}> = [
    { value: 'pending', label: 'قيد البت', short: 'قيد البت' },
    { value: 'approved', label: 'موافقة — نافذ', short: 'نافذ' },
    { value: 'rejected', label: 'رفض', short: 'مرفوض' },
    { value: 'alternative', label: 'قرار بديل', short: 'بديل' },
];
