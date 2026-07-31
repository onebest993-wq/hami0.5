import type { Page } from '@playwright/test';

const WEB_DB_NAME = 'hami-secure-store';
const WEB_STORE_NAME = 'secure_kv';

/** يكتب مفتاحاً في localStorage + IndexedDB (hami-secure-store) لقراءة SecureStoreService. */
export async function writeE2eSecureStoreKey(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
        async ({ storageKey, storageValue, dbName, storeName }) => {
            try {
                localStorage.setItem(storageKey, storageValue);
            } catch {
                /* ignore */
            }

            await new Promise<void>((resolve) => {
                try {
                    const req = indexedDB.open(dbName, 1);
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
            dbName: WEB_DB_NAME,
            storeName: WEB_STORE_NAME,
        },
    );
}
