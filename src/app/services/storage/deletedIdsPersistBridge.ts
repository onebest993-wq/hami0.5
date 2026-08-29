type PersistDeletedIds = (storageKey: string, ids: string[]) => void;
type IsUnreadSync = (storageKey: string) => boolean;

let persistDeletedIds: PersistDeletedIds | null = null;
let isUnreadSyncProbe: IsUnreadSync | null = null;
const pending = new Map<string, string[]>();
let persistEpoch = 0;

/**
 * يربطه SecureStore عند التحميل. وحدات شواهد القبر لا تستورد SecureStore —
 * وإلا أغلقت دائرة مع حارس المسح.
 */
export function bindDeletedIdsPersist(fn: PersistDeletedIds): void {
    persistDeletedIds = fn;
    for (const [key, ids] of pending) fn(key, ids);
    pending.clear();
}

/** فحص unread بلا دائرة استيراد مع SecureStore */
export function bindDeletedIdsUnreadProbe(fn: IsUnreadSync): void {
    isUnreadSyncProbe = fn;
}

export function isDeletedIdsStorageUnreadSync(storageKey: string): boolean {
    try {
        return isUnreadSyncProbe?.(storageKey) ?? false;
    } catch {
        return false;
    }
}

export function queueDeletedIdsPersist(storageKey: string, ids: string[]): void {
    const epoch = persistEpoch;
    const run = () => {
        if (epoch !== persistEpoch) return;
        persistDeletedIds?.(storageKey, ids);
    };
    if (persistDeletedIds) {
        queueMicrotask(run);
        return;
    }
    pending.set(storageKey, ids);
}

export function cancelDeletedIdsPersist(storageKey: string): void {
    persistEpoch += 1;
    pending.delete(storageKey);
}
