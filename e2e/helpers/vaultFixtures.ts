import type { Page } from '@playwright/test';
import { applyE2eBootHomeLayoutAtRuntime, bootToLawyerHome, gotoAppPath } from './bootFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';

export const VAULT_DOCS_KEY = 'hami:smartvault:docs:v1';
export const VAULT_CATEGORIES_KEY = 'hami:smartvault:custom-categories:v1';
/** يطابق جلسة Vite/E2E عند VITE_SHELL_AUTH_OPEN — لا `dev-user-uuid-1` */
export const E2E_VAULT_USER_ID = 'guest-lawyer-1';

type E2eVaultDoc = {
    id: string;
    title: string;
    type: 'pdf' | 'image';
    tags: string[];
    authorId: string;
    createdAt: string;
    updatedAt: string;
    fileSize: number;
    fileName: string;
    mimeType: string;
    storagePath: string;
    signedUrl: string | null;
    customCategory?: string | null;
    isProcessing?: boolean;
    boundDossierId?: string | null;
};

export function buildE2eVaultDoc(overrides: Partial<E2eVaultDoc> = {}): E2eVaultDoc {
    const now = new Date().toISOString();
    return {
        id: 'e2e-vault-doc-1',
        title: 'وثيقة E2E مخزن',
        type: 'pdf',
        tags: [],
        authorId: E2E_VAULT_USER_ID,
        createdAt: now,
        updatedAt: now,
        fileSize: 2048,
        fileName: 'e2e-test.pdf',
        mimeType: 'application/pdf',
        storagePath: 'local:vault:e2e-test',
        signedUrl: null,
        customCategory: 'عقود E2E',
        isProcessing: false,
        boundDossierId: null,
        ...overrides,
    };
}

export async function clearVaultStorage(page: Page) {
    await page.addInitScript(
        ({ docsKey, categoriesKey }) => {
            localStorage.removeItem(docsKey);
            localStorage.removeItem(categoriesKey);
        },
        { docsKey: VAULT_DOCS_KEY, categoriesKey: VAULT_CATEGORIES_KEY },
    );
}

export async function hydrateVaultDocsForE2E(page: Page, docs: E2eVaultDoc[] = [buildE2eVaultDoc()]) {
    const stamped = docs.map((doc) => ({
        ...doc,
        authorId: doc.authorId?.trim() || E2E_VAULT_USER_ID,
    }));
    const payload = JSON.stringify(stamped);
    await writeE2eSecureStoreKey(page, VAULT_DOCS_KEY, payload);
    await page.evaluate(
        async ({ docsKey, json, userId }) => {
            try {
                localStorage.setItem(docsKey, json);
            } catch {
                /* ignore */
            }
            const bridge = (
                window as Window & {
                    __hamiE2eSecureStore?: { setItem: (key: string, value: string) => Promise<void> };
                }
            ).__hamiE2eSecureStore;
            try {
                await bridge?.setItem(docsKey, json);
            } catch {
                /* ignore */
            }
            window.dispatchEvent(
                new CustomEvent('hami:smart-vault-docs-updated', {
                    detail: { userId, docs: JSON.parse(json) as unknown[] },
                }),
            );
        },
        { docsKey: VAULT_DOCS_KEY, json: payload, userId: E2E_VAULT_USER_ID },
    );
}

export async function seedVaultDocs(page: Page, docs: E2eVaultDoc[] = [buildE2eVaultDoc()]) {
    const stamped = docs.map((doc) => ({
        ...doc,
        authorId: doc.authorId?.trim() || E2E_VAULT_USER_ID,
    }));
    const payload = JSON.stringify(stamped);
    await page.addInitScript(
        ({ docsKey, raw, dbName, dbVersion, storeName }) => {
            localStorage.setItem(docsKey, raw);
            try {
                const req = indexedDB.open(dbName, dbVersion);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                };
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction(storeName, 'readwrite');
                    tx.objectStore(storeName).put(raw, docsKey);
                    tx.oncomplete = () => db.close();
                };
            } catch {
                /* ignore */
            }
        },
        {
            docsKey: VAULT_DOCS_KEY,
            raw: payload,
            dbName: 'hami-secure-store',
            dbVersion: 2,
            storeName: 'secure_kv',
        },
    );
}

/** إقلاع مع وثائق مخزن في SecureStore ثم reload */
export async function bootLawyerHomeWithVaultDocs(
    page: Page,
    docs: E2eVaultDoc[] = [buildE2eVaultDoc()],
): Promise<void> {
    await seedVaultDocs(page, docs);
    await gotoAppPath(page, '/');
    await hydrateVaultDocsForE2E(page, docs);
    await gotoAppPath(page, `/?_hami_vault_e2e=${Date.now()}`);
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
}
