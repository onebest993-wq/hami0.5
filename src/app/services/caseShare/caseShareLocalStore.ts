import type { CaseShareRecord } from './caseShareTypes';

export const CASE_SHARE_LOCAL_KEY = 'hami:case-shares:v1';

function useInMemoryTestStore(): boolean {
    return import.meta.env.MODE === 'test' || import.meta.env.VITEST === true || typeof window === 'undefined';
}

function getTestStore(): CaseShareRecord[] {
    const g = globalThis as unknown as { __HAMI_CASE_SHARES?: CaseShareRecord[] };
    if (!Array.isArray(g.__HAMI_CASE_SHARES)) g.__HAMI_CASE_SHARES = [];
    return g.__HAMI_CASE_SHARES;
}

async function migrateLegacyPlaintextLocalStorage(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const legacy = window.localStorage.getItem(CASE_SHARE_LOCAL_KEY);
        if (!legacy) return;
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.ensurePersistedReady();
        await SecureStoreService.setItem(CASE_SHARE_LOCAL_KEY, legacy);
        window.localStorage.removeItem(CASE_SHARE_LOCAL_KEY);
    } catch {
        /* silent — SecureStore may reject if crypto unavailable */
    }
}

export async function loadCaseShareRecords(): Promise<CaseShareRecord[]> {
    if (useInMemoryTestStore()) {
        return [...getTestStore()];
    }
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.ensurePersistedReady();
        await migrateLegacyPlaintextLocalStorage();
        const raw = await SecureStoreService.getItem(CASE_SHARE_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as CaseShareRecord[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export async function saveCaseShareRecords(rows: CaseShareRecord[]): Promise<void> {
    if (useInMemoryTestStore()) {
        const g = globalThis as unknown as { __HAMI_CASE_SHARES?: CaseShareRecord[] };
        g.__HAMI_CASE_SHARES = rows;
        return;
    }
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.ensurePersistedReady();
        await SecureStoreService.setItem(CASE_SHARE_LOCAL_KEY, JSON.stringify(rows));
    } catch {
        /* silent */
    }
}

export async function clearCaseShareRecords(): Promise<void> {
    if (useInMemoryTestStore()) {
        getTestStore().length = 0;
        return;
    }
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.deleteItem(CASE_SHARE_LOCAL_KEY);
    } catch {
        /* silent */
    }
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem(CASE_SHARE_LOCAL_KEY);
        } catch {
            /* ignore */
        }
    }
}
