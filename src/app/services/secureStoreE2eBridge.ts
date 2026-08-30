import type SecureStoreService from '@/app/services/SecureStoreService';

/** جسر E2E للقراءة بعد التشفير — preview لا يستطيع import `/src/...` */
export function bindSecureStoreE2eBridge(store: typeof SecureStoreService): void {
    if (typeof window === 'undefined') return;
    if (import.meta.env.VITE_SHELL_AUTH_OPEN !== 'true') return;
    if (import.meta.env.VITEST) return;

    const w = window as Window & {
        __hamiE2eSecureStore?: {
            flushHeavyPersistPending: () => void;
            waitForAllPendingPersist: () => Promise<void>;
            ensurePersistedReady: () => Promise<void>;
            getItemSync: (key: string) => string | null;
            getItem: (key: string) => Promise<string | null>;
            setItemSync: (key: string, value: string) => boolean;
            setItem: (key: string, value: string) => Promise<void>;
            deleteItem: (key: string) => Promise<void>;
        };
    };
    w.__hamiE2eSecureStore = {
        flushHeavyPersistPending: () => store.flushHeavyPersistPending(),
        waitForAllPendingPersist: () => store.waitForAllPendingPersist(),
        ensurePersistedReady: () => store.ensurePersistedReady(),
        getItemSync: (key) => store.getItemSync(key),
        getItem: (key) => store.getItem(key),
        setItemSync: (key, value) => store.setItemSync(key, value),
        setItem: (key, value) => store.setItem(key, value),
        deleteItem: (key) => store.deleteItem(key),
    };
}
