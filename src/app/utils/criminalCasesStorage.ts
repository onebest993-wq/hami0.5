import SecureStoreService from '@/app/services/SecureStoreService';
import {
    CRIMINAL_META_KEY,
    CRIMINAL_CASE_PREFIX,
} from '@/app/services/criminalShardedPersistStorage';
import { CRIMINAL_SHARD_ENCRYPT_MAX_BYTES } from '@/app/services/secureStorageKeys';
import { authorizeCriminalEmptyPersist } from '@/app/services/criminalEmptyPersistAuth';
import {
    CRIMINAL_CARD_INDEX_KEY,
    parseCriminalCardIndex,
    projectCriminalCaseCardIndexEntry,
    projectCriminalCasesCardIndex,
    serializeCriminalCardIndex,
    type CriminalCaseCardIndexEntry,
} from '@/app/utils/criminalCaseCardIndex';

export const CRIMINAL_STORE_KEY = 'hami:criminal:store';
export const CRIMINAL_STORAGE_PATCHED_EVENT = 'hami:criminal-storage-patched';
export { CRIMINAL_CARD_INDEX_KEY };

type CriminalCaseRecord = Record<string, unknown> & { id?: string };

type CasesRoot = {
    parsed: Record<string, unknown>;
    casesById: Record<string, CriminalCaseRecord>;
};

let cachedRaw: string | null = null;
let cachedRoot: CasesRoot | null = null;

function setCriminalCasesCache(serialized: string, root: CasesRoot): void {
    cachedRaw = serialized;
    cachedRoot = root;
}

function clearCriminalCasesCache(): void {
    cachedRaw = null;
    cachedRoot = null;
}

function findCaseStorageKey(
    casesById: Record<string, CriminalCaseRecord>,
    caseId: string,
): string | null {
    const trimmed = String(caseId ?? '').trim();
    if (!trimmed) return null;
    if (casesById[trimmed]) return trimmed;
    const hit = Object.keys(casesById).find((k) => {
        const row = casesById[k];
        if (!row || typeof row !== 'object') return false;
        return String(row.id ?? k).trim() === trimmed;
    });
    return hit ?? null;
}

function dispatchCriminalStoragePatched(caseId: string): void {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent(CRIMINAL_STORAGE_PATCHED_EVENT, { detail: { caseId } }),
            );
        }
    } catch {
        /* ignore */
    }
}

