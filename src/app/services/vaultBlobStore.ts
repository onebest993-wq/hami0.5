const DB_NAME = 'hami-vault-blobs';

const DB_VERSION = 1;

const STORE = 'files';

const IDB_OPEN_TIMEOUT_MS = 12_000;

const IDB_READ_TIMEOUT_MS = 10_000;

const IDB_OPEN_RETRY_MS = 400;

const IDB_WRITE_TIMEOUT_MIN_MS = 12_000;

const IDB_WRITE_TIMEOUT_MAX_MS = 120_000;



type VaultBlobRow = {

    key: string;

    authorId: string;

    docId: string;

    mimeType: string;

    size: number;

    blob: Blob;

    updatedAt: string;

};



function rowKey(authorId: string, docId: string): string {

    return `${authorId.trim()}:${docId.trim()}`;

}



export function buildVaultIdbPath(userId: string, docId: string): string {

    return `idb:vault:${userId.trim()}:${docId.trim()}`;

}



export function isVaultIdbStoragePath(path: string | undefined | null): boolean {

    return (path || '').startsWith('idb:vault:');

}



export function parseVaultIdbPath(path: string): { userId: string; docId: string } | null {

    if (!isVaultIdbStoragePath(path)) return null;

    const parts = path.split(':');

    if (parts.length < 4) return null;

    const userId = parts[2]?.trim();

    const docId = parts.slice(3).join(':').trim();

    if (!userId || !docId) return null;

    return { userId, docId };

}



const testBlobStore = new Map<string, VaultBlobRow>();

const runtimeBlobStore = new Map<string, VaultBlobRow>();

const hotBlobCache = new Map<string, Blob>();



let blobWriteChain: Promise<void> = Promise.resolve();

function enqueueBlobMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = blobWriteChain.then(operation);
    blobWriteChain = result.then(
        () => undefined,
        () => undefined,
    );
    return result;
}



function shouldUseMemoryStore(): boolean {

    return import.meta.env.MODE === 'test' || import.meta.env.VITEST === true;

}



let cachedDb: IDBDatabase | null = null;

let openDbPromise: Promise<IDBDatabase | null> | null = null;



function resolveWriteTimeoutMs(blobSize: number): number {

    const perMbMs = 8_000;

    const estimated = Math.ceil(blobSize / (1024 * 1024)) * perMbMs;

    return Math.min(IDB_WRITE_TIMEOUT_MAX_MS, Math.max(IDB_WRITE_TIMEOUT_MIN_MS, estimated));

}



function openDbFresh(): Promise<IDBDatabase | null> {

    if (shouldUseMemoryStore()) return Promise.resolve(null);

    if (typeof indexedDB === 'undefined') return Promise.resolve(null);

    return new Promise((resolve) => {

        let settled = false;

        const finish = (db: IDBDatabase | null) => {

            if (settled) return;

            settled = true;

            clearTimeout(timer);

            resolve(db);

        };

        const timer = setTimeout(() => finish(null), IDB_OPEN_TIMEOUT_MS);

        try {

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => finish(null);

            request.onsuccess = () => finish(request.result);

            request.onupgradeneeded = () => {

                const db = request.result;

                if (!db.objectStoreNames.contains(STORE)) {

                    db.createObjectStore(STORE, { keyPath: 'key' });

                }

            };

        } catch {

            finish(null);

        }

    });

}



function getDb(): Promise<IDBDatabase | null> {

    if (shouldUseMemoryStore()) return Promise.resolve(null);

    if (cachedDb) return Promise.resolve(cachedDb);

    if (!openDbPromise) {

        openDbPromise = openDbFresh()

            .then(async (db) => {

                if (!db) {

                    await new Promise((r) => setTimeout(r, IDB_OPEN_RETRY_MS));

                    db = await openDbFresh();

                }

                if (db) {

                    cachedDb = db;

                    db.onversionchange = () => {

                        cachedDb = null;

                        openDbPromise = null;

                        db.close();

                    };

                } else {

                    openDbPromise = null;

                }

                return db;

            })

            .catch(() => {

                openDbPromise = null;

                return null;

            });

    }

    return openDbPromise;

}



