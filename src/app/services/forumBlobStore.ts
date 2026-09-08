import { unwrapForumBlobFromAtRest, wrapForumBlobForAtRest } from '@/app/services/forum/forumBlobAtRest';

export {
    FORUM_IDB_PREFIX,
    buildForumIdbPath,
    parseForumIdbPath,
} from '@/app/services/forumBlobPath';

const DB_NAME = 'hami-forum-blobs';
const DB_VERSION = 1;
const STORE = 'attachments';

type ForumBlobRow = {
    key: string;
    mimeType: string;
    size: number;
    blob: Blob;
    updatedAt: string;
    encrypted?: boolean;
};

function openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => resolve(null);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'key' });
                }
            };
        } catch {
            resolve(null);
        }
    });
}

function writeForumBlobRow(db: IDBDatabase, row: ForumBlobRow): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error ?? new Error('forum blob write failed'));
        };
        tx.onabort = () => {
            db.close();
            reject(tx.error ?? new Error('forum blob write aborted'));
        };
        tx.objectStore(STORE).put(row);
    });
}

export async function putForumBlob(cacheKey: string, blob: Blob, mimeType: string): Promise<void> {
    const wrapped = await wrapForumBlobForAtRest(blob);
    const db = await openDb();
    if (!db) throw new Error('[services_forumblobstore_:forumblobstoreunav] forum blob store unavailable');

    const row: ForumBlobRow = {
        key: cacheKey.trim(),
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        blob: wrapped.blob,
        updatedAt: new Date().toISOString(),
        ...(wrapped.encrypted ? { encrypted: true } : {}),
    };

    await writeForumBlobRow(db, row);
}

export async function getForumBlob(
    cacheKey: string,
): Promise<{ blob: Blob; mimeType: string } | null> {
    const db = await openDb();
    if (!db) return null;

    const row = await new Promise<ForumBlobRow | null>((resolve) => {
        let value: ForumBlobRow | null = null;
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(cacheKey.trim());
        req.onsuccess = () => {
            value = (req.result as ForumBlobRow | undefined) ?? null;
        };
        req.onerror = () => {
            value = null;
        };
        tx.oncomplete = () => {
            db.close();
            resolve(value);
        };
        tx.onerror = () => {
            db.close();
            resolve(null);
        };
        tx.onabort = () => {
            db.close();
            resolve(null);
        };
    });

    if (!row?.blob) return null;
    const mimeType = row.mimeType || row.blob.type || 'application/octet-stream';
    const plain = await unwrapForumBlobFromAtRest({
        blob: row.blob,
        mimeType,
        encrypted: row.encrypted,
    });
    if (!plain) return null;
    if (!row.encrypted) {
        maybeUpgradeLegacyForumBlob(cacheKey, plain, mimeType);
    }
    return { blob: plain, mimeType };
}

function maybeUpgradeLegacyForumBlob(cacheKey: string, plain: Blob, mimeType: string): void {
    void (async () => {
        try {
            const wrapped = await wrapForumBlobForAtRest(plain);
            if (!wrapped.encrypted) return;
            const db = await openDb();
            if (!db) return;
            await writeForumBlobRow(db, {
                key: cacheKey.trim(),
                mimeType,
                size: plain.size,
                blob: wrapped.blob,
                updatedAt: new Date().toISOString(),
                encrypted: true,
            });
        } catch {
            /* fail-open: keep serving the plaintext already returned */
        }
    })();
}

export async function getForumBlobObjectUrl(cacheKey: string): Promise<string | null> {
    const row = await getForumBlob(cacheKey);
    if (!row) return null;
    return URL.createObjectURL(row.blob);
}

export async function deleteForumBlob(cacheKey: string): Promise<void> {
    const key = cacheKey.trim();
    if (!key) return;
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            resolve();
        };
        tx.onabort = () => {
            db.close();
            resolve();
        };
        tx.objectStore(STORE).delete(key);
    });
}
