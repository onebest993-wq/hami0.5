import { useCallback, useState } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import { STORAGE_KEYS } from '@/app/utils/constants';
import {
    loadInitialLawsuitFiles,
    persistLawsuitFiles,
    reloadLawsuitFilesFromStorage,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';

type UseLawsuitFilesStateOptions = {
    localAutoSave: boolean;
    autosaveDebounceMs?: number;
};

/**
 * مصدر الحقيقة لملفات الدعاوى في LawyerDashboard.
 * يفصل تحميل/حفظ القائمة عن بقية منطق الداشبورد.
 */
export function useLawsuitFilesState({
    localAutoSave,
    autosaveDebounceMs = 2_000,
}: UseLawsuitFilesStateOptions) {
    const [files, setFiles] = useState<FileData[]>(loadInitialLawsuitFiles);

    useAutoSave(STORAGE_KEYS.LAWYER_FILES, files, autosaveDebounceMs, localAutoSave);

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
    };
}
