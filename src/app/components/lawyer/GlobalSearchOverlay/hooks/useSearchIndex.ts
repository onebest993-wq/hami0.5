import { useState, useEffect, useMemo, useRef } from 'react';
import type Fuse from 'fuse.js';
import { useCaseStore } from '@/app/stores/caseStore';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { BuildGlobalSearchIndexInput, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { GlobalSearchExtras } from '@/app/services/globalSearchLoad';
import {
    computeGlobalSearchIndexKey,
    prepareGlobalSearchIndexInput,
} from '@/app/services/globalSearchIndexPrepare';
import { getCachedGlobalSearchFuse } from '@/app/services/globalSearchFuse';
import type { LawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import {
    resolveFuseForKey,
    resolveSearchIndexPriority,
    runSearchIndexBuild,
} from '@/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildExecutor';

export interface UseSearchIndexOptions {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    lawsuitLifecycleIndex?: LawsuitLifecycleIndex;
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases: unknown[];
    userId: string | null;
    profileLine: string;
    extras: GlobalSearchExtras | null;
    isLoadingExtras: boolean;
    indexVersion?: number;
    overlayOpen?: boolean;
}

export interface UseSearchIndexReturn {
    fuse: Fuse<GlobalSearchEntry> | null;
    isBuildingIndex: boolean;
}

function buildPreparedInput(
    options: UseSearchIndexOptions,
    cases: ReturnType<typeof useCaseStore.getState>['cases'],
    extras?: GlobalSearchExtras,
): BuildGlobalSearchIndexInput {
    return prepareGlobalSearchIndexInput({
        files: options.files,
        executionFiles: options.executionFiles,
        lawsuitLifecycleIndex: options.lawsuitLifecycleIndex,
        globalNotes: options.globalNotes,
        cases,
        criminalCases: options.criminalCases,
        profileLine: options.profileLine,
        userId: options.userId,
        notifications: options.notifications,
        extras,
        cacheGeneration: options.indexVersion,
    });
}

export function useSearchIndex(options: UseSearchIndexOptions): UseSearchIndexReturn {
    const cases = useCaseStore((s) => s.cases);
    const extrasReady = Boolean(options.extras);
    const overlayOpen = Boolean(options.overlayOpen);

    const preparedInput = useMemo(() => {
        /* keepAlive مغلق: لا تُعِد تجهيز الفهرس مع كل تغيّر ملفات اللوحة */
        if (!overlayOpen) return null;
        return buildPreparedInput(
            options,
            cases,
            extrasReady ? (options.extras ?? undefined) : undefined,
        );
    }, [
        overlayOpen,
        options.files,
        options.executionFiles,
        options.lawsuitLifecycleIndex,
        options.globalNotes,
        options.notifications,
        cases,
        options.criminalCases,
        options.profileLine,
        options.userId,
        options.indexVersion,
        options.extras,
        extrasReady,
    ]);

    const cacheKey = useMemo(
        () => (preparedInput ? computeGlobalSearchIndexKey(preparedInput) : ''),
        [preparedInput],
    );

    const [fuse, setFuse] = useState<Fuse<GlobalSearchEntry> | null>(
        () => getCachedGlobalSearchFuse(cacheKey),
    );
    const [isBuildingIndex, setIsBuildingIndex] = useState(false);
    const activeKeyRef = useRef<string | null>(null);
    const fuseRef = useRef(fuse);
    fuseRef.current = fuse;

    useEffect(() => {
        if (!overlayOpen || !preparedInput) {
            setIsBuildingIndex(false);
            return;
        }

        let cancelled = false;
        const priority = resolveSearchIndexPriority(true);

        void runSearchIndexBuild(
            {
                overlayOpen: true,
                cacheKey,
                extrasReady,
                isLoadingExtras: options.isLoadingExtras,
                activeKey: activeKeyRef.current,
                hasFuseInState: Boolean(fuseRef.current),
            },
            preparedInput,
            priority,
            {
                applyFuse: (instance, key) => {
                    if (cancelled) return;
                    activeKeyRef.current = key;
                    setFuse(instance);
                },
                clearFuse: () => {
                    if (cancelled) return;
                    setFuse(null);
                },
                setBuilding: (building) => {
                    if (!cancelled) setIsBuildingIndex(building);
                },
                isCancelled: () => cancelled,
                resolveFuse: resolveFuseForKey,
            },
        );

        return () => {
            cancelled = true;
        };
    }, [cacheKey, preparedInput, extrasReady, options.isLoadingExtras, overlayOpen]);

    return { fuse, isBuildingIndex };
}
