import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeyPrimitives';
import { patchExecutionDecisionRowLite } from './executionDashboardDecisionStorageLiteWrite';

export function patchExecutionDecisionSavedAt(
    executionId: string | undefined,
    decisionId: string,
    savedAtIso: string,
): void {
    const exId = normalizeExecutionStorageId(executionId);
    const rowId = String(decisionId || '').trim();
    if (!exId || exId === 'default' || exId === 'undefined' || !rowId) return;

    try {
        patchExecutionDecisionRowLite(exId, rowId, {
            seizureRequestSavedAt: savedAtIso,
        });
    } catch {
        /* ignore */
    }
}
