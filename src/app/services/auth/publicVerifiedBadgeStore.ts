const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cache = new Map<string, boolean>();
const listeners = new Set<() => void>();
const queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInflight: Promise<void> | null = null;

function emit(): void {
    for (const listener of listeners) listener();
}

export function isPublicVerifiedBadgeSubject(userId: string): boolean {
    return UUID_RE.test(userId.trim());
}

export function peekPublicVerifiedBadge(userId?: string | null): boolean {
    const id = String(userId ?? '').trim();
    if (!id) return false;
    return cache.get(id) === true;
}

export function writePublicVerifiedBadge(userId: string, shown: boolean): void {
    const id = String(userId ?? '').trim();
    if (!id) return;
    const next = shown === true;
    if (cache.get(id) === next) return;
    cache.set(id, next);
    emit();
}

export function subscribePublicVerifiedBadge(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function resetPublicVerifiedBadgeStoreForTests(): void {
    cache.clear();
    queued.clear();
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    flushInflight = null;
}

function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushQueuedBadges();
    }, 16);
}

export function requestPublicVerifiedBadge(userId?: string | null): void {
    const id = String(userId ?? '').trim();
    if (!id || cache.has(id) || !isPublicVerifiedBadgeSubject(id)) return;
    queued.add(id);
    scheduleFlush();
}

async function flushQueuedBadges(): Promise<void> {
    if (flushInflight) {
        await flushInflight;
        if (queued.size > 0) scheduleFlush();
        return;
    }
    const ids = [...queued];
    queued.clear();
    if (ids.length === 0) return;
    flushInflight = (async () => {
        try {
            const { fetchPublicVerifiedBadges } = await import(
                '@/app/services/auth/publicVerifiedBadgeRemote'
            );
            const badges = await fetchPublicVerifiedBadges(ids);
            let changed = false;
            for (const id of ids) {
                const shown = badges[id] === true;
                if (cache.get(id) !== shown) {
                    cache.set(id, shown);
                    changed = true;
                }
            }
            if (changed) emit();
        } catch {
            /* تبقى القيمة السابقة أو مخفية */
        } finally {
            flushInflight = null;
        }
    })();
    await flushInflight;
}
