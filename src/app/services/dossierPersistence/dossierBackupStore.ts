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

/** كل النسخ الاحتياطية للمجال — الأحدث أولاً */
export async function listDossierBackups(domain: BackupDomain): Promise<SnapshotRecord[]> {
    const db = await openDb();
    if (!db) return [];
    return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => {
            const rows = (req.result as SnapshotRecord[])
                .filter(
                    (rec) =>
                        rec &&
                        Array.isArray(rec.payload) &&
                        rec.payload.length > 0 &&
                        String(rec.meta?.domain ?? '') === domain,
                )
                .sort((a, b) => (b.meta?.revision ?? 0) - (a.meta?.revision ?? 0));
            resolve(rows);
        };
        req.onerror = () => resolve([]);
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
        tx.onerror = () => db.close();
    });
}

export async function readLatestDossierBackup(domain: BackupDomain): Promise<SnapshotRecord | null> {
    const all = await listDossierBackups(domain);
    return all[0] ?? null;
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
