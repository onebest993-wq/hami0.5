import SecureStoreService from '@/app/services/SecureStoreService';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    CRIMINAL_CARD_INDEX_KEY,
    parseCriminalCardIndex,
    projectCriminalCasesCardIndex,
    type CriminalCaseCardIndexEntry,
} from '@/app/utils/criminalCaseCardIndex';
import {
    CRIMINAL_STORE_KEY,
    clearCriminalCasesCache,
    findCaseStorageKey,
    getCriminalCasesCache,
    readCaseShardJsonSync,
    readCaseShardJsonSyncAware,
    setCriminalCasesCache,
    type CasesRoot,
    type CriminalCaseRecord,
} from '@/app/utils/criminalCasesStorageHelpers';
import {
    backfillCriminalCardIndex,
    dropLeftoverCriminalMonolithSync,
    loadCasesFromShardedMeta,
    loadCasesFromShardedMetaSync,
    persistCriminalCasesAsShardsSync,
} from '@/app/utils/criminalCasesStorageMigrate';

export async function readCasesRootAsync(): Promise<CasesRoot | null> {
    try {
        await SecureStoreService.ensurePersistedReady();
        const raw = await SecureStoreService.getItem(CRIMINAL_STORE_KEY);
        if (!raw) {
            clearCriminalCasesCache();
            return null;
        }
        const { cachedRaw, cachedRoot } = getCriminalCasesCache();
        if (cachedRaw === raw && cachedRoot) return cachedRoot;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const root = parsed as Record<string, unknown>;
        const casesById =
            (root.state as { casesById?: unknown } | undefined)?.casesById ?? root.casesById;
        if (!casesById || typeof casesById !== 'object') return null;
        const next: CasesRoot = {
            parsed: root,
            casesById: casesById as Record<string, CriminalCaseRecord>,
        };
        setCriminalCasesCache(raw, next);
        return next;
    } catch {
        return null;
    }
}

function readCriminalMonolithRawSync(): string | null {
    try {
        const fromSecure = SecureStoreService.getItemSync(CRIMINAL_STORE_KEY);
        if (fromSecure != null) return fromSecure;
    } catch {
        /* fall through to leftover — بلا drain يشفّر المونولث */
    }
    try {
        if (SecureStoreService.isUnreadSync(CRIMINAL_STORE_KEY)) return null;
    } catch {
        /* fall through */
    }
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(CRIMINAL_STORE_KEY);
    } catch {
        return null;
    }
}

export function readCasesRoot(): CasesRoot | null {
    try {
        const raw = readCriminalMonolithRawSync();
        if (!raw) {
            clearCriminalCasesCache();
            return null;
        }
        const { cachedRaw, cachedRoot } = getCriminalCasesCache();
        if (cachedRaw === raw && cachedRoot) return cachedRoot;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const root = parsed as Record<string, unknown>;
        const casesById =
            (root.state as { casesById?: unknown } | undefined)?.casesById ?? root.casesById;
        if (!casesById || typeof casesById !== 'object') return null;
        const next: CasesRoot = {
            parsed: root,
            casesById: casesById as Record<string, CriminalCaseRecord>,
        };
        setCriminalCasesCache(raw, next);
        return next;
    } catch {
        return null;
    }
}

/** قراءة إضابير الجزائي من تخزين Zustand دون استيراد الـ Store (تجنّب دورات الاستيراد). */
export function loadCriminalCasesRaw(): CriminalCaseRecord[] {
    const sharded = loadCasesFromShardedMetaSync();
    if (sharded && sharded.length > 0) {
        dropLeftoverCriminalMonolithSync();
        return sharded;
    }
    const root = readCasesRoot();
    if (!root || Object.keys(root.casesById).length === 0) return [];
    try {
        persistCriminalCasesAsShardsSync(root.parsed, root.casesById);
    } catch {
        /* البقايا تبقى مقروءة هذه الجلسة إن فشل الترحيل */
    }
    return Object.values(root.casesById);
}

