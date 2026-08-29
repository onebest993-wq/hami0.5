import type { Page } from '@playwright/test';

/** يطابق SecureStoreService.WEB_DB_VERSION — فتح الإصدار 1 يفشل بعد ترقية التطبيق إلى 2. */
export const HAMI_SECURE_STORE_DB = 'hami-secure-store';
export const HAMI_SECURE_STORE_VERSION = 2;
export const HAMI_SECURE_KV_STORE = 'secure_kv';

/** يكتب مفتاحاً في localStorage + IndexedDB (hami-secure-store) لقراءة SecureStoreService. */
export async function writeE2eSecureStoreKey(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
        async ({ storageKey, storageValue, dbName, dbVersion, storeName }) => {
            try {
                localStorage.setItem(storageKey, storageValue);
            } catch {
                /* ignore */
            }

            await new Promise<void>((resolve) => {
                try {
                    const req = indexedDB.open(dbName, dbVersion);
                    req.onerror = () => resolve();
                    req.onupgradeneeded = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName);
                        }
                    };
                    req.onsuccess = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.close();
                            resolve();
                            return;
                        }
                        const tx = db.transaction(storeName, 'readwrite');
                        const putReq = tx.objectStore(storeName).put(storageValue, storageKey);
                        putReq.onerror = () => {
                            db.close();
                            resolve();
                        };
                        tx.oncomplete = () => {
                            db.close();
                            resolve();
                        };
                        tx.onerror = () => {
                            db.close();
                            resolve();
                        };
                    };
                } catch {
                    resolve();
                }
            });
        },
        {
            storageKey: key,
            storageValue: value,
            dbName: HAMI_SECURE_STORE_DB,
            dbVersion: HAMI_SECURE_STORE_VERSION,
            storeName: HAMI_SECURE_KV_STORE,
        },
    );
}
