const LOCAL_DEBUG_EVENT_STORAGE_KEY = 'hami:enable-local-debug-events';
const LOCAL_DEBUG_EVENT_HOSTS = new Set(['127.0.0.1:7777', '127.0.0.1:7778']);

function resolveUrl(rawUrl: string): URL | null {
    const base =
        typeof window !== 'undefined' && typeof window.location?.origin === 'string'
            ? window.location.origin
            : 'http://localhost';
    try {
        return new URL(rawUrl, base);
    } catch {
        return null;
    }
}

function isLocalDebugEventUrl(rawUrl: string): boolean {
    const resolved = resolveUrl(rawUrl);
    if (!resolved) return false;
    return resolved.pathname === '/event' && LOCAL_DEBUG_EVENT_HOSTS.has(resolved.host);
}

function isLocalDebugEventNetworkEnabled(): boolean {
    const globalFlag = (
        globalThis as typeof globalThis & { __HAMI_ENABLE_LOCAL_DEBUG_EVENTS__?: unknown }
    ).__HAMI_ENABLE_LOCAL_DEBUG_EVENTS__;
    if (globalFlag === true) return true;

    if (typeof window === 'undefined') return false;
    try {
        const stored = window.localStorage.getItem(LOCAL_DEBUG_EVENT_STORAGE_KEY)?.trim().toLowerCase();
        return stored === '1' || stored === 'true' || stored === 'on';
    } catch {
        return false;
    }
}

/** Local Vite debug `/event` probes — 204 unless explicitly enabled. */
export function shouldShortCircuitLocalDebugEvent(rawUrl: string): boolean {
    return isLocalDebugEventUrl(rawUrl) && !isLocalDebugEventNetworkEnabled();
}

export function resetWifeLocalDebugEventStateForTests(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem(LOCAL_DEBUG_EVENT_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }
    delete (globalThis as typeof globalThis & { __HAMI_ENABLE_LOCAL_DEBUG_EVENTS__?: unknown })
        .__HAMI_ENABLE_LOCAL_DEBUG_EVENTS__;
}