/** تسخين اتصال IDB — يُستدعى عند فتح المستودع أو اختيار ملف */

export function prefetchVaultBlobStore(): void {

    if (typeof window === 'undefined') return;

    void getDb();

}



/** يجعل الملف متاحاً فوراً للمعاينة قبل اكتمال كتابة IDB */

export function primeVaultBlobCache(authorId: string, docId: string, blob: Blob): void {

    hotBlobCache.set(rowKey(authorId, docId), blob);

}

/** قراءة متزامنة من الذاكرة — للمعاينة الفورية */
export function peekVaultBlob(authorId: string, docId: string): Blob | null {
    const key = rowKey(authorId, docId);
    const hot = hotBlobCache.get(key);
    if (hot) return hot;
    return runtimeBlobStore.get(key)?.blob ?? null;
}



function persistRuntimeBlobRow(row: VaultBlobRow): void {

    runtimeBlobStore.set(row.key, row);

}



function writeVaultBlobRowToIdb(row: VaultBlobRow, db: IDBDatabase): Promise<void> {

    const writeTimeoutMs = resolveWriteTimeoutMs(row.size);

    return new Promise<void>((resolve, reject) => {

        let settled = false;

        const finish = (error?: Error | null) => {

            if (settled) return;

            settled = true;

            clearTimeout(timer);

            if (error) reject(error);

            else resolve();

        };

        const timer = setTimeout(() => finish(new Error('vault blob write timeout')), writeTimeoutMs);

        const tx = db.transaction(STORE, 'readwrite');

        tx.oncomplete = () => finish();

        tx.onerror = () => finish(tx.error ?? new Error('vault blob write failed'));

        tx.onabort = () => finish(tx.error ?? new Error('vault blob write aborted'));

        tx.objectStore(STORE).put(row);

    });

}



function writeVaultBlobRow(row: VaultBlobRow): Promise<void> {

    if (shouldUseMemoryStore()) {

        testBlobStore.set(row.key, row);

        return Promise.resolve();

    }



    return getDb()

        .then((db) => {

            if (!db) {

                persistRuntimeBlobRow(row);

                return;

            }

            return writeVaultBlobRowToIdb(row, db).catch(() => {

                persistRuntimeBlobRow(row);

            });

        })

        .catch(() => {

            persistRuntimeBlobRow(row);

        });

}



function buildVaultBlobRow(
    authorId: string,
    docId: string,
    blob: Blob,
    mimeType: string,
): VaultBlobRow {
    const key = rowKey(authorId, docId);
    return {
        key,
        authorId: authorId.trim(),
        docId: docId.trim(),
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        blob,
        updatedAt: new Date().toISOString(),
    };
}

export function putVaultBlob(

    authorId: string,

    docId: string,

    blob: Blob,

    mimeType: string,

): Promise<void> {

    const row = buildVaultBlobRow(authorId, docId, blob, mimeType);



    primeVaultBlobCache(authorId, docId, blob);



    return enqueueBlobMutation(() => writeVaultBlobRow(row));

}

/**
 * Restore-only durable write. Unlike the interactive upload path, this does
 * not degrade to an in-memory row that would disappear after app restart.
 */
export async function putVaultBlobVerified(
    authorId: string,
    docId: string,
    blob: Blob,
    mimeType: string,
): Promise<void> {
    const row = buildVaultBlobRow(authorId, docId, blob, mimeType);
    if (shouldUseMemoryStore()) {
        testBlobStore.set(row.key, row);
        primeVaultBlobCache(authorId, docId, blob);
        return;
    }
    await enqueueBlobMutation(async () => {
        const db = await getDb();
        if (!db) throw new Error('vault blob database unavailable');
        await writeVaultBlobRowToIdb(row, db);
        runtimeBlobStore.delete(row.key);
        primeVaultBlobCache(authorId, docId, blob);
    });
}



