import SecureStoreService from '@/app/services/SecureStoreService';
import { CRIMINAL_META_KEY } from '@/app/services/criminalShardedPersistStorage';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    CRIMINAL_CARD_INDEX_KEY,
    CRIMINAL_CARD_INDEX_STUB_FLAG,
    projectCriminalCasesCardIndex,
    serializeCriminalCardIndex,
} from '@/app/utils/criminalCaseCardIndex';
import {
    CRIMINAL_STORE_KEY,
    collectCriminalCaseShardIdsFromKeys,
    deleteCaseShardJsonSync,
    readCaseShardJsonSync,
    readCaseShardJsonSyncAware,
    resolveShardedCaseIds,
    resolveShardedCaseIdsSync,
    writeCaseShardJsonSync,
    type CriminalCaseRecord,
} from '@/app/utils/criminalCasesStorageHelpers';

export async function loadCasesFromShardedMeta(): Promise<CriminalCaseRecord[] | null> {
    const metaRaw = await SecureStoreService.getItem(CRIMINAL_META_KEY);
    if (!metaRaw?.trim()) return null;
    try {
        const envelope = JSON.parse(metaRaw) as {
            sharded?: boolean;
            caseIds?: unknown;
        };
        if (!envelope?.sharded) return null;
        const listed = Array.isArray(envelope.caseIds)
            ? envelope.caseIds.filter(
                  (id): id is string => typeof id === 'string' && Boolean(id.trim()),
              )
            : [];
        const caseIds = await resolveShardedCaseIds(listed);
        if (!caseIds.length) return null;
        const parsedRows = await Promise.all(
            caseIds.map(async (caseId) => {
                const shardRaw = await readCaseShardJsonSyncAware(caseId);
                if (!shardRaw) return null;
                try {
                    const parsed: unknown = JSON.parse(shardRaw);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        return parsed as CriminalCaseRecord;
                    }
                } catch {
                    /* skip corrupt shard */
                }
                return null;
            }),
        );
        const cases = parsedRows.filter((row): row is CriminalCaseRecord => Boolean(row));
        return cases.length > 0 ? cases : null;
    } catch {
        return null;
    }
}

export function loadCasesFromShardedMetaSync(): CriminalCaseRecord[] | null {
    const metaRaw = readSecureOrDrainLegacySync(CRIMINAL_META_KEY);
    if (!metaRaw?.trim()) return null;
    try {
        const envelope = JSON.parse(metaRaw) as {
            sharded?: boolean;
            caseIds?: unknown;
        };
        if (!envelope?.sharded) return null;
        const listed = Array.isArray(envelope.caseIds)
            ? envelope.caseIds.filter(
                  (id): id is string => typeof id === 'string' && Boolean(id.trim()),
              )
            : [];
        const caseIds = resolveShardedCaseIdsSync(listed);
        if (!caseIds.length) return null;
        const cases: CriminalCaseRecord[] = [];
        for (const caseId of caseIds) {
            const shardRaw = readCaseShardJsonSync(caseId);
            if (!shardRaw) continue;
            try {
                const parsed: unknown = JSON.parse(shardRaw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    cases.push(parsed as CriminalCaseRecord);
                }
            } catch {
                /* skip */
            }
        }
        return cases.length > 0 ? cases : null;
    } catch {
        return null;
    }
}

export function backfillCriminalCardIndex(cases: CriminalCaseRecord[]): void {
    try {
        const entries = projectCriminalCasesCardIndex(cases);
        void SecureStoreService.setItem(CRIMINAL_CARD_INDEX_KEY, serializeCriminalCardIndex(entries));
    } catch {
        /* ignore */
    }
}

export function dropLeftoverCriminalMonolithSync(): void {
    try {
        if (SecureStoreService.getItemSync(CRIMINAL_STORE_KEY) != null) {
            SecureStoreService.deleteItemSync(CRIMINAL_STORE_KEY);
        }
    } catch {
        /* بقايا المونولث لا تُدمج مع الشظايا */
    }
    clearLegacyPlaintextMirror(CRIMINAL_STORE_KEY);
}

/**
 * يكتب الشظايا + meta ويمحو `hami:criminal:store`.
 * لا يكتب المونولث — مسار الترقيع/القراءة يرحّل البقايا الصريحة.
 */
export function persistCriminalCasesAsShardsSync(
    parsed: Record<string, unknown>,
    casesById: Record<string, CriminalCaseRecord>,
): void {
    const caseIds = Object.keys(casesById);
    const metaState =
        parsed.state && typeof parsed.state === 'object'
            ? (() => {
                  const state = { ...(parsed.state as Record<string, unknown>) };
                  delete state.casesById;
                  return state;
              })()
            : (() => {
                  const rest = { ...parsed };
                  delete rest.casesById;
                  delete rest.version;
                  return rest;
              })();
    const metaPayload = JSON.stringify({
        state: metaState,
        version: typeof parsed.version === 'number' ? parsed.version : undefined,
        caseIds,
        sharded: true,
    });

    for (const [caseId, caseData] of Object.entries(casesById)) {
        if (
            caseData &&
            typeof caseData === 'object' &&
            !Array.isArray(caseData) &&
            (caseData as Record<string, unknown>)[CRIMINAL_CARD_INDEX_STUB_FLAG] === true
        ) {
            continue;
        }
        writeCaseShardJsonSync(caseId, JSON.stringify(caseData));
    }

    const keep = new Set(caseIds);
    for (const staleId of collectCriminalCaseShardIdsFromKeys(SecureStoreService.listKeysSync())) {
        if (!keep.has(staleId)) deleteCaseShardJsonSync(staleId);
    }

    SecureStoreService.setItemSync(CRIMINAL_META_KEY, metaPayload);
    clearLegacyPlaintextMirror(CRIMINAL_META_KEY);
    SecureStoreService.deleteItemSync(CRIMINAL_STORE_KEY);
    clearLegacyPlaintextMirror(CRIMINAL_STORE_KEY);
    try {
        const entries = projectCriminalCasesCardIndex(Object.values(casesById));
        SecureStoreService.setItemSync(CRIMINAL_CARD_INDEX_KEY, serializeCriminalCardIndex(entries));
        clearLegacyPlaintextMirror(CRIMINAL_CARD_INDEX_KEY);
    } catch {
        /* فهرس البطاقة ثانوي */
    }
}
