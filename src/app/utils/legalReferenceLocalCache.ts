import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

export const LEGAL_REFERENCE_CACHE_VERSION = 1;

/** مدة صلاحية الكاش المحلي — مزامنة خلفية فقط بعد انقضائها */
export const LEGAL_REFERENCE_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PersistedLawPayload<T> = {
    v: number;
    cachedAt: number;
    items: T[];
};

function storageKey(namespace: string): string {
    return `hami:legal-ref:${namespace}:v${LEGAL_REFERENCE_CACHE_VERSION}`;
}

export function readLegalReferenceCache<T>(namespace: string): T[] | null {
    const raw = persistenceRepository.load<PersistedLawPayload<T>>(storageKey(namespace));
    if (!raw || raw.v !== LEGAL_REFERENCE_CACHE_VERSION) return null;
    if (!Array.isArray(raw.items) || raw.items.length === 0) return null;
    return raw.items;
}

export function writeLegalReferenceCache<T>(namespace: string, items: readonly T[]): void {
    if (!Array.isArray(items) || items.length === 0) return;
    const payload: PersistedLawPayload<T> = {
        v: LEGAL_REFERENCE_CACHE_VERSION,
        cachedAt: Date.now(),
        items: [...items],
    };
    persistenceRepository.save(storageKey(namespace), payload);
}

export function getLegalReferenceCacheTimestamp(namespace: string): number | null {
    const raw = persistenceRepository.load<PersistedLawPayload<unknown>>(storageKey(namespace));
    if (!raw || raw.v !== LEGAL_REFERENCE_CACHE_VERSION) return null;
    return typeof raw.cachedAt === 'number' && Number.isFinite(raw.cachedAt) ? raw.cachedAt : null;
}

export function isLegalReferenceCacheStale(
    namespace: string,
    ttlMs: number = LEGAL_REFERENCE_DEFAULT_TTL_MS,
): boolean {
    const cachedAt = getLegalReferenceCacheTimestamp(namespace);
    if (cachedAt == null) return true;
    return Date.now() - cachedAt > ttlMs;
}

export function clearLegalReferenceCache(namespace: string): void {
    persistenceRepository.remove(storageKey(namespace));
}

/** للاختبارات */
export function resetLegalReferenceCacheForTests(namespace?: string): void {
    if (namespace) {
        clearLegalReferenceCache(namespace);
        return;
    }
    if (typeof localStorage === 'undefined') return;
    const prefix = `hami:legal-ref:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) {
        localStorage.removeItem(key);
    }
}
