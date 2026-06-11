const DB_NAME = 'hami-forum-blobs';
const DB_VERSION = 1;
const STORE = 'attachments';

type ForumBlobRow = {
    key: string;
    mimeType: string;
    size: number;
    blob: Blob;
    updatedAt: string;
};

export const FORUM_IDB_PREFIX = 'idb:forum:';

export function buildForumIdbPath(cacheKey: string): string {
    return `${FORUM_IDB_PREFIX}${cacheKey.trim()}`;
}

export function parseForumIdbPath(path: string | undefined | null): string | null {
    if (!path?.startsWith(FORUM_IDB_PREFIX)) return null;
    const key = path.slice(FORUM_IDB_PREFIX.length).trim();
    return key || null;
}

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

export async function putForumBlob(cacheKey: string, blob: Blob, mimeType: string): Promise<void> {
    const db = await openDb();
    if (!db) throw new Error('forum blob store unavailable');

    const row: ForumBlobRow = {
        key: cacheKey.trim(),
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        blob,
        updatedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('forum blob write failed'));
        tx.objectStore(STORE).put(row);
    });
}

export async function getForumBlobObjectUrl(cacheKey: string): Promise<string | null> {
    const db = await openDb();
    if (!db) return null;

    const row = await new Promise<ForumBlobRow | null>((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(cacheKey.trim());
        req.onsuccess = () => resolve((req.result as ForumBlobRow | undefined) ?? null);
        req.onerror = () => resolve(null);
    });

    if (!row?.blob) return null;
    return URL.createObjectURL(row.blob);
}
