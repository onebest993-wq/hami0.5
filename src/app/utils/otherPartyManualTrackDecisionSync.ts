import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import type { OtherPartyRequestTrackEntry } from '@/app/types/execution';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
    resolveExecutorDecisionRowContext,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { OtherPartyRequestOutcome } from '@/app/utils/otherPartyEffectiveRequestsUtils';
import { patchOtherPartyRequestTrack } from '@/app/utils/otherPartyRequestTrackUtils';

export const DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE = 'debtor_agent_creditor_mirror';

export type ManualTrackPhase =
    | 'idle'
    | 'awaiting_executor'
    | 'effective'
    | 'rejected'
    | 'alternative'
    | 'closed';

export interface ManualTrackDisplayState {
    phase: ManualTrackPhase;
    badgeOutcome: OtherPartyRequestOutcome;
    statusShort: string;
    showCreditorSubmit: boolean;
    showExecutorVerdict: boolean;
    showAppealStrip: boolean;
    showResubmit: boolean;
    decisionId: string | null;
    decisionRow: Record<string, unknown> | null;
    submittedDate?: string;
}

export function parseOtherPartyTrackPayload(
    row: Record<string, unknown>
): { otherPartyTrackOptionId?: string; source?: string } | null {
    try {
        const raw = String(row.payloadJson || '').trim();
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { otherPartyTrackOptionId?: string; source?: string };
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function matchesManualOtherPartyTrackRow(
    row: Record<string, unknown>,
    optionId: string
): boolean {
    if (String(row.requestKind || '') !== 'special_followup') return false;
    const payload = parseOtherPartyTrackPayload(row);
    if (payload?.source !== DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE) return false;
    return String(payload.otherPartyTrackOptionId || '').trim() === String(optionId || '').trim();
}

function sortManualTrackRowsNewestFirst(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return [...rows].sort((a, b) =>
        String((b as { date?: string }).date || '').localeCompare(String((a as { date?: string }).date || ''))
    );
}

export function listManualOtherPartyTrackDecisions(
    decisions: Record<string, unknown>[],
    optionId: string
): Record<string, unknown>[] {
    return sortManualTrackRowsNewestFirst(decisions.filter((row) => matchesManualOtherPartyTrackRow(row, optionId)));
}

export function findPendingManualOtherPartyTrackDecision(
    decisions: Record<string, unknown>[],
    optionId: string
): Record<string, unknown> | null {
    for (const row of listManualOtherPartyTrackDecisions(decisions, optionId)) {
        if ((row as { requestCycleSuperseded?: boolean }).requestCycleSuperseded === true) continue;
        const raw = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
        if (raw === 'pending' || raw === '') return row;
    }
    return null;
}

function findLinkedDecisionRow(
    decisions: Record<string, unknown>[],
    track: OtherPartyRequestTrackEntry | undefined,
    executionId?: string
): Record<string, unknown> | null {
    const linkedId = String(track?.decisionId || '').trim();
    if (!linkedId) return null;
    const fromList =
        decisions.find((row) => String((row as { id?: string }).id || '').trim() === linkedId) ?? null;
    if (fromList) return fromList;
    return resolveExecutorDecisionRowContext(executionId, linkedId)?.row ?? null;
}

function isDecisionRowPending(row: Record<string, unknown> | null): boolean {
    if (!row) return false;
    const raw = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
    return raw === 'pending' || raw === '';
}

/**
 * بوابة العرض — يدوية بالكامل:
 * موافق/رفض لا يظهران إلا بعد تسجيل «تقدّم الدائن» (executorOutcome=submitted + decisionId).
 * بطاقات قديمة معلّقة في التخزين لا تفتح الواجهة وحدها.
 */
export function resolveManualTrackDisplayState(
    decisions: Record<string, unknown>[],
    track: OtherPartyRequestTrackEntry | undefined,
    _optionId: string,
    executionId?: string
): ManualTrackDisplayState {
    const outcome = track?.executorOutcome ?? 'none';
    const decisionId = String(track?.decisionId || '').trim() || null;
    const row = findLinkedDecisionRow(decisions, track, executionId);
    const submittedDate = track?.submittedDate || String(row?.date || '').trim() || undefined;

    const showExecutorVerdict = outcome === 'submitted' && Boolean(decisionId);

    if (outcome === 'none' || !track) {
        return {
            phase: 'idle',
            badgeOutcome: 'available',
            statusShort: 'متاح',
            showCreditorSubmit: true,
            showExecutorVerdict: false,
            showAppealStrip: false,
            showResubmit: false,
            decisionId: null,
            decisionRow: null,
            submittedDate,
        };
    }

    if (outcome === 'submitted' && !decisionId) {
        return {
            phase: 'idle',
            badgeOutcome: 'available',
            statusShort: 'متاح',
            showCreditorSubmit: true,
            showExecutorVerdict: false,
            showAppealStrip: false,
            showResubmit: false,
            decisionId: null,
            decisionRow: null,
            submittedDate,
        };
    }

    if (showExecutorVerdict) {
        return {
            phase: 'awaiting_executor',
            badgeOutcome: 'pending',
            statusShort: 'قيد البت',
            showCreditorSubmit: false,
            showExecutorVerdict: true,
            showAppealStrip: false,
            showResubmit: false,
            decisionId,
            decisionRow: row,
            submittedDate,
        };
    }

    if (outcome === 'approved') {
        if (row && isExecutorRequestAppealCycleSupersededFromRecord(row, decisions)) {
            return {
                phase: 'closed',
                badgeOutcome: 'available',
                statusShort: 'غير نافذ',
                showCreditorSubmit: true,
                showExecutorVerdict: false,
                showAppealStrip: false,
                showResubmit: false,
                decisionId: null,
                decisionRow: row,
                submittedDate,
            };
        }
        return {
            phase: 'effective',
            badgeOutcome: 'effective',
            statusShort: 'نافذ',
            showCreditorSubmit: false,
            showExecutorVerdict: false,
            showAppealStrip: true,
            showResubmit: false,
            decisionId,
            decisionRow: row,
            submittedDate,
        };
    }

    if (outcome === 'rejected') {
        return {
            phase: 'rejected',
            badgeOutcome: 'rejected',
            statusShort: 'مرفوض',
            showCreditorSubmit: false,
            showExecutorVerdict: false,
            showAppealStrip: false,
            showResubmit: true,
            decisionId,
            decisionRow: row,
            submittedDate,
        };
    }

    if (outcome === 'alternative') {
        return {
            phase: 'alternative',
            badgeOutcome: 'alternative',
            statusShort: 'بديل',
            showCreditorSubmit: false,
            showExecutorVerdict: false,
            showAppealStrip: false,
            showResubmit: true,
            decisionId,
            decisionRow: row,
            submittedDate,
        };
    }

    return {
        phase: 'idle',
        badgeOutcome: 'available',
        statusShort: 'متاح',
        showCreditorSubmit: true,
        showExecutorVerdict: false,
        showAppealStrip: false,
        showResubmit: false,
        decisionId: null,
        decisionRow: row,
        submittedDate,
    };
}

/** يحدّث فقط مسارات سجّلها المستخدم — لا يرفع idle إلى submitted تلقائياً */
export function syncTrackEntryFromDecision(
    track: OtherPartyRequestTrackEntry | undefined,
    decisions: Record<string, unknown>[],
    optionId: string,
    label?: string,
    executionId?: string
): OtherPartyRequestTrackEntry | null {
    if (!track?.decisionId) {
        if (track?.executorOutcome === 'submitted') return null;
        if (track && track.executorOutcome !== 'none') {
            return {
                optionId,
                label: label ?? track.label,
                executorOutcome: 'none',
                hidden: track.hidden,
                notes: track.notes,
                decisionId: undefined,
                submittedDate: undefined,
                updatedAt: track.updatedAt,
            };
        }
        return null;
    }

    const row = findLinkedDecisionRow(decisions, track, executionId);
    const now = new Date().toISOString();

    if (!row) {
        if (track.executorOutcome === 'submitted') return null;
        return {
            optionId,
            label: label ?? track.label,
            executorOutcome: 'none',
            hidden: track.hidden,
            notes: track.notes,
            updatedAt: now,
        };
    }

    if (track.executorOutcome === 'submitted') {
        if (isDecisionRowPending(row)) return null;
        if (isExecutorRowEffectivelyApproved(row) && !isExecutorRequestAppealCycleSupersededFromRecord(row, decisions)) {
            return { ...track, optionId, label: label ?? track.label, executorOutcome: 'approved', updatedAt: now };
        }
        if (isExecutorRowRejectedAndFinal(row)) {
            return { ...track, optionId, label: label ?? track.label, executorOutcome: 'rejected', updatedAt: now };
        }
        const raw = String((row as { executorOutcome?: string }).executorOutcome || '').trim();
        if (raw === 'alternative') {
            return { ...track, optionId, label: label ?? track.label, executorOutcome: 'alternative', updatedAt: now };
        }
        return null;
    }

    if (track.executorOutcome === 'approved') {
        if (isExecutorRequestAppealCycleSupersededFromRecord(row, decisions)) {
            return {
                optionId,
                label: label ?? track.label,
                executorOutcome: 'none',
                submittedDate: track.submittedDate,
                hidden: track.hidden,
                notes: track.notes,
                updatedAt: now,
            };
        }
    }

    return null;
}

export function syncAllManualTracksFromDecisions(
    tracks: OtherPartyRequestTrackEntry[],
    decisions: Record<string, unknown>[],
    optionIds: string[],
    labelsById: Map<string, string>,
    executionId?: string
): OtherPartyRequestTrackEntry[] {
    let next = tracks;
    for (const optionId of optionIds) {
        const prev = next.find((t) => String(t.optionId || '').trim() === optionId);
        const synced = syncTrackEntryFromDecision(
            prev,
            decisions,
            optionId,
            labelsById.get(optionId),
            executionId
        );
        if (!synced) continue;
        next = patchOtherPartyRequestTrack(next, optionId, synced);
    }
    return next;
}

export function readDecisionsForManualTrackSync(executionId: string | undefined): Record<string, unknown>[] {
    return readExecutorDecisionsArray(executionId);
}

/** يدمج صفوف القرارات المرتبطة بمسارات يدوية حتى لو وُجدت في مفتاح تخزين آخر */
export function readDecisionsForManualTrackSyncEnriched(
    executionId: string | undefined,
    tracks: OtherPartyRequestTrackEntry[]
): Record<string, unknown>[] {
    const base = readDecisionsForManualTrackSync(executionId);
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of base) {
        const id = String((row as { id?: string }).id || '').trim();
        if (id) byId.set(id, row);
    }
    for (const track of tracks) {
        const did = String(track.decisionId || '').trim();
        if (!did || byId.has(did)) continue;
        const ctx = resolveExecutorDecisionRowContext(executionId, did);
        if (ctx?.row) byId.set(did, ctx.row);
    }
    return [...byId.values()];
}
