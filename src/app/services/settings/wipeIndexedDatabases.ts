/**
 * مسح قواعد IndexedDB الحساسة عند wipe شامل للتطبيق.
 * Best-effort: onblocked/onerror لا يوقفان المسح.
 */

export const APPLICATION_WIPE_IDB_NAMES = [
    'hami-crypto-keystore',
    'hami-dossier-backups',
    'hami-secure-store',
    'hami-vault-blobs',
    'hami-voice-notes',
    'hami-forum-blobs',
    'HamiTokenBlacklist',
    'HamiStolenTokenRegistry',
    'HamiRateLimitDB',
] as const;

export function deleteIndexedDatabase(name: string): Promise<void> {
    return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
            resolve();
            return;
        }
        try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
        } catch {
            resolve();
        }
    });
}

export async function wipeApplicationIndexedDatabases(
    names: readonly string[] = APPLICATION_WIPE_IDB_NAMES,
): Promise<void> {
    await Promise.all(names.map((name) => deleteIndexedDatabase(name)));
}
