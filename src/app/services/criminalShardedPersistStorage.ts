import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    countCasesInPersistPayload,
    defaultPersistWipeGuard,
    type PersistWipeGuard,
} from '@/app/services/securePersistStorage';
import { CRIMINAL_SHARD_ENCRYPT_MAX_BYTES } from '@/app/services/secureStorageKeys';

export const CRIMINAL_STORE_KEY = 'hami:criminal:store';
export const CRIMINAL_META_KEY = 'hami:criminal:meta';
export const CRIMINAL_CASE_PREFIX = 'hami:criminal:case:';

/** حجم كل جزء — أقل من حد التشفير (256 KB) ليبقى كل chunk قابلاً للتشفير */
const CASE_CHUNK_CHAR_SIZE = 200 * 1024;

const DEBOUNCE_MS = 800;

let flushChain = Promise.resolve();
let visibilityHookInstalled = false;

function installVisibilityFlush(flush: () => Promise<void>) {
    if (visibilityHookInstalled || typeof document === 'undefined') return;
    visibilityHookInstalled = true;
    const schedule = () => {
        flushChain = flushChain.then(flush);
    };
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) return;
        schedule();
    });
    window.addEventListener('pagehide', schedule);
}

type PersistEnvelope = {
    state?: Record<string, unknown>;
    version?: number;
    caseIds?: string[];
    sharded?: boolean;
};

function parseEnvelope(raw: string | null | undefined): PersistEnvelope | null {
    if (!raw?.trim()) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as PersistEnvelope;
    } catch {
        return null;
    }
}

function caseShardKey(caseId: string): string {
    return `${CRIMINAL_CASE_PREFIX}${caseId}`;
}

function caseChunkManifestKey(caseId: string): string {
    return `${caseShardKey(caseId)}__manifest`;
}

function caseChunkPartKey(caseId: string, index: number): string {
    return `${caseShardKey(caseId)}__p${index}`;
}

function isBaseCaseShardStorageKey(key: string): boolean {
    if (!key.startsWith(CRIMINAL_CASE_PREFIX)) return false;
    const suffix = key.slice(CRIMINAL_CASE_PREFIX.length);
    return Boolean(suffix) && !suffix.includes('__');
}

async function readCaseShardJson(caseId: string): Promise<string | null> {
    const baseKey = caseShardKey(caseId);
    const manifestRaw = await SecureStoreService.getItem(caseChunkManifestKey(caseId));
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
        const chunk = await SecureStoreService.getItem(caseChunkPartKey(caseId, i));
        if (chunk === null) return null;
        assembled += chunk;
    }
    return assembled;
}

async function deleteCaseShardStorage(caseId: string): Promise<void> {
    const baseKey = caseShardKey(caseId);
    await SecureStoreService.deleteItem(baseKey);
    await SecureStoreService.deleteItem(caseChunkManifestKey(caseId));

    const prefix = `${baseKey}__p`;
    for (const key of await SecureStoreService.listKeys()) {
        if (key.startsWith(prefix)) {
            await SecureStoreService.deleteItem(key);
        }
    }
}

async function writeCaseShardJson(caseId: string, json: string): Promise<void> {
    await deleteCaseShardStorage(caseId);

    if (json.length <= CRIMINAL_SHARD_ENCRYPT_MAX_BYTES) {
        await SecureStoreService.setItem(caseShardKey(caseId), json);
        return;
    }

    const parts = Math.ceil(json.length / CASE_CHUNK_CHAR_SIZE);
    for (let i = 0; i < parts; i += 1) {
        const start = i * CASE_CHUNK_CHAR_SIZE;
        const end = Math.min(json.length, start + CASE_CHUNK_CHAR_SIZE);
        await SecureStoreService.setItem(caseChunkPartKey(caseId, i), json.slice(start, end));
    }
    await SecureStoreService.setItem(caseChunkManifestKey(caseId), JSON.stringify({ v: 1, parts }));
}

function extractState(envelope: PersistEnvelope): Record<string, unknown> {
    const state = envelope.state;
    if (state && typeof state === 'object') return state;
    return envelope as Record<string, unknown>;
}

async function reassembleShardedPayload(metaRaw: string): Promise<string | null> {
    const envelope = parseEnvelope(metaRaw);
    if (!envelope?.sharded) return null;

    const caseIds = Array.isArray(envelope.caseIds) ? envelope.caseIds.filter((id) => typeof id === 'string') : [];
    const state = { ...extractState(envelope) };
    const casesById: Record<string, unknown> = {};

    for (const caseId of caseIds) {
        const shardRaw = await readCaseShardJson(caseId);
        if (!shardRaw) continue;
        try {
            casesById[caseId] = JSON.parse(shardRaw);
        } catch {
            /* skip corrupt shard */
        }
    }

    state.casesById = casesById;

    return JSON.stringify({
        state,
        version: envelope.version,
    });
}

