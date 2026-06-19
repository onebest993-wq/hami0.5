import { useState, useEffect, useMemo } from 'react';
import type Fuse from 'fuse.js';
import { useCaseStore } from '@/app/stores/caseStore';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { GlobalSearchExtras } from '@/app/services/globalSearchLoad';
import {
    computeGlobalSearchIndexKey,
    prepareGlobalSearchIndexInput,
} from '@/app/services/globalSearchIndexPrepare';
import { getCachedGlobalSearchIndex, resolveGlobalSearchIndex } from '@/app/services/globalSearchIndexRuntime';
import { getOrCreateGlobalSearchFuse, hasCachedGlobalSearchFuse } from '@/app/services/globalSearchFuse';

export interface UseSearchIndexOptions {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases: unknown[];
    userId: string | null;
    profileLine: string;
    extras: GlobalSearchExtras | null;
    isLoadingExtras: boolean;
    indexVersion?: number;
}

export interface UseSearchIndexReturn {
    fuse: Fuse<GlobalSearchEntry> | null;
    isBuildingIndex: boolean;
    isIndexReady: boolean;
}

export function useSearchIndex(options: UseSearchIndexOptions): UseSearchIndexReturn {
    const cases = useCaseStore((s) => s.cases);
    const [fuse, setFuse] = useState<Fuse<GlobalSearchEntry> | null>(null);
    const [isBuildingIndex, setIsBuildingIndex] = useState(false);

    const preparedInput = useMemo(
        () =>
            prepareGlobalSearchIndexInput({
                files: options.files,
                executionFiles: options.executionFiles,
                globalNotes: options.globalNotes,
                cases,
                criminalCases: options.criminalCases,
                profileLine: options.profileLine,
                userId: options.userId,
                notifications: options.notifications,
                extras: options.extras ?? undefined,
                cacheGeneration: options.indexVersion,
            }),
        [
            options.files,
            options.executionFiles,
            options.globalNotes,
            options.notifications,
            cases,
            options.criminalCases,
            options.profileLine,
            options.userId,
            options.extras,
            options.indexVersion,
        ],
    );

    const indexCacheKey = useMemo(() => computeGlobalSearchIndexKey(preparedInput), [preparedInput]);

    useEffect(() => {
        let cancelled = false;
        if (options.isLoadingExtras) {
            setFuse(null);
            setIsBuildingIndex(false);
            return;
        }

        const cachedIndex = getCachedGlobalSearchIndex(indexCacheKey);
        if (cachedIndex && hasCachedGlobalSearchFuse(indexCacheKey)) {
            setIsBuildingIndex(false);
            void getOrCreateGlobalSearchFuse(indexCacheKey, cachedIndex).then((instance) => {
                if (!cancelled) setFuse(instance);
            });
            return () => {
                cancelled = true;
            };
        }

        setIsBuildingIndex(true);
        setFuse(null);

        void (async () => {
            try {
                const index = await resolveGlobalSearchIndex(preparedInput);
                if (cancelled) return;
                const instance = await getOrCreateGlobalSearchFuse(indexCacheKey, index);
                if (cancelled) return;
                setFuse(instance);
            } catch {
                if (!cancelled) setFuse(null);
            } finally {
                if (!cancelled) setIsBuildingIndex(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [preparedInput, indexCacheKey, options.isLoadingExtras]);

    const isIndexReady = !options.isLoadingExtras && !isBuildingIndex && fuse !== null;

    return { fuse, isBuildingIndex, isIndexReady };
}
