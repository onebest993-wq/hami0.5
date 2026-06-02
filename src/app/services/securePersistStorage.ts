import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import SecureStoreService from '@/app/services/SecureStoreService';

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

    if (storageKey === 'lawyer-execution-files' || storageKey === 'hami:execution-dashboard') {
        const incomingCount = countArrayItemsInPersistPayload(incomingRaw, 'files');
        const existingCount = countArrayItemsInPersistPayload(existingRaw, 'files');
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
            await SecureStoreService.ensurePersistedReady();
            return SecureStoreService.getItem(name);
        },
        setItem: async (name: string, value: string) => {
            await SecureStoreService.ensurePersistedReady();
            try {
                const existing = await SecureStoreService.getItem(name);
                if (wipeGuard(value, existing, name)) return;
            } catch {
                /* ignore guard errors */
            }
            await SecureStoreService.setItem(name, value);
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
