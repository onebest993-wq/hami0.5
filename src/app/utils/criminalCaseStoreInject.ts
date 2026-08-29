/**
 * Safe inject of a criminal case row into an in-memory casesById map.
 *
 * Card-index stubs may be injected for display only (marked `_cardIndexStub`).
 * Full records upgrade stubs; stubs never overwrite full cases.
 * Persist must skip writing stub shards (see criminalShardedPersistStorage).
 */

import {
    CRIMINAL_CARD_INDEX_STUB_FLAG,
    isCriminalCaseCardIndexStub,
    markCriminalCaseCardIndexStub,
    shouldInjectCriminalCaseRecord,
} from '@/app/utils/criminalCaseCardIndex';

function findExistingCaseEntry(
    casesById: Record<string, unknown>,
    caseId: string,
): { key: string; record: unknown } | null {
    const trimmed = String(caseId ?? '').trim();
    if (!trimmed) return null;
    if (casesById[trimmed] != null) {
        return { key: trimmed, record: casesById[trimmed] };
    }
    for (const [key, row] of Object.entries(casesById)) {
        if (row && typeof row === 'object' && String((row as { id?: unknown }).id ?? '').trim() === trimmed) {
            return { key, record: row };
        }
    }
    return null;
}

export type InjectCriminalCaseIntoMapResult = {
    next: Record<string, unknown>;
    injected: boolean;
};

/**
 * Returns a new casesById map when injection/upgrade happens; otherwise `injected: false`.
 */
export function injectCriminalCaseIntoMap(
    casesById: Record<string, unknown>,
    caseId: string,
    row: { id?: string } & Record<string, unknown>,
    options?: { fromCardIndex?: boolean },
): InjectCriminalCaseIntoMapResult {
    const trimmed = String(caseId ?? '').trim();
    if (!trimmed || !row || typeof row !== 'object') {
        return { next: casesById, injected: false };
    }

    const fromCardIndex = options?.fromCardIndex === true;
    const incomingIsStub = fromCardIndex || isCriminalCaseCardIndexStub(row);
    const existing = findExistingCaseEntry(casesById, trimmed);
    if (shouldInjectCriminalCaseRecord(existing?.record, incomingIsStub) === 'skip') {
        return { next: casesById, injected: false };
    }

    const recordId = String(row.id ?? trimmed).trim() || trimmed;
    const base: Record<string, unknown> = { ...row, id: recordId };
    let record: Record<string, unknown>;
    if (incomingIsStub) {
        record = markCriminalCaseCardIndexStub(base);
    } else {
        delete base[CRIMINAL_CARD_INDEX_STUB_FLAG];
        record = base;
    }

    const next: Record<string, unknown> = { ...casesById };
    if (existing && existing.key !== trimmed && existing.key !== recordId) {
        delete next[existing.key];
    }
    next[trimmed] = record;
    if (recordId !== trimmed) {
        next[recordId] = record;
    }
    return { next, injected: true };
}
