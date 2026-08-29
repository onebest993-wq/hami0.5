import { useEffect, useRef, useCallback } from 'react';
import { persistenceRepository } from '../infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { debug } from '@/app/utils/debug';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';

function stableSerialize(data: unknown): string | null {
    try {
        return JSON.stringify(data);
    } catch {
        return null;
    }
}

/**
 * 💾 useAutoSave Hook
 *
 * Automatically saves state to local storage on changes and app lifecycle events.
 * Skips write when serialized payload unchanged (saves CPU + flash wear).
 */
export function useAutoSave<T>(
    key: string,
    data: T,
    delay: number = 2_000,
    enabled: boolean = true,
    storageHydrated: boolean = true,
) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dataRef = useRef(data);
    const lastSavedSerializedRef = useRef<string | null>(null);
    const enabledRef = useRef(enabled);
    const storageHydratedRef = useRef(storageHydrated);
    const suppressAfterClearRef = useRef(false);
    const externalImportPendingRef = useRef(false);

    enabledRef.current = enabled;
    storageHydratedRef.current = storageHydrated;

    useEffect(() => {
        dataRef.current = data;
        if (externalImportPendingRef.current) {
            externalImportPendingRef.current = false;
        }
    }, [data]);

    const saveImmediately = useCallback((
        forceHeavyPersistFlush: boolean = false,
        allowDisabledTransition: boolean = false,
    ) => {
        if (suppressAfterClearRef.current || externalImportPendingRef.current) return;
        if ((!enabledRef.current && !allowDisabledTransition) || !storageHydratedRef.current) return;
        if (dataRef.current === undefined || dataRef.current === null) return;
        const serialized = stableSerialize(dataRef.current);
        if (serialized === null) return;
        if (serialized === lastSavedSerializedRef.current) return;
        lastSavedSerializedRef.current = serialized;
        debug.log(`[AutoSave] ${key}`);
        persistenceRepository.save(key, dataRef.current);
        persistenceRepository.flushPending(key);
        if (forceHeavyPersistFlush && key === LAWSUIT_FILES_STORAGE_KEY) {
            SecureStoreService.flushHeavyPersistPending();
        }
    }, [key]);

    useEffect(() => {
        let cancelled = false;
        void SecureStoreService.getItem(key).then((stored) => {
            if (!cancelled && lastSavedSerializedRef.current === null && stored !== null) {
                lastSavedSerializedRef.current = stored;
            }
        });
        return () => {
            cancelled = true;
        };
    }, [key]);

    useEffect(() => {
        const handleImported = (event: Event) => {
            const keys = (event as CustomEvent<{ keys?: unknown }>).detail?.keys;
            if (Array.isArray(keys) && !keys.includes(key)) return;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            lastSavedSerializedRef.current = readSecureOrDrainLegacySync(key);
            externalImportPendingRef.current = true;
        };
        const handleCleared = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            suppressAfterClearRef.current = true;
            lastSavedSerializedRef.current = null;
        };
        window.addEventListener('hami:data-imported', handleImported);
        window.addEventListener('hami:data-cleared', handleCleared);
        return () => {
            window.removeEventListener('hami:data-imported', handleImported);
            window.removeEventListener('hami:data-cleared', handleCleared);
        };
    }, [key]);

    useEffect(() => {
        if (!enabled || !storageHydrated || suppressAfterClearRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            saveImmediately();
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [data, delay, saveImmediately, enabled, storageHydrated]);

    const prevEnabledRef = useRef(enabled);
    useEffect(() => {
        if (prevEnabledRef.current && !enabled) {
            saveImmediately(true, true);
        }
        prevEnabledRef.current = enabled;
    }, [enabled, saveImmediately]);

    useEffect(() => {
        if (!enabled) return;
        let idleSaveId: number | null = null;
        let hiddenSaveTimer: number | null = null;

        const scheduleSave = () => {
            if (idleSaveId !== null && typeof cancelIdleCallback !== 'undefined') {
                cancelIdleCallback(idleSaveId);
            }
            const run = () => {
                idleSaveId = null;
                saveImmediately();
            };
            if (typeof requestIdleCallback !== 'undefined') {
                idleSaveId = requestIdleCallback(run, { timeout: 1200 });
            } else {
                idleSaveId = window.setTimeout(run, 0) as unknown as number;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'hidden') {
                if (hiddenSaveTimer !== null) {
                    window.clearTimeout(hiddenSaveTimer);
                    hiddenSaveTimer = null;
                }
                return;
            }
            if (hiddenSaveTimer !== null) window.clearTimeout(hiddenSaveTimer);
            hiddenSaveTimer = window.setTimeout(() => {
                hiddenSaveTimer = null;
                if (document.visibilityState === 'hidden') scheduleSave();
            }, 900);
        };

        const handlePageHide = () => {
            if (hiddenSaveTimer !== null) {
                window.clearTimeout(hiddenSaveTimer);
                hiddenSaveTimer = null;
            }
            saveImmediately(true);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            if (hiddenSaveTimer !== null) {
                window.clearTimeout(hiddenSaveTimer);
            }
            if (idleSaveId !== null) {
                if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(idleSaveId);
                else window.clearTimeout(idleSaveId);
            }
        };
    }, [saveImmediately, enabled]);
}

/**
 * 🛡️ usePreventUnsavedChanges Hook
 */
export function usePreventUnsavedChanges(isDirty: boolean) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        if (isDirty) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);
}