export function waitForVaultBlobWrites(): Promise<void> {

    return blobWriteChain;

}



export async function getVaultBlob(authorId: string, docId: string): Promise<Blob | null> {

    const key = rowKey(authorId, docId);

    const hot = hotBlobCache.get(key);

    if (hot) return hot;



    const runtime = runtimeBlobStore.get(key);

    if (runtime) return runtime.blob;



    if (shouldUseMemoryStore()) {

        return testBlobStore.get(key)?.blob ?? null;

    }



    const db = await getDb();

    if (!db) return null;

    return Promise.race<Blob | null>([
        new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = () => {
                const row = req.result as VaultBlobRow | undefined;
                resolve(row?.blob ?? null);
            };
            req.onerror = () => resolve(null);
        }),
        new Promise((resolve) => {
            window.setTimeout(() => resolve(null), IDB_READ_TIMEOUT_MS);
        }),
    ]);
}



export async function getVaultBlobObjectUrl(
    authorId: string,
    docId: string,
    options?: { mimeType?: string | null },
): Promise<string | null> {

    const blob = await getVaultBlob(authorId, docId);

    if (!blob) return null;

    const hinted = (options?.mimeType || '').toLowerCase();
    if (hinted === 'application/pdf' && blob.type !== 'application/pdf') {
        return URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    }

    return URL.createObjectURL(blob);

}



export async function deleteVaultBlob(authorId: string, docId: string): Promise<void> {

    const key = rowKey(authorId, docId);

    hotBlobCache.delete(key);

    runtimeBlobStore.delete(key);

    if (shouldUseMemoryStore()) {

        testBlobStore.delete(key);

        return;

    }



    await enqueueBlobMutation(async () => {
        hotBlobCache.delete(key);
        runtimeBlobStore.delete(key);
        const db = await getDb();
        if (!db) return;
        await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.objectStore(STORE).delete(key);
        });
    });
}

export async function deleteVaultBlobVerified(authorId: string, docId: string): Promise<void> {
    const key = rowKey(authorId, docId);
    hotBlobCache.delete(key);
    runtimeBlobStore.delete(key);
    if (shouldUseMemoryStore()) {
        testBlobStore.delete(key);
        return;
    }
    await enqueueBlobMutation(async () => {
        hotBlobCache.delete(key);
        runtimeBlobStore.delete(key);
        const db = await getDb();
        if (!db) throw new Error('vault blob database unavailable');
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('vault blob delete failed'));
            tx.onabort = () => reject(tx.error ?? new Error('vault blob delete aborted'));
            tx.objectStore(STORE).delete(key);
        });
    });
}



export async function deleteVaultBlobByPath(storagePath: string | undefined | null): Promise<void> {

    const parsed = parseVaultIdbPath(storagePath || '');

    if (!parsed) return;

    await deleteVaultBlob(parsed.userId, parsed.docId);

}



export async function clearAllVaultBlobs(): Promise<void> {
    hotBlobCache.clear();
    runtimeBlobStore.clear();
    if (shouldUseMemoryStore()) {
        testBlobStore.clear();
        return;
    }
    await enqueueBlobMutation(async () => {
        // A queued write may have repopulated the hot cache before this barrier.
        hotBlobCache.clear();
        runtimeBlobStore.clear();
        const db = await getDb();
        if (!db) throw new Error('vault blob database unavailable');
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('vault blob clear failed'));
            tx.onabort = () => reject(tx.error ?? new Error('vault blob clear aborted'));
            tx.objectStore(STORE).clear();
        });
        db.close();
        if (cachedDb === db) cachedDb = null;
        openDbPromise = null;
    });
}



export function clearVaultBlobTestStore(): void {

    testBlobStore.clear();

}



export function resetVaultBlobStoreForTests(): void {

    cachedDb = null;

    openDbPromise = null;

    testBlobStore.clear();

    runtimeBlobStore.clear();

    hotBlobCache.clear();

    blobWriteChain = Promise.resolve();

}



export { resolveWriteTimeoutMs as resolveVaultBlobWriteTimeoutMs };

