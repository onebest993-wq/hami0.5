import { useEffect, useRef, useCallback } from 'react';
import { persistenceRepository } from '../infrastructure/persistence/LocalStorageRepository';

/**
 * 💾 useAutoSave Hook
 * 
 * Automatically saves state to local storage on changes and app lifecycle events.
 * 
 * @param key Unique key for storage
 * @param data The data state to save
 * @param delay Debounce delay in ms (default 1000ms)
 */
export function useAutoSave<T>(key: string, data: T, delay: number = 1000) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dataRef = useRef(data);

    // Update ref when data changes
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Save function
    const saveImmediately = useCallback(() => {
        if (dataRef.current) {
            console.log(`💾 [AutoSave] Saving ${key}...`);
            persistenceRepository.save(key, dataRef.current);
        }
    }, [key]);

    // Debounced save on data change
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            saveImmediately();
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, saveImmediately]);

    // لا حفظ متزامن على beforeunload — كان يجمّد F5/إعادة التحميل مع بيانات كبيرة
    useEffect(() => {
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
    }, [saveImmediately]);
}

/**
 * 🛡️ usePreventUnsavedChanges Hook
 * 
 * Prompts the user before leaving if there are unsaved changes.
 */
export function usePreventUnsavedChanges(isDirty: boolean) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Standard for modern browsers
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