async function listCriminalCaseShardIds(): Promise<string[]> {
    const keys = await SecureStoreService.listKeys();
    const ids = new Set<string>();
    for (const k of keys) {
        if (isBaseCaseShardStorageKey(k)) {
            ids.add(k.slice(CRIMINAL_CASE_PREFIX.length));
            continue;
        }
        if (k.startsWith(CRIMINAL_CASE_PREFIX) && k.endsWith('__manifest')) {
            const caseId = k.slice(CRIMINAL_CASE_PREFIX.length, -'__manifest'.length);
            if (caseId) ids.add(caseId);
        }
    }
    return Array.from(ids);
}

async function writeShardedPayload(name: string, value: string, wipeGuard: PersistWipeGuard): Promise<void> {
    const envelope = parseEnvelope(value);
    if (!envelope) {
        await SecureStoreService.setItem(name, value);
        return;
    }

    const state = extractState(envelope);
    const casesById = state.casesById;
    if (!casesById || typeof casesById !== 'object') {
        await SecureStoreService.setItem(name, value);
        return;
    }

    const caseMap = casesById as Record<string, unknown>;
    const caseIds = Object.keys(caseMap);
    const metaState = { ...state };
    delete metaState.casesById;

    const metaPayload = JSON.stringify({
        state: metaState,
        version: envelope.version,
        caseIds,
        sharded: true,
    });

    try {
        const existingLegacy = await SecureStoreService.getItem(name);
        const existingMeta = await SecureStoreService.getItem(CRIMINAL_META_KEY);
        const existingForGuard = existingMeta ?? existingLegacy;
        if (wipeGuard(metaPayload, existingForGuard, name)) return;
    } catch {
        /* ignore guard */
    }

    for (const [caseId, caseData] of Object.entries(caseMap)) {
        await writeCaseShardJson(caseId, JSON.stringify(caseData));
    }

    await SecureStoreService.setItem(CRIMINAL_META_KEY, metaPayload);

    const staleIds = (await listCriminalCaseShardIds()).filter((id) => !(id in caseMap));
    for (const staleId of staleIds) {
        await deleteCaseShardStorage(staleId);
    }

    const legacyRaw = await SecureStoreService.getItem(name);
    if (existingLegacyExists(legacyRaw)) {
        await SecureStoreService.deleteItem(name);
    }
}

function existingLegacyExists(raw: string | null): boolean {
    return countCasesInPersistPayload(raw) > 0;
}

/** تخزين جنائي: debounce + shard لكل قضية — يقلّل ضغط RAM/CPU عند كل mutation */
export function createCriminalShardedStateStorage(options?: {
    wipeGuard?: PersistWipeGuard;
    debounceMs?: number;
}): StateStorage {
    const wipeGuard = options?.wipeGuard ?? defaultPersistWipeGuard;
    const debounceMs = options?.debounceMs ?? DEBOUNCE_MS;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pending: { name: string; value: string } | null = null;

    const flushPending = async () => {
        const job = pending;
        pending = null;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (!job) return;
        await writeShardedPayload(job.name, job.value, wipeGuard);
    };

    installVisibilityFlush(flushPending);

    return {
        getItem: async (name: string) => {
            await SecureStoreService.ensurePersistedReady();

            const metaRaw = await SecureStoreService.getItem(CRIMINAL_META_KEY);
            if (metaRaw) {
                const assembled = await reassembleShardedPayload(metaRaw);
                if (assembled) return assembled;
            }

            return SecureStoreService.getItem(name);
        },

        setItem: async (name: string, value: string) => {
            await SecureStoreService.ensurePersistedReady();

            try {
                const existingMeta = await SecureStoreService.getItem(CRIMINAL_META_KEY);
                const existingLegacy = await SecureStoreService.getItem(name);
                const existing = existingMeta ?? existingLegacy;
                if (wipeGuard(value, existing, name)) return;
            } catch {
                /* ignore guard */
            }

            pending = { name, value };
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                flushChain = flushChain.then(flushPending);
            }, debounceMs);
        },

        removeItem: async (name: string) => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            pending = null;
            await SecureStoreService.deleteItem(CRIMINAL_META_KEY);
            await SecureStoreService.deleteItem(name);
            for (const id of await listCriminalCaseShardIds()) {
                await deleteCaseShardStorage(id);
            }
        },
    };
}

export function createCriminalShardedJSONStorage<S>() {
    return createJSONStorage<S>(() => createCriminalShardedStateStorage());
}
