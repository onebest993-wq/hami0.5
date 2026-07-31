const wifeSigningKeyCache = new Map<string, Promise<CryptoKey>>();
const wifeSigningKeyCacheOrder: string[] = [];
const MAX_WIFE_SIGNING_CACHE_SESSIONS = 4;

export function getCachedWifeSigningKey(sessionId: string): Promise<CryptoKey> | undefined {
    return wifeSigningKeyCache.get(sessionId);
}

export function setCachedWifeSigningKey(sessionId: string, keyPromise: Promise<CryptoKey>): void {
    wifeSigningKeyCache.set(sessionId, keyPromise);
    touchCachedWifeSigningSession(sessionId);
}

export function touchCachedWifeSigningSession(sessionId: string): void {
    const existingIdx = wifeSigningKeyCacheOrder.indexOf(sessionId);
    if (existingIdx >= 0) wifeSigningKeyCacheOrder.splice(existingIdx, 1);
    wifeSigningKeyCacheOrder.push(sessionId);
    while (wifeSigningKeyCacheOrder.length > MAX_WIFE_SIGNING_CACHE_SESSIONS) {
        const evicted = wifeSigningKeyCacheOrder.shift();
        if (evicted) wifeSigningKeyCache.delete(evicted);
    }
}

export function clearWifeSigningKeyCache(sessionId?: string): void {
    if (!sessionId) {
        wifeSigningKeyCache.clear();
        wifeSigningKeyCacheOrder.length = 0;
        return;
    }
    wifeSigningKeyCache.delete(sessionId);
    const index = wifeSigningKeyCacheOrder.indexOf(sessionId);
    if (index >= 0) wifeSigningKeyCacheOrder.splice(index, 1);
}
