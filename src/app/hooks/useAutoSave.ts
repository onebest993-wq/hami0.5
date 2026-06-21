import { useEffect, useRef, useCallback } from 'react';
import { persistenceRepository } from '../infrastructure/persistence/LocalStorageRepository';
import { debug } from '@/app/utils/debug';

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

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const saveImmediately = useCallback(() => {
        if (!enabled || !storageHydrated) return;
        if (dataRef.current === undefined || dataRef.current === null) return;
        const serialized = stableSerialize(dataRef.current);
        if (serialized === null) return;
        if (serialized === lastSavedSerializedRef.current) return;
        lastSavedSerializedRef.current = serialized;
        debug.log(`[AutoSave] ${key}`);
        persistenceRepository.save(key, dataRef.current);
    }, [key, enabled, storageHydrated]);

    useEffect(() => {
        if (!enabled) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            saveImmediately();
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [data, delay, saveImmediately, enabled]);

    const prevEnabledRef = useRef(enabled);
    useEffect(() => {
        if (prevEnabledRef.current && !enabled) {
            saveImmediately();
        }
        prevEnabledRef.current = enabled;
    }, [enabled, saveImmediately]);

    useEffect(() => {
        if (!enabled) return;
        let idleSaveId: number | null = null;

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
            if (document.visibilityState === 'hidden') scheduleSave();
        };

        const handlePageHide = () => scheduleSave();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
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
