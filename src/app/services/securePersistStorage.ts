import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export type PersistWipeGuard = (incomingRaw: string, existingRaw: string | null, storageKey: string) => boolean;

function parsePersistRoot(raw: string | null | undefined): Record<string, unknown> | null {
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

function countCasesInPersistPayload(raw: string | null | undefined): number {
    const root = parsePersistRoot(raw);
    if (!root) return 0;
    // الصيغة المجزّأة (criminalShardedPersistStorage) تحذف casesById وتضع caseIds في الجذر.
    if (Array.isArray(root.caseIds)) return root.caseIds.length;
    const cases = (root.state as { casesById?: unknown } | undefined)?.casesById ?? root.casesById;
    return cases && typeof cases === 'object' ? Object.keys(cases as object).length : 0;
}

function countArrayItemsInPersistPayload(raw: string | null | undefined, field: string): number {
    const root = parsePersistRoot(raw);
    if (!root) return 0;
    const state = (root.state as Record<string, unknown> | undefined) ?? root;
    const value = state[field];
    return Array.isArray(value) ? value.length : 0;
}

/** يمنع استبدال حمولة غير فارغة بـ {} أو قوائم فارغة — خط الدفاع الأخير ضد فقدان الإضابير. */
export const defaultPersistWipeGuard: PersistWipeGuard = (incomingRaw, existingRaw, storageKey) => {
    if (!existingRaw?.trim()) return false;

    if (storageKey === 'hami:criminal:store') {
        return countCasesInPersistPayload(incomingRaw) === 0 && countCasesInPersistPayload(existingRaw) > 0;
    }

    if (storageKey === 'legal-cases-storage') {
        const incomingCount = countArrayItemsInPersistPayload(incomingRaw, 'cases');
        const existingCount = countArrayItemsInPersistPayload(existingRaw, 'cases');
        if (incomingCount === 0 && existingCount > 0) return true;
    }

    if (
        storageKey === 'execution-dashboard-storage' ||
        storageKey === 'hami:execution-dashboard'
    ) {
        const incomingCount =
            countArrayItemsInPersistPayload(incomingRaw, 'subFiles') +
            countArrayItemsInPersistPayload(incomingRaw, 'linkedDossiers');
        const existingCount =
            countArrayItemsInPersistPayload(existingRaw, 'subFiles') +
            countArrayItemsInPersistPayload(existingRaw, 'linkedDossiers');
        if (incomingCount === 0 && existingCount > 0) return true;
    }

    if (storageKey === 'lawyer-execution-files') {
        const incomingCount = countArrayItemsInPersistPayload(incomingRaw, 'files');
        const existingCount = countArrayItemsInPersistPayload(existingRaw, 'files');
        if (incomingCount === 0 && existingCount > 0) return true;
    }

    if (storageKey === 'hami:workspace:pins:v1') {
        const incomingCount = countArrayItemsInPersistPayload(incomingRaw, 'pinnedItems');
        const existingCount = countArrayItemsInPersistPayload(existingRaw, 'pinnedItems');
        if (incomingCount === 0 && existingCount > 0) return true;
    }

    const trimmed = incomingRaw.trim();
    if (trimmed === '' || trimmed === '{}' || trimmed === 'null') return true;

    return false;
};

/** تخزين Zustand غير متزامن — ينتظر IndexedDB قبل القراءة/الكتابة. */
export function createSecureStateStorage(options?: {
    wipeGuard?: PersistWipeGuard;
}): StateStorage {
    const wipeGuard = options?.wipeGuard ?? defaultPersistWipeGuard;

    return {
        getItem: async (name: string) => {
            await SecureStoreService.ensurePersistedReady?.();
            if (typeof SecureStoreService.getItem !== 'function') return null;
            const fromSecure = await SecureStoreService.getItem(name);
            if (fromSecure != null) {
                clearLegacyPlaintextMirror(name);
                return fromSecure;
            }
            try {
                return readSecureOrDrainLegacySync(name);
            } catch {
                return null;
            }
        },
        setItem: async (name: string, value: string) => {
            await SecureStoreService.ensurePersistedReady?.();
            if (typeof SecureStoreService.getItem !== 'function' || typeof SecureStoreService.setItem !== 'function') {
                return;
            }
            try {
                const existing = await SecureStoreService.getItem(name);
                if (wipeGuard(value, existing, name)) return;
            } catch {
                /* ignore guard errors */
            }
            await SecureStoreService.setItem(name, value);
            clearLegacyPlaintextMirror(name);
        },
        removeItem: async (name: string) => {
            await SecureStoreService.deleteItem(name);
        },
    };
}

export function createSecureJSONStorage<S>(options?: { wipeGuard?: PersistWipeGuard }) {
    return createJSONStorage<S>(() => createSecureStateStorage(options));
}

export { countCasesInPersistPayload };
