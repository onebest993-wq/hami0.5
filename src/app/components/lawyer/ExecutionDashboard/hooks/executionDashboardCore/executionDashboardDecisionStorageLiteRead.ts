import type { ExecutionDecisionRowLite } from './executionDashboardDecisionStorageLiteCore';
import {
    normalizeExecutionStorageId,
} from './executionDashboardDecisionStorageLiteCore';
import {
    listDecisionCandidateKeys,
    readDecisionRowsByKey,
} from './executionDashboardDecisionStorageLiteReadStore';

export function readExecutionDecisionRowsLite(
    executionId: string | undefined,
): ExecutionDecisionRowLite[] {
    const exId = normalizeExecutionStorageId(executionId);
    if (!exId || exId === 'default' || exId === 'undefined') return [];

    const byId = new Map<string, ExecutionDecisionRowLite>();
    for (const key of listDecisionCandidateKeys(exId)) {
        for (const row of readDecisionRowsByKey(key)) {
            const rowId = String(row?.id || '').trim();
            if (!rowId || byId.has(rowId)) continue;
            byId.set(rowId, row);
        }
    }
    return Array.from(byId.values());
}

export function getExecutionDecisionRowByIdLite(
    executionId: string | undefined,
    decisionId: string,
): ExecutionDecisionRowLite | null {
    const did = String(decisionId || '').trim();
    if (!did) return null;
    return (
        readExecutionDecisionRowsLite(executionId).find((row) => String(row?.id || '').trim() === did) || null
    );
}
