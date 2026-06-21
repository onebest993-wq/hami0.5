import type { BackupDomain, DossierSnapshotMeta } from './dossierPersistenceTypes';

const DB_NAME = 'hami-dossier-backups';
const DB_VERSION = 1;
const STORE = 'snapshots';
const MAX_SNAPSHOTS_PER_DOMAIN = 8;

type SnapshotRecord = {
    meta: DossierSnapshotMeta;
    payload: unknown[];
};

function openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

function snapshotKey(domain: BackupDomain, revision: number): string {
    return `${domain}:rev:${revision}`;
}

export async function readLatestDossierBackup(domain: BackupDomain): Promise<SnapshotRecord | null> {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAllKeys();
        req.onsuccess = () => {
            const prefix = `${domain}:rev:`;
            const keys = (req.result as unknown[])
                .filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
                .sort()
                .reverse();
            if (keys.length === 0) {
                resolve(null);
                return;
            }
            const getReq = tx.objectStore(STORE).get(keys[0]!);
            getReq.onsuccess = () => {
                const rec = getReq.result as SnapshotRecord | undefined;
                resolve(rec && Array.isArray(rec.payload) ? rec : null);
            };
            getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
        tx.onerror = () => db.close();
    });
}

export async function writeDossierBackup(
    domain: BackupDomain,
    payload: unknown[],
    revision: number,
): Promise<void> {
    if (!Array.isArray(payload) || payload.length === 0) return;
    const db = await openDb();
    if (!db) return;

    const record: SnapshotRecord = {
        meta: {
            domain,
            revision,
            savedAt: new Date().toISOString(),
            itemCount: payload.length,
        },
        payload,
    };

    await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record, snapshotKey(domain, revision));
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onabort = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            resolve();
        };
    });

    await pruneOldSnapshots(domain);
}

async function pruneOldSnapshots(domain: BackupDomain): Promise<void> {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const req = store.getAllKeys();
        req.onsuccess = () => {
            const prefix = `${domain}:rev:`;
            const keys = (req.result as unknown[])
                .filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
                .sort()
                .reverse();
            keys.slice(MAX_SNAPSHOTS_PER_DOMAIN).forEach((k) => store.delete(k));
        };
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onabort = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            resolve();
        };
    });
}
