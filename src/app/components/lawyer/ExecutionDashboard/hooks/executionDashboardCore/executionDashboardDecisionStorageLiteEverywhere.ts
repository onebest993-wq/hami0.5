import type { ExecutionDecisionRowLite } from './executionDashboardDecisionStorageLiteCore';
import {
    allDecisionStorageKeys,
    readDecisionRowsByKey,
} from './executionDashboardDecisionStorageLiteReadStore';
import {
    dispatchExecutionDecisionsReload,
    writeDecisionRowsByKey,
} from './executionDashboardDecisionStorageLiteWriteStore';

export function patchExecutionDecisionRowEverywhereLite(
    decisionId: string,
    patch: ExecutionDecisionRowLite,
): boolean {
    const did = String(decisionId || '').trim();
    if (!did) return false;

    let touched = false;
    for (const key of allDecisionStorageKeys()) {
        const rows = readDecisionRowsByKey(key);
        if (!rows.length) continue;
        let keyTouched = false;
        const nextRows = rows.map((row) => {
            if (String(row?.id || '').trim() !== did) return row;
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
