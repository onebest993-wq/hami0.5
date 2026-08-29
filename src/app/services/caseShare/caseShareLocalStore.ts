import type { CaseShareRecord } from './caseShareTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export const CASE_SHARE_LOCAL_KEY = 'hami:case-shares:v1';

function useInMemoryTestStore(): boolean {
    return import.meta.env.MODE === 'test' || import.meta.env.VITEST === true || typeof window === 'undefined';
}

function getTestStore(): CaseShareRecord[] {
    const g = globalThis as unknown as { __HAMI_CASE_SHARES?: CaseShareRecord[] };
    if (!Array.isArray(g.__HAMI_CASE_SHARES)) g.__HAMI_CASE_SHARES = [];
    return g.__HAMI_CASE_SHARES;
}

function parseShareRows(raw: string | null): CaseShareRecord[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as CaseShareRecord[]) : [];
    } catch {
        return [];
    }
}

export async function loadCaseShareRecords(): Promise<CaseShareRecord[]> {
    if (useInMemoryTestStore()) {
        return [...getTestStore()];
    }
    try {
        const drained = readSecureOrDrainLegacySync(CASE_SHARE_LOCAL_KEY);
        const raw = drained ?? (await SecureStoreService.getItem(CASE_SHARE_LOCAL_KEY));
        return parseShareRows(raw);
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
        const payload = JSON.stringify(rows);
        await SecureStoreService.setItem(CASE_SHARE_LOCAL_KEY, payload);
        clearLegacyPlaintextMirror(CASE_SHARE_LOCAL_KEY);
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
        await SecureStoreService.deleteItem(CASE_SHARE_LOCAL_KEY);
    } catch {
        /* silent */
    }
    clearLegacyPlaintextMirror(CASE_SHARE_LOCAL_KEY);
}
