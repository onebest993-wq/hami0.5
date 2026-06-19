const DB_NAME = 'hami-vault-blobs';
const DB_VERSION = 1;
const STORE = 'files';

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

export async function putVaultBlob(
    authorId: string,
    docId: string,
    blob: Blob,
    mimeType: string,
): Promise<void> {
    const db = await openDb();
    if (!db) throw new Error('vault blob store unavailable');

    const key = rowKey(authorId, docId);
    const row: VaultBlobRow = {
        key,
        authorId: authorId.trim(),
        docId: docId.trim(),
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        blob,
        updatedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('vault blob write failed'));
        tx.objectStore(STORE).put(row);
    });
}

export async function getVaultBlob(authorId: string, docId: string): Promise<Blob | null> {
    const db = await openDb();
    if (!db) return null;

    const key = rowKey(authorId, docId);
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => {
            const row = req.result as VaultBlobRow | undefined;
            resolve(row?.blob ?? null);
        };
        req.onerror = () => resolve(null);
    });
}

export async function getVaultBlobObjectUrl(authorId: string, docId: string): Promise<string | null> {
    const blob = await getVaultBlob(authorId, docId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

export async function deleteVaultBlob(authorId: string, docId: string): Promise<void> {
    const db = await openDb();
    if (!db) return;

    const key = rowKey(authorId, docId);
    await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.objectStore(STORE).delete(key);
    });
}

export async function deleteVaultBlobByPath(storagePath: string | undefined | null): Promise<void> {
    const parsed = parseVaultIdbPath(storagePath || '');
    if (!parsed) return;
    await deleteVaultBlob(parsed.userId, parsed.docId);
}

export async function clearAllVaultBlobs(): Promise<void> {
    const db = await openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.objectStore(STORE).clear();
    });
}
