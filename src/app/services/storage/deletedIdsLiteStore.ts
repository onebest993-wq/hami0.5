import { onDecryptedCacheWrite } from '@/app/services/storage/decryptedCacheNotify';
import {
    cancelDeletedIdsPersist,
    isDeletedIdsStorageUnreadSync,
    queueDeletedIdsPersist,
} from '@/app/services/storage/deletedIdsPersistBridge';

function parseDeletedIdList(raw: string | null | undefined, isValidKey: (k: string) => boolean): string[] {
    if (!raw?.trim()) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((k): k is string => typeof k === 'string' && isValidKey(k))
            : [];
    } catch {
        return [];
    }
}

/**
 * ذاكرة شواهد القبر لحارس المسح — بلا SecureStore.
 * التشفير عبر الجسر بعد أن يربط SecureStore نفسه.
 */
export function createDeletedIdsLiteStore(storageKey: string, isValidKey: (k: string) => boolean) {
    let memory: Set<string> | null = null;
    /** إضافات أثناء ciphertext بارد — تُدمَج عند فكّ التشفير دون مسح الأصل */
    let pendingWhileUnread: string[] = [];

    function hydrateFromRaw(raw: string | null | undefined): void {
        memory = new Set(parseDeletedIdList(raw, isValidKey));
        if (pendingWhileUnread.length > 0) {
            for (const id of pendingWhileUnread) {
                if (isValidKey(id)) memory.add(id);
            }
            pendingWhileUnread = [];
            queueDeletedIdsPersist(storageKey, [...memory]);
        }
    }

    onDecryptedCacheWrite((key, value) => {
        if (key === storageKey) hydrateFromRaw(value);
    });

    function read(): Set<string> {
        if (memory) return memory;
        if (typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem(storageKey);
                if (raw !== null) {
                    localStorage.removeItem(storageKey);
                    hydrateFromRaw(raw);
                    queueDeletedIdsPersist(storageKey, [...(memory ?? [])]);
                    return memory ?? new Set();
                }
            } catch {
                /* ignore */
            }
        }
        /*
         * أصل مشفّر بارد ≠ قائمة فارغة. تثبيت [] عبر الجسر يمسح شواهد القرص.
         * أعد مجموعة مؤقتة بلا تثبيت memory حتى يصل onDecryptedCacheWrite.
         */
        if (isDeletedIdsStorageUnreadSync(storageKey)) {
            return new Set(pendingWhileUnread.filter(isValidKey));
        }
        memory = new Set();
        return memory;
    }

    function persistSnapshot(): void {
        queueDeletedIdsPersist(storageKey, [...read()]);
    }

    return {
        storageKey,
        read,
        add(ids: string[]): void {
            if (isDeletedIdsStorageUnreadSync(storageKey) && !memory) {
                for (const id of ids) {
                    if (isValidKey(id)) pendingWhileUnread.push(id);
                }
                return;
            }
            const set = read();
            for (const id of ids) {
                if (isValidKey(id)) set.add(id);
            }
            persistSnapshot();
        },
        has(id: string): boolean {
            return read().has(id);
        },
        resetForTests(): void {
            memory = null;
            pendingWhileUnread = [];
            cancelDeletedIdsPersist(storageKey);
            if (typeof localStorage === 'undefined') return;
            try {
                localStorage.removeItem(storageKey);
            } catch {
                /* ignore */
            }
        },
    };
}