async function readCasesRootAsync(): Promise<CasesRoot | null> {
    try {
        await SecureStoreService.ensurePersistedReady();
        const raw = await SecureStoreService.getItem(CRIMINAL_STORE_KEY);
        if (!raw) {
            clearCriminalCasesCache();
            return null;
        }
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

function readCasesRoot(): CasesRoot | null {
    try {
        const raw = SecureStoreService.getItemSync(CRIMINAL_STORE_KEY);
        if (!raw) {
            clearCriminalCasesCache();
            return null;
        }
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

function writeCasesRoot(
    parsed: Record<string, unknown>,
    casesById: Record<string, CriminalCaseRecord>,
): string {
    if (parsed.state && typeof parsed.state === 'object') {
        (parsed.state as Record<string, unknown>).casesById = casesById;
    } else {
        parsed.casesById = casesById;
    }
    const serialized = JSON.stringify(parsed);
    SecureStoreService.setItemSync(CRIMINAL_STORE_KEY, serialized);
    setCriminalCasesCache(serialized, { parsed, casesById });
    try {
        const entries = projectCriminalCasesCardIndex(Object.values(casesById));
        SecureStoreService.setItemSync(CRIMINAL_CARD_INDEX_KEY, serializeCriminalCardIndex(entries));
    } catch {
        /* فهرس البطاقة ثانوي */
    }
    return serialized;
}

function readCaseShardJsonSync(caseId: string): string | null {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestRaw = SecureStoreService.getItemSync(`${baseKey}__manifest`);
    if (!manifestRaw) {
        return SecureStoreService.getItemSync(baseKey);
    }
    let parts = 0;
    try {
        const manifest = JSON.parse(manifestRaw) as { parts?: unknown };
        parts = typeof manifest.parts === 'number' && manifest.parts > 0 ? manifest.parts : 0;
    } catch {
        return null;
    }
    if (!parts) return null;
    let assembled = '';
    for (let i = 0; i < parts; i += 1) {
        const chunk = SecureStoreService.getItemSync(`${baseKey}__p${i}`);
        if (chunk === null) return null;
        assembled += chunk;
    }
    return assembled;
}

async function readCaseShardJsonSyncAware(caseId: string): Promise<string | null> {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestKey = `${baseKey}__manifest`;
    const manifestRaw = await SecureStoreService.getItem(manifestKey);
    if (!manifestRaw) {
        return SecureStoreService.getItem(baseKey);
    }
    let parts = 0;
    try {
        const manifest = JSON.parse(manifestRaw) as { parts?: unknown };
        parts = typeof manifest.parts === 'number' && manifest.parts > 0 ? manifest.parts : 0;
    } catch {
        return null;
    }
    if (!parts) return null;
    let assembled = '';
    for (let i = 0; i < parts; i += 1) {
        const chunk = await SecureStoreService.getItem(`${baseKey}__p${i}`);
        if (chunk === null) return null;
        assembled += chunk;
    }
    return assembled;
}

function collectCriminalCaseShardIdsFromKeys(keys: string[]): string[] {
    const ids = new Set<string>();
    for (const k of keys) {
        if (!k.startsWith(CRIMINAL_CASE_PREFIX)) continue;
        const suffix = k.slice(CRIMINAL_CASE_PREFIX.length);
        if (!suffix) continue;
        if (!suffix.includes('__')) {
            ids.add(suffix);
            continue;
        }
        if (suffix.endsWith('__manifest')) {
            const caseId = suffix.slice(0, -'__manifest'.length);
            if (caseId) ids.add(caseId);
        }
    }
    return Array.from(ids);
}

async function resolveShardedCaseIds(envelopeCaseIds: string[]): Promise<string[]> {
    if (envelopeCaseIds.length > 0) return envelopeCaseIds;
    try {
        return collectCriminalCaseShardIdsFromKeys(await SecureStoreService.listKeys());
    } catch {
        return [];
    }
}

function resolveShardedCaseIdsSync(envelopeCaseIds: string[]): string[] {
    if (envelopeCaseIds.length > 0) return envelopeCaseIds;
    try {
        return collectCriminalCaseShardIdsFromKeys(SecureStoreService.listKeysSync());
    } catch {
        return [];
    }
}

async function loadCasesFromShardedMeta(): Promise<CriminalCaseRecord[] | null> {
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

function loadCasesFromShardedMetaSync(): CriminalCaseRecord[] | null {
    const metaRaw = SecureStoreService.getItemSync(CRIMINAL_META_KEY);
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

function backfillCriminalCardIndex(cases: CriminalCaseRecord[]): void {
    try {
        const entries = projectCriminalCasesCardIndex(cases);
        void SecureStoreService.setItem(CRIMINAL_CARD_INDEX_KEY, serializeCriminalCardIndex(entries));
    } catch {
        /* ignore */
    }
}

/** قراءة إضابير الجزائي من تخزين Zustand دون استيراد الـ Store (تجنّب دورات الاستيراد). */
export function loadCriminalCasesRaw(): CriminalCaseRecord[] {
    const root = readCasesRoot();
    const rootCases = root ? Object.values(root.casesById) : [];
    const sharded = loadCasesFromShardedMetaSync();
    if (!sharded?.length) return rootCases;
    if (!rootCases.length) return sharded;
    const byId = new Map<string, CriminalCaseRecord>();
    for (const row of rootCases) {
        const id = String(row.id ?? '').trim();
        if (id) byId.set(id, row);
    }
    for (const row of sharded) {
        const id = String(row.id ?? '').trim();
        if (id) byId.set(id, row);
    }
    return Array.from(byId.values());
}

/** قراءة آمنة بعد تحميل IndexedDB — للمزامنة وقائمة البطاقات الفورية (يشمل التخزين المُجزَّأ). */
export async function loadCriminalCasesRawAsync(): Promise<CriminalCaseRecord[]> {
    try {
        await SecureStoreService.ensurePersistedReady();
        const sharded = await loadCasesFromShardedMeta();
        if (sharded && sharded.length > 0) return sharded;
        const root = await readCasesRootAsync();
        if (!root) return [];
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
        const indexed = parseCriminalCardIndex(SecureStoreService.getItemSync(CRIMINAL_CARD_INDEX_KEY));
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

/** تعديل إضبارة جزائية واحدة في التخزين (مزامنة عكسية من التقويم) — يدعم الجذر والـ shards. */
export function patchCriminalCaseRecord(
    caseId: string,
    mutator: (caseRecord: CriminalCaseRecord) => CriminalCaseRecord,
): boolean {
    const trimmedId = String(caseId ?? '').trim();
    if (!trimmedId) return false;

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

    const shardRaw = readCaseShardJsonSync(trimmedId);
    if (!shardRaw) return false;
    try {
        const parsed: unknown = JSON.parse(shardRaw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
        const next = mutator({ ...(parsed as CriminalCaseRecord) });
        if (!writeCaseShardJsonSync(trimmedId, JSON.stringify(next))) return false;
        try {
            const indexed =
                parseCriminalCardIndex(SecureStoreService.getItemSync(CRIMINAL_CARD_INDEX_KEY)) ?? [];
            const entry = projectCriminalCaseCardIndexEntry(next);
            const nextIndex = entry
                ? [...indexed.filter((row) => row.id !== trimmedId), entry]
                : indexed.filter((row) => row.id !== trimmedId);
            SecureStoreService.setItemSync(CRIMINAL_CARD_INDEX_KEY, serializeCriminalCardIndex(nextIndex));
        } catch {
            /* فهرس ثانوي */
        }
        dispatchCriminalStoragePatched(trimmedId);
        return true;
    } catch {
        return false;
    }
}

function writeCaseShardJsonSync(caseId: string, json: string): boolean {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestKey = `${baseKey}__manifest`;
    try {
        const manifestRaw = SecureStoreService.getItemSync(manifestKey);
        if (manifestRaw) {
            let parts = 0;
            try {
                const manifest = JSON.parse(manifestRaw) as { parts?: unknown };
                parts = typeof manifest.parts === 'number' && manifest.parts > 0 ? manifest.parts : 0;
            } catch {
                parts = 0;
            }
            for (let i = 0; i < parts; i += 1) {
                SecureStoreService.deleteItemSync(`${baseKey}__p${i}`);
            }
            SecureStoreService.deleteItemSync(manifestKey);
        }
        SecureStoreService.deleteItemSync(baseKey);

        const chunkSize = 200 * 1024;
        if (json.length <= CRIMINAL_SHARD_ENCRYPT_MAX_BYTES) {
            SecureStoreService.setItemSync(baseKey, json);
            return true;
        }
        const parts = Math.ceil(json.length / chunkSize);
        for (let i = 0; i < parts; i += 1) {
            const start = i * chunkSize;
            SecureStoreService.setItemSync(
                `${baseKey}__p${i}`,
                json.slice(start, Math.min(json.length, start + chunkSize)),
            );
        }
        SecureStoreService.setItemSync(manifestKey, JSON.stringify({ v: 1, parts }));
        return true;
    } catch {
        return false;
    }
}

function deleteCaseShardJsonSync(caseId: string): void {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestKey = `${baseKey}__manifest`;
    try {
        const manifestRaw = SecureStoreService.getItemSync(manifestKey);
        if (manifestRaw) {
            let parts = 0;
            try {
                const manifest = JSON.parse(manifestRaw) as { parts?: unknown };
                parts = typeof manifest.parts === 'number' && manifest.parts > 0 ? manifest.parts : 0;
            } catch {
                parts = 0;
            }
            for (let i = 0; i < parts; i += 1) {
                SecureStoreService.deleteItemSync(`${baseKey}__p${i}`);
            }
            SecureStoreService.deleteItemSync(manifestKey);
        }
        SecureStoreService.deleteItemSync(baseKey);
    } catch {
        /* ignore */
    }
}

/** حذف فوري متزامن لإضبارة من الجذر + shard + فهرس البطاقات + meta */
export function purgeCriminalCaseRecord(caseId: string): boolean {
    const trimmedId = String(caseId ?? '').trim();
    if (!trimmedId) return false;
    let changed = false;

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

    try {
        deleteCaseShardJsonSync(trimmedId);
        changed = true;
    } catch {
        /* continue */
    }

    try {
        const indexed =
            parseCriminalCardIndex(SecureStoreService.getItemSync(CRIMINAL_CARD_INDEX_KEY)) ?? [];
        const nextIndex = indexed.filter((row) => String(row.id ?? '').trim() !== trimmedId);
        if (nextIndex.length !== indexed.length) {
            SecureStoreService.setItemSync(
                CRIMINAL_CARD_INDEX_KEY,
                serializeCriminalCardIndex(nextIndex),
            );
            changed = true;
        }
    } catch {
        /* continue */
    }

    try {
        const metaRaw = SecureStoreService.getItemSync(CRIMINAL_META_KEY);
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
