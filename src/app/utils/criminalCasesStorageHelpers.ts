import SecureStoreService from '@/app/services/SecureStoreService';
import { CRIMINAL_CASE_PREFIX } from '@/app/services/criminalShardedPersistStorage';
import { CRIMINAL_SHARD_ENCRYPT_MAX_BYTES } from '@/app/services/secureStorageKeys';
import { CRIMINAL_CARD_INDEX_KEY } from '@/app/utils/criminalCaseCardIndex';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export const CRIMINAL_STORE_KEY = 'hami:criminal:store';
export const CRIMINAL_STORAGE_PATCHED_EVENT = 'hami:criminal-storage-patched';
export { CRIMINAL_CARD_INDEX_KEY };

export type CriminalCaseRecord = Record<string, unknown> & { id?: string };

export type CasesRoot = {
    parsed: Record<string, unknown>;
    casesById: Record<string, CriminalCaseRecord>;
};

let cachedRaw: string | null = null;
let cachedRoot: CasesRoot | null = null;

export function setCriminalCasesCache(serialized: string, root: CasesRoot): void {
    cachedRaw = serialized;
    cachedRoot = root;
}

export function clearCriminalCasesCache(): void {
    cachedRaw = null;
    cachedRoot = null;
}

export function getCriminalCasesCache(): {
    cachedRaw: string | null;
    cachedRoot: CasesRoot | null;
} {
    return { cachedRaw, cachedRoot };
}

export function findCaseStorageKey(
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

export function dispatchCriminalStoragePatched(caseId: string): void {
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

export function readCaseShardJsonSync(caseId: string): string | null {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestRaw = readSecureOrDrainLegacySync(`${baseKey}__manifest`);
    if (!manifestRaw) {
        return readSecureOrDrainLegacySync(baseKey);
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
        const chunk = readSecureOrDrainLegacySync(`${baseKey}__p${i}`);
        if (chunk === null) return null;
        assembled += chunk;
    }
    return assembled;
}

export async function readCaseShardJsonSyncAware(caseId: string): Promise<string | null> {
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

export function writeCaseShardJsonSync(caseId: string, json: string): boolean {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestKey = `${baseKey}__manifest`;
    try {
        const manifestRaw = readSecureOrDrainLegacySync(manifestKey);
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
                clearLegacyPlaintextMirror(`${baseKey}__p${i}`);
            }
            SecureStoreService.deleteItemSync(manifestKey);
            clearLegacyPlaintextMirror(manifestKey);
        }
        SecureStoreService.deleteItemSync(baseKey);
        clearLegacyPlaintextMirror(baseKey);

        const chunkSize = 200 * 1024;
        if (json.length <= CRIMINAL_SHARD_ENCRYPT_MAX_BYTES) {
            SecureStoreService.setItemSync(baseKey, json);
            clearLegacyPlaintextMirror(baseKey);
            return true;
        }
        const parts = Math.ceil(json.length / chunkSize);
        for (let i = 0; i < parts; i += 1) {
            const start = i * chunkSize;
            const partKey = `${baseKey}__p${i}`;
            SecureStoreService.setItemSync(
                partKey,
                json.slice(start, Math.min(json.length, start + chunkSize)),
            );
            clearLegacyPlaintextMirror(partKey);
        }
        SecureStoreService.setItemSync(manifestKey, JSON.stringify({ v: 1, parts }));
        clearLegacyPlaintextMirror(manifestKey);
        return true;
    } catch {
        return false;
    }
}

export function deleteCaseShardJsonSync(caseId: string): void {
    const baseKey = `${CRIMINAL_CASE_PREFIX}${caseId}`;
    const manifestKey = `${baseKey}__manifest`;
    try {
        const manifestRaw = readSecureOrDrainLegacySync(manifestKey);
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
                clearLegacyPlaintextMirror(`${baseKey}__p${i}`);
            }
            SecureStoreService.deleteItemSync(manifestKey);
            clearLegacyPlaintextMirror(manifestKey);
        }
        SecureStoreService.deleteItemSync(baseKey);
        clearLegacyPlaintextMirror(baseKey);
    } catch {
        /* ignore */
    }
}

export function collectCriminalCaseShardIdsFromKeys(keys: string[]): string[] {
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

export async function resolveShardedCaseIds(envelopeCaseIds: string[]): Promise<string[]> {
    if (envelopeCaseIds.length > 0) return envelopeCaseIds;
    try {
        return collectCriminalCaseShardIdsFromKeys(await SecureStoreService.listKeys());
    } catch {
        return [];
    }
}

export function resolveShardedCaseIdsSync(envelopeCaseIds: string[]): string[] {
    if (envelopeCaseIds.length > 0) return envelopeCaseIds;
    try {
        return collectCriminalCaseShardIdsFromKeys(SecureStoreService.listKeysSync());
    } catch {
        return [];
    }
}
