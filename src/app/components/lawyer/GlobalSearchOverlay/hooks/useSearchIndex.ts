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
import { getCachedGlobalSearchIndex, resolveGlobalSearchIndex } from '@/app/services/globalSearchIndexRuntime';
import {
    getCachedGlobalSearchFuse,
    getOrCreateGlobalSearchFuse,
} from '@/app/services/globalSearchFuse';
import type { LawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';

function resolveSearchIndexPriority(overlayOpen: boolean): 'interactive' | 'idle' {
    if (!overlayOpen) return 'idle';
    try {
        const s = getLawyerSettingsSnapshot();
        if (isLitePerformanceActive(s.performance.litePerformance)) return 'idle';
    } catch {
        /* ignore */
    }
    return 'interactive';
}

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
    isIndexReady: boolean;
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

async function resolveFuseForKey(
    cacheKey: string,
    input: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
): Promise<Fuse<GlobalSearchEntry>> {
    const cachedFuse = getCachedGlobalSearchFuse(cacheKey);
    if (cachedFuse) return cachedFuse;

    const cachedIndex = getCachedGlobalSearchIndex(cacheKey);
    const index = cachedIndex ?? (await resolveGlobalSearchIndex(input, priority));
    return getOrCreateGlobalSearchFuse(cacheKey, index);
}

export function useSearchIndex(options: UseSearchIndexOptions): UseSearchIndexReturn {
    const cases = useCaseStore((s) => s.cases);

    const preparedFullInput = useMemo(
        () => buildPreparedInput(options, cases, options.extras ?? undefined),
        [
            options.files,
            options.executionFiles,
            options.lawsuitLifecycleIndex,
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

    const preparedCoreInput = useMemo(
        () => buildPreparedInput(options, cases, undefined),
        [
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
        ],
    );

    const fullCacheKey = useMemo(() => computeGlobalSearchIndexKey(preparedFullInput), [preparedFullInput]);
    const coreCacheKey = useMemo(() => computeGlobalSearchIndexKey(preparedCoreInput), [preparedCoreInput]);

    const [fuse, setFuse] = useState<Fuse<GlobalSearchEntry> | null>(
        () => getCachedGlobalSearchFuse(fullCacheKey) ?? getCachedGlobalSearchFuse(coreCacheKey),
    );
    const [isBuildingIndex, setIsBuildingIndex] = useState(false);
    const activeKeyRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const priority = resolveSearchIndexPriority(Boolean(options.overlayOpen));

        const applyFuse = (instance: Fuse<GlobalSearchEntry>, key: string) => {
            if (cancelled) return;
            activeKeyRef.current = key;
            setFuse(instance);
        };

        const run = async () => {
            const fullHit = getCachedGlobalSearchFuse(fullCacheKey);
            if (fullHit) {
                setIsBuildingIndex(false);
                applyFuse(fullHit, fullCacheKey);
                return;
            }

            const coreHit = getCachedGlobalSearchFuse(coreCacheKey);
            if (!options.overlayOpen) {
                if (coreHit) {
                    setIsBuildingIndex(false);
                    applyFuse(coreHit, coreCacheKey);
                }
                return;
            }

            if (coreHit && activeKeyRef.current !== fullCacheKey && !getCachedGlobalSearchFuse(fullCacheKey)) {
                applyFuse(coreHit, coreCacheKey);
            }

            const needsFullIndex = Boolean(options.extras);
            const canUseCore =
                needsFullIndex && fullCacheKey !== coreCacheKey && (options.isLoadingExtras || !options.extras);

            if (canUseCore) {
                const coreHit = getCachedGlobalSearchFuse(coreCacheKey);
                if (coreHit) {
                    applyFuse(coreHit, coreCacheKey);
                } else if (!fuse) {
                    setIsBuildingIndex(true);
                    try {
                        const coreInstance = await resolveFuseForKey(coreCacheKey, preparedCoreInput, priority);
                        applyFuse(coreInstance, coreCacheKey);
                    } catch {
                        /* يُكمَل بالفهرس الكامل */
                    }
                }
            }

            if (!needsFullIndex) {
                if (!getCachedGlobalSearchFuse(coreCacheKey) && activeKeyRef.current !== coreCacheKey) {
                    setIsBuildingIndex(true);
                    try {
                        const coreInstance = await resolveFuseForKey(coreCacheKey, preparedCoreInput, priority);
                        applyFuse(coreInstance, coreCacheKey);
                    } catch {
                        if (!cancelled && !fuse) setFuse(null);
                    } finally {
                        if (!cancelled) setIsBuildingIndex(false);
                    }
                } else {
                    setIsBuildingIndex(false);
                }
                return;
            }

            setIsBuildingIndex(true);
            try {
                const fullInstance = await resolveFuseForKey(fullCacheKey, preparedFullInput, priority);
                applyFuse(fullInstance, fullCacheKey);
            } catch {
                if (!cancelled && !fuse && activeKeyRef.current !== coreCacheKey) setFuse(null);
            } finally {
                if (!cancelled) setIsBuildingIndex(false);
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fuse kept intentionally during enrichment
    }, [
        fullCacheKey,
        coreCacheKey,
        preparedCoreInput,
        preparedFullInput,
        options.extras,
        options.isLoadingExtras,
        options.overlayOpen,
    ]);

    const isIndexReady = Boolean(fuse) && !isBuildingIndex;

    return { fuse, isBuildingIndex, isIndexReady };
}
