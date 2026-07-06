import { useCallback, useEffect, useRef, useState } from 'react';

import type { FileData } from '@/app/components/lawyer/LawyerShared';

import { useAutoSave } from '@/app/hooks/useAutoSave';

import { STORAGE_KEYS, PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';

import {
    loadInitialLawsuitFiles,
    loadInitialLawsuitFilesAsync,
    persistLawsuitFiles,
    reloadLawsuitFilesFromStorage,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';



type UseLawsuitFilesStateOptions = {

    localAutoSave: boolean;

    backgroundRuntimeEnabled: boolean;

    autosaveDebounceMs?: number;

};



/**

 * مصدر الحقيقة لملفات الدعاوى في LawyerDashboard.

 * يفصل تحميل/حفظ القائمة عن بقية منطق الداشبورد.

 */

export function useLawsuitFilesState({

    localAutoSave,

    backgroundRuntimeEnabled,

    autosaveDebounceMs = PERSIST_DEBOUNCE_MS.HEAVY,

}: UseLawsuitFilesStateOptions) {

    const [files, setFiles] = useState<FileData[]>(() => loadInitialLawsuitFiles());

    const bootstrapFilesRef = useRef(files);

    const [storageHydrated, setStorageHydrated] = useState(true);



    useAutoSave(STORAGE_KEYS.LAWYER_FILES, files, autosaveDebounceMs, localAutoSave, storageHydrated);



    useEffect(() => {
        if (!backgroundRuntimeEnabled) return;

        let cancelled = false;

        void (async () => {

            const hydrated = await loadInitialLawsuitFilesAsync();

            if (cancelled) return;

            setFiles((prev) =>
                prev === bootstrapFilesRef.current || prev.length === 0 ? hydrated : prev,
            );

            setStorageHydrated(true);

        })();

        return () => {

            cancelled = true;

        };

    }, [backgroundRuntimeEnabled]);



    const reloadLawsuitFiles = useCallback(() => {

        const merged = reloadLawsuitFilesFromStorage();

        setFiles(merged);

        persistLawsuitFiles(merged);

        return merged;

    }, []);



    const replaceLawsuitFiles = useCallback((next: FileData[]) => {

        setFiles(next);

        persistLawsuitFiles(next);

        return next;

    }, []);



    return {

        files,

        setFiles,

        reloadLawsuitFiles,

        replaceLawsuitFiles,

        storageHydrated,

    };

}

