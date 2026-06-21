const DB_NAME = 'hami-voice-notes';
const DB_VERSION = 1;
const STORE = 'blobs';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    });
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return openDb().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE, mode);
                const store = tx.objectStore(STORE);
                const req = fn(store);
                req.onsuccess = () => resolve(req.result as T);
                req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
                tx.oncomplete = () => db.close();
                tx.onerror = () => {
                    db.close();
                    reject(tx.error ?? new Error('IndexedDB transaction failed'));
                };
            }),
    );
}

const testBlobStore = new Map<string, Blob>();

function useMemoryStore(): boolean {
    return import.meta.env.MODE === 'test' || import.meta.env.VITEST === true;
}

export async function putVoiceBlob(noteId: string, blob: Blob): Promise<void> {
    const key = String(noteId);
    if (useMemoryStore()) {
        testBlobStore.set(key, blob);
        return;
    }
    await withStore('readwrite', (store) => store.put(blob, key));
}

export async function getVoiceBlob(noteId: string): Promise<Blob | null> {
    const key = String(noteId);
    if (useMemoryStore()) {
        return testBlobStore.get(key) ?? null;
    }
    try {
        const hit = await withStore<Blob | undefined>('readonly', (store) => store.get(key));
        return hit ?? null;
    } catch {
        return null;
    }
}

export async function deleteVoiceBlob(noteId: string): Promise<void> {
    const key = String(noteId);
    if (useMemoryStore()) {
        testBlobStore.delete(key);
        return;
    }
    try {
        await withStore('readwrite', (store) => store.delete(key));
    } catch {
        /* silent */
    }
}

export async function getVoiceObjectUrl(noteId: string): Promise<string | null> {
    const blob = await getVoiceBlob(noteId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

export function clearVoiceBlobTestStore(): void {
    testBlobStore.clear();
}
