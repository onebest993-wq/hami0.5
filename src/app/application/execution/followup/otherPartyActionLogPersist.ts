import type { OtherPartyActionLogEntry } from '@/app/types/execution';

export function buildOtherPartyActionLogEntry(input: {
    date: string;
    content: string;
    decisionRowId?: string;
    id?: string;
}): OtherPartyActionLogEntry {
    const date = String(input.date || '').trim();
    const content = String(input.content || '').trim();
    const id =
        String(input.id || '').trim() ||
        `opa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return {
        id,
        date,
        content,
        outcome: 'pending',
        savedAt: new Date().toISOString(),
        ...(input.decisionRowId ? { decisionRowId: input.decisionRowId } : {}),
    };
}

export function prependOtherPartyActionLog(
    existing: OtherPartyActionLogEntry[] | null | undefined,
    entry: OtherPartyActionLogEntry,
): OtherPartyActionLogEntry[] {
    const prev = Array.isArray(existing) ? existing : [];
    const withoutDup = prev.filter((row) => row.id !== entry.id);
    return [entry, ...withoutDup];
}

export function persistOtherPartyActionLogEntry(
    persistExecutionMerge: ((patch: Record<string, unknown>) => boolean | void) | undefined,
    existing: OtherPartyActionLogEntry[] | null | undefined,
    entry: OtherPartyActionLogEntry,
): boolean {
    if (typeof persistExecutionMerge !== 'function') return false;
    const merged = prependOtherPartyActionLog(existing, entry);
    const ok = persistExecutionMerge({ other_party_actions_log: merged });
    return ok !== false;
}
