import type { Page } from '@playwright/test';

export const VAULT_DOCS_KEY = 'hami:smartvault:docs:v1';
export const VAULT_CATEGORIES_KEY = 'hami:smartvault:custom-categories:v1';
export const E2E_VAULT_USER_ID = 'dev-user-uuid-1';

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

export async function seedVaultDocs(page: Page, docs: E2eVaultDoc[] = [buildE2eVaultDoc()]) {
    await page.addInitScript(
        ({ docsKey, payload }) => {
            localStorage.setItem(docsKey, JSON.stringify(payload));
        },
        { docsKey: VAULT_DOCS_KEY, payload: docs },
    );
}
