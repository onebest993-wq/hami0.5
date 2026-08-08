import { useCallback, useEffect, useRef, useState } from 'react';

import type { FileData } from '@/app/components/lawyer/LawyerShared';

import { useAutoSave } from '@/app/hooks/useAutoSave';

import { STORAGE_KEYS, PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';

import {
    loadInitialLawsuitFiles,
    loadInitialLawsuitFilesAsync,
    loadLawsuitArchivedSegmentFiles,
    loadLawsuitBootSegments,
    loadLawsuitTrashSegmentFiles,
    persistLawsuitActiveRecord,
    persistLawsuitSegments,
    reloadLawsuitFilesFromStorage,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { enrichLifecycleIndexFromSegmentFiles, rebuildActiveSegmentInIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import {
    persistLawsuitActiveSegment,
    persistLawsuitLifecycleIndex,
    syncLawsuitMonolithicMirror,
} from '@/app/domain/lawsuit/lawsuitSegmentStorage';

type UseLawsuitFilesStateOptions = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
    autosaveDebounceMs?: number;
};

/**
 * مصدر الحقيقة لملفات الدعاوى في LawyerDashboard.
 * boot: النشطة + فهرس O(1) — المخزن/المهملات تُحمَّل عند الطلب.
 */
export function useLawsuitFilesState({
    localAutoSave,
    backgroundRuntimeEnabled,
    autosaveDebounceMs = PERSIST_DEBOUNCE_MS.HEAVY,
}: UseLawsuitFilesStateOptions) {
    const [segments, setSegments] = useState<LawsuitFileSegments>(() => loadLawsuitBootSegments());
    const bootstrapSegmentsRef = useRef(segments);
    const [storageHydrated, setStorageHydrated] = useState(true);

    const files = segments.active;

    useAutoSave(
        STORAGE_KEYS.LAWYER_FILES,
        files,
        autosaveDebounceMs,
        localAutoSave,
        storageHydrated,
    );

    useEffect(() => {
        if (!backgroundRuntimeEnabled) return;

        let cancelled = false;

        void (async () => {
            const hydrated = await loadInitialLawsuitFilesAsync();
            if (cancelled) return;

            setSegments((prev) => {
                if (prev !== bootstrapSegmentsRef.current && prev.active.length > 0) return prev;
                const boot = loadLawsuitBootSegments();
                if (hydrated.length > 0 && boot.active.length === 0) {
                    return {
                        ...boot,
                        active: hydrated,
                        index: rebuildActiveSegmentInIndex(boot.index, hydrated),
                    };
                }
                return boot;
            });

            setStorageHydrated(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [backgroundRuntimeEnabled]);

    const setFiles = useCallback(
        (action: React.SetStateAction<FileData[]>) => {
            setSegments((prev) => {
                const nextActive =
                    typeof action === 'function' ? action(prev.active) : action;
                const nextIndex = rebuildActiveSegmentInIndex(prev.index, nextActive);
                persistLawsuitActiveSegment(nextActive);
                persistLawsuitLifecycleIndex(nextIndex);
                syncLawsuitMonolithicMirror(nextActive, prev.archived ?? [], prev.trash ?? []);
                return { ...prev, active: nextActive, index: nextIndex };
            });
        },
        [],
    );

    const setLawsuitSegments = useCallback(
        (action: React.SetStateAction<LawsuitFileSegments>) => {
            setSegments((prev) => (typeof action === 'function' ? action(prev) : action));
        },
        [],
    );

    const ensureLawsuitArchivedLoaded = useCallback(async () => {
        if (segments.archived !== null) return;
        const archived = loadLawsuitArchivedSegmentFiles();
        setSegments((prev) => {
            if (prev.archived !== null) return prev;
            const nextIndex = enrichLifecycleIndexFromSegmentFiles(prev.index, archived, null);
            persistLawsuitLifecycleIndex(nextIndex);
            return { ...prev, archived, index: nextIndex };
        });
    }, [segments.archived]);

    const ensureLawsuitTrashLoaded = useCallback(async () => {
        if (segments.trash !== null) return;
        const trash = loadLawsuitTrashSegmentFiles();
        setSegments((prev) => {
            if (prev.trash !== null) return prev;
            const nextIndex = enrichLifecycleIndexFromSegmentFiles(prev.index, null, trash);
            persistLawsuitLifecycleIndex(nextIndex);
            return { ...prev, trash, index: nextIndex };
        });
    }, [segments.trash]);

    const reloadLawsuitFiles = useCallback(() => {
        const merged = reloadLawsuitFilesFromStorage();
        setSegments(merged);
        persistLawsuitSegments(merged);
        return merged.active;
    }, []);

    const replaceLawsuitFiles = useCallback((next: FileData[]) => {
        setFiles(next);
        return next;
    }, [setFiles]);

    const persistActiveRecord = useCallback((record: FileData) => {
        setSegments((prev) => {
            const next = persistLawsuitActiveRecord(record, prev);
            return next;
        });
    }, []);

    return {
        files,
        setFiles,
        lawsuitSegments: segments,
        setLawsuitSegments,
        lawsuitLifecycleCounts: segments.index.counts,
        lawsuitArchivedFiles: segments.archived,
        lawsuitTrashFiles: segments.trash,
        ensureLawsuitArchivedLoaded,
        ensureLawsuitTrashLoaded,
        reloadLawsuitFiles,
        replaceLawsuitFiles,
        persistActiveRecord,
        storageHydrated,
    };
}
