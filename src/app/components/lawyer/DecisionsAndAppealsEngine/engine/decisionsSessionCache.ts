import type { Decision } from '../types';

const memoryCache = new Map<string, Decision[]>();
const SESSION_PREFIX = 'hami:decisions-cache:v1:';

function normalizeCacheKey(executionId: string | undefined): string | null {
    const id = String(executionId ?? '').trim();
    if (!id || id === 'default' || id === 'undefined') return null;
    return id;
}

function readPersistedSnapshot(key: string): Decision[] | undefined {
    try {
        if (typeof sessionStorage === 'undefined') return undefined;
        const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return undefined;
        return parsed as Decision[];
    } catch {
        return undefined;
    }
}

function writePersistedSnapshot(key: string, rows: Decision[]): void {
    try {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(`${SESSION_PREFIX}${key}`, JSON.stringify(rows));
    } catch {
        /* quota / private mode */
    }
}

function clearPersistedSnapshot(key: string): void {
    try {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
    } catch {
        /* ignore */
    }
}

/** لقطة جلسة — ذاكرة + sessionStorage (تنجو من إعادة تحميل الصفحة) */
export function readDecisionsSessionCache(executionId: string | undefined): Decision[] | undefined {
    const key = normalizeCacheKey(executionId);
    if (!key) return undefined;

    const mem = memoryCache.get(key);
    if (mem && mem.length > 0) {
        return mem.map((d) => ({ ...d }));
    }

    const persisted = readPersistedSnapshot(key);
    if (persisted?.length) {
        memoryCache.set(key, persisted.map((d) => ({ ...d })));
        return persisted.map((d) => ({ ...d }));
    }

    return mem && mem.length === 0 ? [] : undefined;
}

/** أفضل لقطة جلسة من بين عدة معرّفات محتملة */
export function readDecisionsSessionCacheBest(
    candidateIds: string[]
): Decision[] | undefined {
    let best: Decision[] | undefined;
    for (const id of candidateIds) {
        const hit = readDecisionsSessionCache(id);
        if (!hit?.length) continue;
        if (!best || hit.length > best.length) {
            best = hit;
        }
    }
    return best;
}

export function writeDecisionsSessionCache(
    executionId: string | undefined,
    rows: Decision[],
    aliasIds?: string[]
): void {
    const snapshot = rows.map((d) => ({ ...d }));
    const keys = new Set<string>();
    const primary = normalizeCacheKey(executionId);
    if (primary) keys.add(primary);
    for (const raw of aliasIds ?? []) {
        const k = normalizeCacheKey(raw);
        if (k) keys.add(k);
    }
    for (const key of keys) {
        memoryCache.set(key, snapshot);
        writePersistedSnapshot(key, snapshot);
    }
}

export function clearDecisionsSessionCache(executionId: string | undefined): void {
    const key = normalizeCacheKey(executionId);
    if (!key) return;
    memoryCache.delete(key);
    clearPersistedSnapshot(key);
}

/** للاختبارات — مسح الذاكرة الداخلية فقط (يبقي sessionStorage) */
export function clearDecisionsMemoryCacheOnlyForTests(): void {
    memoryCache.clear();
}

/** للاختبارات — مسح كل اللقطات */
export function clearAllDecisionsSessionCachesForTests(): void {
    memoryCache.clear();
    try {
        if (typeof sessionStorage === 'undefined') return;
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k?.startsWith(SESSION_PREFIX)) toRemove.push(k);
        }
        for (const k of toRemove) sessionStorage.removeItem(k);
    } catch {
        /* ignore */
    }
}
