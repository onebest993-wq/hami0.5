import type {
    AppendPendingSeizureDecisionLiteInput,
    ExecutionDecisionRowLite,
} from './executionDashboardDecisionStorageLiteCore';
import {
    createExecutionDecisionId,
    matchesSeizureRow,
    normalizeExecutionStorageId,
} from './executionDashboardDecisionStorageLiteCore';
import {
    listDecisionCandidateKeys,
    readDecisionRowsByKey,
    resolveActiveDecisionStorageKey,
} from './executionDashboardDecisionStorageLiteReadStore';
import {
    dispatchExecutionDecisionsReload,
    writeDecisionRowsByKey,
} from './executionDashboardDecisionStorageLiteWriteStore';

export function patchExecutionDecisionRowLite(
    executionId: string | undefined,
    decisionId: string,
    patch: ExecutionDecisionRowLite,
): boolean {
    const exId = normalizeExecutionStorageId(executionId);
    const did = String(decisionId || '').trim();
    if (!exId || exId === 'default' || exId === 'undefined' || !did) return false;

    let touched = false;
    for (const key of listDecisionCandidateKeys(exId)) {
        const rows = readDecisionRowsByKey(key);
        if (!rows.length) continue;
        let keyTouched = false;
        const nextRows = rows.map((row) => {
            if (String(row.id || '').trim() !== did) return row;
            keyTouched = true;
            return { ...row, ...patch };
        });
        if (!keyTouched) continue;
        writeDecisionRowsByKey(key, nextRows);
        touched = true;
    }

    if (touched) dispatchExecutionDecisionsReload();
    return touched;
}

export function appendPendingSeizureDecisionLite(
    input: AppendPendingSeizureDecisionLiteInput,
): string | null {
    const exId = normalizeExecutionStorageId(input.executionId);
    if (!exId || exId === 'default' || exId === 'undefined') return null;

    const allRows = listDecisionCandidateKeys(exId).flatMap(readDecisionRowsByKey);
    const hasPendingDuplicate = allRows.some((row) => {
        if (!matchesSeizureRow(row, input)) return false;
        const outcome = String(row.executorOutcome || 'pending').trim();
        return !outcome || outcome === 'pending';
    });
    if (hasPendingDuplicate) return null;

    const storageKey = resolveActiveDecisionStorageKey(exId);
    const currentRows = readDecisionRowsByKey(storageKey);
    const nowIso = new Date().toISOString();
    const nextRows = currentRows.map((row) =>
        matchesSeizureRow(row, input) && !String(row.requestCycleSuperseded || '').trim()
            ? {
                  ...row,
                  requestCycleSuperseded: true,
                  requestCycleSupersededAt: nowIso,
              }
            : row,
    );

    const decisionId = createExecutionDecisionId('seizure_req');
    nextRows.unshift({
        id: decisionId,
        title: input.requestTitle,
        body: input.requestBody,
        date: nowIso.slice(0, 10),
        appealStatus: 'pending',
        executorOutcome: 'pending',
        requestKind: 'seizure',
        appealRequestOrigin: 'creditor_side',
        status: 'pending',
        appealPhase: null,
        ...(input.seizureSubtype ? { seizureSubtype: input.seizureSubtype } : {}),
        ...(input.seizureTarget ? { seizureTarget: input.seizureTarget } : {}),
    });

    writeDecisionRowsByKey(storageKey, nextRows);
    dispatchExecutionDecisionsReload();
    return decisionId;
}
