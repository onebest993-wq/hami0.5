import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

export function resolveOtherPartyLogDecisionRow(
    entry: OtherPartyActionLogEntry,
    decisions: Record<string, unknown>[],
): Record<string, unknown> | null {
    const did = String(entry.decisionRowId || '').trim();
    if (did) {
        const linked = decisions.find((r) => String((r as { id?: string }).id || '').trim() === did);
        if (linked) return linked;
    }
    const pending = decisions.filter((r) => {
        if (String((r as { requestKind?: string }).requestKind || '') !== 'special_followup') {
            return false;
        }
        const title = String((r as { title?: string }).title || '').trim();
        if (!/تحرك الطرف الآخر/i.test(title)) return false;
        const out = String((r as { executorOutcome?: string }).executorOutcome ?? 'pending');
        return out === 'pending' || out === '';
    });
    if (pending.length === 0) return null;
    return pending.reduce((acc, cur) => {
        const a = String(
            (acc as { resolvedAt?: string; date?: string }).resolvedAt ??
                (acc as { date?: string }).date ??
                '',
        );
        const b = String(
            (cur as { resolvedAt?: string; date?: string }).resolvedAt ??
                (cur as { date?: string }).date ??
                '',
        );
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, pending[0]!);
}

function isPendingExecutorDecisionRow(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return false;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
    return outcome === 'pending' || outcome === '';
}

export function resolveOtherPartyLogEntryOutcome(
    entry: OtherPartyActionLogEntry,
    decisions: Record<string, unknown>[],
): OtherPartyActionLogEntry['outcome'] {
    const row = resolveOtherPartyLogDecisionRow(entry, decisions);
    if (row) {
        if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
        if (isExecutorRowEffectivelyApproved(row)) return 'approved';
        if (isPendingExecutorDecisionRow(row)) return 'pending';
    }
    return entry.outcome ?? 'pending';
}

export function syncOtherPartyActionLogOutcomes(
    log: OtherPartyActionLogEntry[] | null | undefined,
    decisions: Record<string, unknown>[],
): { next: OtherPartyActionLogEntry[]; changed: boolean } {
    if (!Array.isArray(log) || log.length === 0) {
        return { next: [], changed: false };
    }
    let changed = false;
    const next = log.map((entry) => {
        const outcome = resolveOtherPartyLogEntryOutcome(entry, decisions);
        if (outcome !== entry.outcome) {
            changed = true;
            return { ...entry, outcome };
        }
        return entry;
    });
    return { next, changed };
}
