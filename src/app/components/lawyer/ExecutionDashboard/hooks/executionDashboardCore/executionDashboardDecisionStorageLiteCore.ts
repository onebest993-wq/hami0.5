import {
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeyPrimitives';

export const EXECUTION_DECISIONS_RELOAD_EVENT = 'hami-decisions-reload';

export type ExecutionDecisionRowLite = Record<string, unknown>;

export type AppendPendingSeizureDecisionLiteInput = {
    executionId: string | undefined;
    requestTitle: string;
    requestBody: string;
    seizureSubtype?: string;
    seizureTarget?: string;
};

export function decisionsNamespacePrefix(executionId: string): string {
    return `${executionStorageKey(executionId)}_decisions_ns_`;
}

export function decisionsNamespaceIndexKey(executionId: string): string {
    return `${executionStorageKey(executionId)}_decisions_ns_index`;
}

export function parseStoredDecisionRows(raw: string | null): ExecutionDecisionRowLite[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as ExecutionDecisionRowLite[]) : [];
    } catch {
        return [];
    }
}

export function createExecutionDecisionId(prefix: string): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function readSeizureTarget(row: ExecutionDecisionRowLite): string {
    const target = String(row.seizureTarget || '').trim();
    return target || 'debtor';
}

export function matchesSeizureRow(
    row: ExecutionDecisionRowLite,
    input: Pick<AppendPendingSeizureDecisionLiteInput, 'requestTitle' | 'seizureSubtype' | 'seizureTarget'>,
): boolean {
    if (String(row.requestKind || '') !== 'seizure') return false;
    if (readSeizureTarget(row) !== String(input.seizureTarget || 'debtor').trim()) return false;

    const rowSubtype = String(row.seizureSubtype || '').trim();
    const inputSubtype = String(input.seizureSubtype || '').trim();
    if (inputSubtype) {
        return rowSubtype === inputSubtype;
    }

    return String(row.title || '').trim() === String(input.requestTitle || '').trim();
}

export { normalizeExecutionStorageId };