/** قراءة آمنة بعد تحميل IndexedDB — للمزامنة وقائمة البطاقات الفورية (يشمل التخزين المُجزَّأ). */
export async function loadCriminalCasesRawAsync(): Promise<CriminalCaseRecord[]> {
    try {
        await SecureStoreService.ensurePersistedReady();
        const sharded = await loadCasesFromShardedMeta();
        if (sharded && sharded.length > 0) {
            dropLeftoverCriminalMonolithSync();
            return sharded;
        }
        let root = await readCasesRootAsync();
        if (!root || Object.keys(root.casesById).length === 0) {
            root = readCasesRoot();
        }
        if (!root || Object.keys(root.casesById).length === 0) return [];
        try {
            persistCriminalCasesAsShardsSync(root.parsed, root.casesById);
        } catch {
            /* البقايا تبقى مقروءة هذه الجلسة إن فشل الترحيل */
        }
        return Object.values(root.casesById);
    } catch {
        return [];
    }
}

/**
 * تحميل إضبارة واحدة بالمعرّف — مسار فتح الإضبارة عندما تكون القائمة من فهرس البطاقات
 * والـ store لم يحتوِ السجل بعد.
 */
export function loadCriminalCaseRecordByIdSync(caseId: string): CriminalCaseRecord | null {
    const trimmedId = String(caseId ?? '').trim();
    if (!trimmedId) return null;

    try {
        const shardRaw = readCaseShardJsonSync(trimmedId);
        if (shardRaw) {
            const parsed: unknown = JSON.parse(shardRaw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as CriminalCaseRecord;
            }
        }
    } catch {
        /* continue */
    }

    try {
        const root = readCasesRoot();
        if (root) {
            const key = findCaseStorageKey(root.casesById, trimmedId) ?? trimmedId;
            const hit = root.casesById[key];
            if (hit) return { ...hit };
        }
    } catch {
        /* continue */
    }

    const sharded = loadCasesFromShardedMetaSync();
    if (sharded) {
        const hit = sharded.find((row) => String(row.id ?? '').trim() === trimmedId);
        if (hit) return hit;
    }

    return null;
}

export async function loadCriminalCaseRecordByIdAsync(
    caseId: string,
): Promise<CriminalCaseRecord | null> {
    const trimmedId = String(caseId ?? '').trim();
    if (!trimmedId) return null;

    try {
        await SecureStoreService.ensurePersistedReady();
        const shardRaw = await readCaseShardJsonSyncAware(trimmedId);
        if (shardRaw) {
            const parsed: unknown = JSON.parse(shardRaw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as CriminalCaseRecord;
            }
        }
    } catch {
        /* continue */
    }

    const syncHit = loadCriminalCaseRecordByIdSync(trimmedId);
    if (syncHit) return syncHit;

    try {
        const rows = await loadCriminalCasesRawAsync();
        return rows.find((row) => String(row.id ?? '').trim() === trimmedId) ?? null;
    } catch {
        return null;
    }
}

export function loadCriminalCasesCardIndexSync(): CriminalCaseCardIndexEntry[] {
    try {
        const indexed = parseCriminalCardIndex(readSecureOrDrainLegacySync(CRIMINAL_CARD_INDEX_KEY));
        if (indexed && indexed.length > 0) return indexed;
    } catch {
        /* ignore */
    }
    return [];
}

export async function loadCriminalCasesCardIndexAsync(): Promise<CriminalCaseCardIndexEntry[]> {
    try {
        const syncHit = loadCriminalCasesCardIndexSync();
        if (syncHit.length > 0) {
            void SecureStoreService.ensurePersistedReady()
                .then(async () => {
                    const indexed = parseCriminalCardIndex(
                        await SecureStoreService.getItem(CRIMINAL_CARD_INDEX_KEY),
                    );
                    if (indexed && indexed.length > 0) return;
                    const full = await loadCriminalCasesRawAsync();
                    if (full.length) backfillCriminalCardIndex(full);
                })
                .catch(() => undefined);
            return syncHit;
        }

        await SecureStoreService.ensurePersistedReady();
        const indexed = parseCriminalCardIndex(await SecureStoreService.getItem(CRIMINAL_CARD_INDEX_KEY));
        if (indexed && indexed.length > 0) return indexed;

        const full = await loadCriminalCasesRawAsync();
        if (!full.length) return [];
        backfillCriminalCardIndex(full);
        return projectCriminalCasesCardIndex(full);
    } catch {
        return [];
    }
}
