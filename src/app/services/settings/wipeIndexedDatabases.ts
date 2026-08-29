/**
 * مسح قواعد IndexedDB الحساسة عند wipe شامل للتطبيق.
 * لا يُعلن النجاح إذا رفض المتصفح الحذف أو بقي اتصال آخر يحجبه.
 */

const IDB_DELETE_TIMEOUT_MS = 5_000;

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
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            resolve();
            return;
        }
        let settled = false;
        let blocked = false;
        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            if (error) reject(error);
            else resolve();
        };
        const timeoutId = window.setTimeout(() => {
            finish(
                new Error(
                    blocked
                        ? `IndexedDB deletion blocked: ${name}`
                        : `IndexedDB deletion timed out: ${name}`,
                ),
            );
        }, IDB_DELETE_TIMEOUT_MS);
        try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => finish();
            req.onerror = () =>
                finish(req.error ?? new Error(`IndexedDB deletion failed: ${name}`));
            req.onblocked = () => {
                blocked = true;
            };
        } catch (error) {
            finish(
                error instanceof Error
                    ? error
                    : new Error(`IndexedDB deletion failed: ${name}`),
            );
        }
    });
}

export async function wipeApplicationIndexedDatabases(
    names: readonly string[] = APPLICATION_WIPE_IDB_NAMES,
): Promise<void> {
    await Promise.all(names.map((name) => deleteIndexedDatabase(name)));
}
