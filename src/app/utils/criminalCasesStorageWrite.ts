import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import { CRIMINAL_META_KEY } from '@/app/services/criminalShardedPersistStorage';
import { authorizeCriminalEmptyPersist } from '@/app/services/criminalEmptyPersistAuth';
import {
    CRIMINAL_CARD_INDEX_KEY,
    parseCriminalCardIndex,
    projectCriminalCaseCardIndexEntry,
    serializeCriminalCardIndex,
} from '@/app/utils/criminalCaseCardIndex';
import {
    deleteCaseShardJsonSync,
    dispatchCriminalStoragePatched,
    findCaseStorageKey,
    readCaseShardJsonSync,
    setCriminalCasesCache,
    writeCaseShardJsonSync,
    type CriminalCaseRecord,
} from '@/app/utils/criminalCasesStorageHelpers';
import {
    dropLeftoverCriminalMonolithSync,
    loadCasesFromShardedMetaSync,
    persistCriminalCasesAsShardsSync,
} from '@/app/utils/criminalCasesStorageMigrate';
import { readCasesRoot } from '@/app/utils/criminalCasesStorageRead';

export function writeCasesRoot(
    parsed: Record<string, unknown>,
    casesById: Record<string, CriminalCaseRecord>,
): string {
    if (parsed.state && typeof parsed.state === 'object') {
        (parsed.state as Record<string, unknown>).casesById = casesById;
    } else {
        parsed.casesById = casesById;
    }
    const serialized = JSON.stringify(parsed);
    setCriminalCasesCache(serialized, { parsed, casesById });
    persistCriminalCasesAsShardsSync(parsed, casesById);
    return serialized;
}

function patchLiveCaseShard(
    trimmedId: string,
    mutator: (caseRecord: CriminalCaseRecord) => CriminalCaseRecord,
): boolean {
    const shardRaw = readCaseShardJsonSync(trimmedId);
    if (!shardRaw) return false;
    try {
        const parsed: unknown = JSON.parse(shardRaw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
        const next = mutator({ ...(parsed as CriminalCaseRecord) });
        if (!writeCaseShardJsonSync(trimmedId, JSON.stringify(next))) return false;
        try {
            const indexed =
                parseCriminalCardIndex(readSecureOrDrainLegacySync(CRIMINAL_CARD_INDEX_KEY)) ?? [];
            const entry = projectCriminalCaseCardIndexEntry(next);
            const nextIndex = entry
                ? [...indexed.filter((row) => row.id !== trimmedId), entry]
                : indexed.filter((row) => row.id !== trimmedId);
            SecureStoreService.setItemSync(CRIMINAL_CARD_INDEX_KEY, serializeCriminalCardIndex(nextIndex));
            clearLegacyPlaintextMirror(CRIMINAL_CARD_INDEX_KEY);
        } catch {
            /* فهرس ثانوي */
        }
        dispatchCriminalStoragePatched(trimmedId);
        return true;
    } catch {
        return false;
    }
}

/** تعديل إضبارة جزائية واحدة في التخزين (مزامنة عكسية من التقويم) — يدعم الجذر والـ shards. */
export function patchCriminalCaseRecord(
    caseId: string,
    mutator: (caseRecord: CriminalCaseRecord) => CriminalCaseRecord,
): boolean {
    const trimmedId = String(caseId ?? '').trim();
    if (!trimmedId) return false;

    const liveShards = loadCasesFromShardedMetaSync();
    if (liveShards && liveShards.length > 0) {
        dropLeftoverCriminalMonolithSync();
        return patchLiveCaseShard(trimmedId, mutator);
    }

    const root = readCasesRoot();
    if (root && Object.keys(root.casesById).length > 0) {
        const { parsed, casesById } = root;
        const key = findCaseStorageKey(casesById, trimmedId) ?? trimmedId;
        const current = casesById[key];
        if (!current) return false;
        casesById[key] = mutator({ ...current });
        try {
            writeCasesRoot(parsed, casesById);
            dispatchCriminalStoragePatched(trimmedId);
            return true;
        } catch {
            return false;
        }
    }

    return patchLiveCaseShard(trimmedId, mutator);
}

/** حذف فوري متزامن لإضبارة من الجذر + shard + فهرس البطاقات + meta */
export function purgeCriminalCaseRecord(caseId: string): boolean {
    const trimmedId = String(caseId ?? '').trim();
    if (!trimmedId) return false;
    let changed = false;

    const liveShards = loadCasesFromShardedMetaSync();
    if (!liveShards?.length) {
        try {
            const root = readCasesRoot();
            if (root && Object.keys(root.casesById).length > 0) {
                const key = findCaseStorageKey(root.casesById, trimmedId) ?? trimmedId;
                if (root.casesById[key]) {
                    const next = { ...root.casesById };
                    delete next[key];
                    if (Object.keys(next).length === 0) {
                        authorizeCriminalEmptyPersist();
                    }
                    writeCasesRoot(root.parsed, next);
                    changed = true;
                }
            }
        } catch {
            /* continue */
        }
    } else {
        dropLeftoverCriminalMonolithSync();
    }

    try {
        deleteCaseShardJsonSync(trimmedId);
        changed = true;
    } catch {
        /* continue */
    }

    try {
        const indexed =
            parseCriminalCardIndex(readSecureOrDrainLegacySync(CRIMINAL_CARD_INDEX_KEY)) ?? [];
        const nextIndex = indexed.filter((row) => String(row.id ?? '').trim() !== trimmedId);
        if (nextIndex.length !== indexed.length) {
            SecureStoreService.setItemSync(
                CRIMINAL_CARD_INDEX_KEY,
                serializeCriminalCardIndex(nextIndex),
            );
            clearLegacyPlaintextMirror(CRIMINAL_CARD_INDEX_KEY);
            changed = true;
        }
    } catch {
        /* continue */
    }

    try {
        const metaRaw = readSecureOrDrainLegacySync(CRIMINAL_META_KEY);
        if (metaRaw?.trim()) {
            const envelope = JSON.parse(metaRaw) as {
                sharded?: boolean;
                caseIds?: unknown;
                state?: Record<string, unknown>;
                version?: number;
            };
            if (envelope?.sharded && Array.isArray(envelope.caseIds)) {
                const nextIds = envelope.caseIds.filter(
                    (id) => typeof id === 'string' && id.trim() && id.trim() !== trimmedId,
                );
                if (nextIds.length !== envelope.caseIds.length) {
                    SecureStoreService.setItemSync(
                        CRIMINAL_META_KEY,
                        JSON.stringify({ ...envelope, caseIds: nextIds }),
                    );
                    clearLegacyPlaintextMirror(CRIMINAL_META_KEY);
                    changed = true;
                }
            }
        }
    } catch {
        /* continue */
    }

    if (changed) dispatchCriminalStoragePatched(trimmedId);
    return changed;
}
